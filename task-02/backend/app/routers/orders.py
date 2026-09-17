from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
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
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    Product,
    Refund,
    RefundStatus,
)
from app.schemas import (
    CheckoutCreate,
    OrderResponse,
)

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


def restore_order_stock(
    db: Session,
    order: Order,
):
    quantities = {}

    for item in order.items:
        quantities[item.product_id] = (
            quantities.get(item.product_id, 0)
            + item.quantity
        )

    product_ids = sorted(quantities.keys())

    products = db.scalars(
        select(Product)
        .where(Product.id.in_(product_ids))
        .order_by(Product.id)
        .with_for_update()
    ).all()

    product_map = {
        product.id: product
        for product in products
    }

    for product_id, quantity in quantities.items():
        product = product_map.get(product_id)

        if product is not None:
            product.stock_quantity += quantity


@router.post(
    "/checkout",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def checkout(
    checkout_data: CheckoutCreate,
    db: Session = Depends(get_db),
):
    if not checkout_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart must contain at least one item",
        )

    # Prevent duplicate checkout sessions.
    existing_order = db.scalar(
        select(Order).where(
            Order.checkout_session_key
            == checkout_data.checkout_session_key
        )
    )

    if existing_order is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Checkout session already submitted",
        )

    # Combine quantities if the same product
    # appears more than once in the cart.
    required_quantities = {}

    for item in checkout_data.items:
        required_quantities[item.product_id] = (
            required_quantities.get(
                item.product_id,
                0,
            )
            + item.quantity
        )

    product_ids = sorted(
        required_quantities.keys()
    )

    # Lock product rows so simultaneous checkouts
    # cannot oversell the same stock.
    products = db.scalars(
        select(Product)
        .where(
            Product.id.in_(product_ids),
            Product.is_active.is_(True),
        )
        .order_by(Product.id)
        .with_for_update()
    ).all()

    product_map = {
        product.id: product
        for product in products
    }

    # Validate all products before changing stock.
    for product_id, quantity in (
        required_quantities.items()
    ):
        product = product_map.get(product_id)

        if product is None:
            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Product {product_id} not found"
                ),
            )

        if product.stock_quantity < quantity:
            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Insufficient stock for "
                    f"{product.name}"
                ),
            )

    order = Order(
        checkout_session_key=(
            checkout_data.checkout_session_key
        ),
        customer_name=(
            checkout_data.customer_name.strip()
        ),
        customer_email=(
            checkout_data.customer_email.strip()
        ),
        status=OrderStatus.RESERVED,
        total_amount=Decimal("0.00"),
        reservation_expires_at=(
            datetime.utcnow()
            + timedelta(minutes=5)
        ),
    )

    db.add(order)

    try:
        db.flush()
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Checkout session already submitted",
        )

    total_amount = Decimal("0.00")

    # Reserve stock and create order items.
    for product_id, quantity in (
        required_quantities.items()
    ):
        product = product_map[product_id]

        product.stock_quantity -= quantity

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=quantity,
            unit_price=product.price,
        )

        db.add(order_item)

        total_amount += (
            product.price * quantity
        )

    order.total_amount = total_amount

    history = OrderStatusHistory(
        order_id=order.id,
        from_status=None,
        to_status=OrderStatus.RESERVED,
        reason="Stock reserved at checkout",
    )

    db.add(history)

    db.commit()

    created_order = db.scalar(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.refunds),
        )
        .where(Order.id == order.id)
    )

    return created_order


@router.get(
    "",
    response_model=list[OrderResponse],
)
def get_orders(
    customer_email: str | None = Query(
        default=None
    ),
    db: Session = Depends(get_db),
):
    query = (
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.refunds),
        )
    )

    if customer_email:
        query = query.where(
            Order.customer_email
            == customer_email.strip()
        )

    orders = db.scalars(
        query.order_by(Order.id.desc())
    ).all()

    return orders

@router.post(
    "/{order_id}/cancel",
    response_model=OrderResponse,
)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.refunds),
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

    if order.status not in (
        OrderStatus.RESERVED,
        OrderStatus.PAID,
    ):
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Only RESERVED or PAID "
                "orders can be cancelled"
            ),
        )

    previous_status = order.status

    restore_order_stock(
        db,
        order,
    )

    order.reservation_expires_at = None

    if previous_status == OrderStatus.RESERVED:
        order.status = OrderStatus.CANCELLED

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                from_status=previous_status,
                to_status=OrderStatus.CANCELLED,
                reason=(
                    "Order cancelled before payment; "
                    "reserved stock restored"
                ),
            )
        )

    elif previous_status == OrderStatus.PAID:
        order.status = OrderStatus.CANCELLED

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                from_status=OrderStatus.PAID,
                to_status=OrderStatus.CANCELLED,
                reason=(
                    "Paid order cancelled; "
                    "stock restored"
                ),
            )
        )

        refund = Refund(
            order_id=order.id,
            amount=order.total_amount,
            status=RefundStatus.COMPLETED,
            reason=(
                "Mock refund for cancelled "
                "paid order"
            ),
        )

        db.add(refund)

        order.status = OrderStatus.REFUNDED

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                from_status=OrderStatus.CANCELLED,
                to_status=OrderStatus.REFUNDED,
                reason="Mock refund completed",
            )
        )

    db.commit()

    updated_order = db.scalar(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.refunds),
        )
        .where(Order.id == order_id)
    )

    return updated_order

@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.refunds),
        )
        .where(Order.id == order_id)
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order