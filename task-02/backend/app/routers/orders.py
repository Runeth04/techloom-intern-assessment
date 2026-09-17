from datetime import datetime, timedelta
from decimal import Decimal

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
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    Product,
)
from app.schemas import (
    CheckoutCreate,
    OrderResponse,
)


router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


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
        )
        .where(Order.id == order.id)
    )

    return created_order


@router.get(
    "",
    response_model=list[OrderResponse],
)
def get_orders(
    db: Session = Depends(get_db),
):
    orders = db.scalars(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
        )
        .order_by(Order.id.desc())
    ).all()

    return orders


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
        )
        .where(Order.id == order_id)
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order