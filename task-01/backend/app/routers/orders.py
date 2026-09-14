from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Order, OrderItem, OrderStatus, Product
from app.schemas import OrderCreate, OrderResponse


router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED
)
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db)
):
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item"
        )

    order = Order(
        status=OrderStatus.PENDING,
        total_amount=0
    )

    db.add(order)
    db.flush()

    total_amount = 0

    for item_data in order_data.items:
        product = db.get(Product, item_data.product_id)

        if product is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item_data.product_id} not found"
            )

        if product.stock_quantity < item_data.quantity:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {product.name}"
            )

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item_data.quantity,
            unit_price=product.price
        )

        db.add(order_item)

        total_amount += float(product.price) * item_data.quantity

    order.total_amount = total_amount

    db.commit()

    created_order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )

    return created_order


@router.get(
    "",
    response_model=list[OrderResponse]
)
def get_orders(
    db: Session = Depends(get_db)
):
    orders = db.scalars(
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.id)
    ).all()

    return orders

@router.post(
    "/{order_id}/checkout",
    response_model=OrderResponse
)
def checkout_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
        .with_for_update()
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be checked out from status {order.status.value}"
        )

    if not order.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order contains no items"
        )

    # Combine quantities in case the same product
    # appears more than once in an order.
    required_quantities = {}

    for item in order.items:
        required_quantities[item.product_id] = (
            required_quantities.get(item.product_id, 0)
            + item.quantity
        )

    product_ids = sorted(required_quantities.keys())

    # Lock the product rows until this transaction completes.
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

    # Validate every item before changing any stock.
    for product_id, required_quantity in required_quantities.items():
        product = product_map.get(product_id)

        if product is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )

        if product.stock_quantity < required_quantity:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient stock for {product.name}"
            )

    # Reserve the stock.
    for product_id, required_quantity in required_quantities.items():
        product_map[product_id].stock_quantity -= required_quantity

    order.status = OrderStatus.RESERVED
    order.reservation_expires_at = (
        datetime.utcnow() + timedelta(minutes=5)
    )

    db.commit()

    reserved_order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )

    return reserved_order

@router.post(
    "/{order_id}/cancel",
    response_model=OrderResponse
)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
        .with_for_update()
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already cancelled"
        )

    if order.status in {
        OrderStatus.FAILED,
        OrderStatus.EXPIRED
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Order cannot be cancelled from "
                f"status {order.status.value}"
            )
        )

    # Stock was already deducted for RESERVED and PAID orders.
    if order.status in {
        OrderStatus.RESERVED,
        OrderStatus.PAID
    }:
        quantities_to_restore = {}

        for item in order.items:
            quantities_to_restore[item.product_id] = (
                quantities_to_restore.get(
                    item.product_id,
                    0
                )
                + item.quantity
            )

        product_ids = sorted(
            quantities_to_restore.keys()
        )

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

        for product_id, quantity in (
            quantities_to_restore.items()
        ):
            product = product_map.get(product_id)

            if product is not None:
                product.stock_quantity += quantity

    order.status = OrderStatus.CANCELLED
    order.reservation_expires_at = None

    db.commit()

    cancelled_order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )

    return cancelled_order

@router.get(
    "/{order_id}",
    response_model=OrderResponse
)
def get_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return order