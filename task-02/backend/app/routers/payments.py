from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import (
    Session,
    selectinload,
)

from app.database import get_db
from app.models import (
    Order,
    OrderStatus,
    OrderStatusHistory,
    Payment,
    PaymentOutcome,
    Product,
)
from app.schemas import (
    PaymentCreate,
    PaymentResponse,
)


router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


def restore_order_stock(
    db: Session,
    order: Order,
):
    quantities = {}

    for item in order.items:
        quantities[item.product_id] = (
            quantities.get(
                item.product_id,
                0,
            )
            + item.quantity
        )

    product_ids = sorted(
        quantities.keys()
    )

    products = db.scalars(
        select(Product)
        .where(
            Product.id.in_(product_ids)
        )
        .order_by(Product.id)
        .with_for_update()
    ).all()

    product_map = {
        product.id: product
        for product in products
    }

    for product_id, quantity in (
        quantities.items()
    ):
        product = product_map.get(
            product_id
        )

        if product is not None:
            product.stock_quantity += (
                quantity
            )


@router.post(
    "/orders/{order_id}",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def process_payment(
    order_id: int,
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
):
    # Reject an already-used payment key.
    existing_payment = db.scalar(
        select(Payment).where(
            Payment.idempotency_key
            == payment_data.idempotency_key
        )
    )

    if existing_payment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate payment submission",
        )

    try:
        outcome = PaymentOutcome(
            payment_data.outcome.upper()
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Outcome must be SUCCESS, "
                "FAILED, or TIMEOUT"
            ),
        )

    # Lock the order so payment cannot race
    # with the reservation expiry worker.
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

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    if order.status != OrderStatus.RESERVED:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Only RESERVED orders "
                "can be paid"
            ),
        )

    # If payment arrives after the
    # reservation deadline, expire it.
    if (
        order.reservation_expires_at
        is not None
        and order.reservation_expires_at
        <= datetime.utcnow()
    ):
        restore_order_stock(
            db,
            order,
        )

        previous_status = order.status

        order.status = OrderStatus.EXPIRED
        order.reservation_expires_at = None

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                from_status=previous_status,
                to_status=OrderStatus.EXPIRED,
                reason=(
                    "Payment attempted after "
                    "reservation expired"
                ),
            )
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Checkout reservation expired",
        )

    payment = Payment(
        order_id=order.id,
        idempotency_key=(
            payment_data.idempotency_key
        ),
        outcome=outcome,
        amount=order.total_amount,
    )

    db.add(payment)

    # Database unique constraint gives a
    # second layer of duplicate protection.
    try:
        db.flush()
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate payment submission",
        )

    previous_status = order.status

    if outcome == PaymentOutcome.SUCCESS:
        order.status = OrderStatus.PAID

        reason = "Mock payment succeeded"

    elif outcome == PaymentOutcome.FAILED:
        restore_order_stock(
            db,
            order,
        )

        order.status = OrderStatus.FAILED

        reason = (
            "Mock payment failed; "
            "reserved stock restored"
        )

    else:
        restore_order_stock(
            db,
            order,
        )

        order.status = OrderStatus.EXPIRED

        reason = (
            "Mock payment timed out; "
            "reserved stock restored"
        )

    order.reservation_expires_at = None

    db.add(
        OrderStatusHistory(
            order_id=order.id,
            from_status=previous_status,
            to_status=order.status,
            reason=reason,
        )
    )

    db.commit()
    db.refresh(payment)

    return payment