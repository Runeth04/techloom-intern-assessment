from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import SessionLocal
from app.models import (
    Order,
    OrderStatus,
    OrderStatusHistory,
    Product,
)


def expire_reservations_once():
    now = datetime.utcnow()

    with SessionLocal() as db:
        expired_order_ids = db.scalars(
            select(Order.id)
            .where(
                Order.status == OrderStatus.RESERVED,
                Order.reservation_expires_at.is_not(None),
                Order.reservation_expires_at <= now,
            )
            .order_by(Order.id)
        ).all()

        for order_id in expired_order_ids:
            try:
                # Lock the order so expiry cannot race
                # with payment processing.
                order = db.scalar(
                    select(Order)
                    .options(
                        selectinload(Order.items)
                    )
                    .where(Order.id == order_id)
                    .with_for_update()
                )

                if order is None:
                    db.rollback()
                    continue

                # Re-check after acquiring the lock.
                if (
                    order.status
                    != OrderStatus.RESERVED
                    or order.reservation_expires_at
                    is None
                    or order.reservation_expires_at
                    > datetime.utcnow()
                ):
                    db.rollback()
                    continue

                quantities_to_restore = {}

                for item in order.items:
                    quantities_to_restore[
                        item.product_id
                    ] = (
                        quantities_to_restore.get(
                            item.product_id,
                            0,
                        )
                        + item.quantity
                    )

                product_ids = sorted(
                    quantities_to_restore.keys()
                )

                products = db.scalars(
                    select(Product)
                    .where(
                        Product.id.in_(
                            product_ids
                        )
                    )
                    .order_by(Product.id)
                    .with_for_update()
                ).all()

                product_map = {
                    product.id: product
                    for product in products
                }

                for (
                    product_id,
                    quantity,
                ) in quantities_to_restore.items():
                    product = product_map.get(
                        product_id
                    )

                    if product is not None:
                        product.stock_quantity += (
                            quantity
                        )

                old_status = order.status

                order.status = (
                    OrderStatus.EXPIRED
                )

                order.reservation_expires_at = None

                history = OrderStatusHistory(
                    order_id=order.id,
                    from_status=old_status,
                    to_status=OrderStatus.EXPIRED,
                    reason=(
                        "Checkout reservation "
                        "expired after 5 minutes"
                    ),
                )

                db.add(history)
                db.commit()

                print(
                    f"Reservation expired for "
                    f"order {order.id}. "
                    f"Stock restored."
                )

            except Exception:
                db.rollback()
                raise