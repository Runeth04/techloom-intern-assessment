from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import (
    Order,
    OrderStatus,
    Payment,
    PaymentOutcome,
    Product,
)
from app.schemas import PaymentCreate, PaymentResponse


router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


def restore_order_stock(
    db: Session,
    order: Order
):
    quantities_to_restore = {}

    for item in order.items:
        quantities_to_restore[item.product_id] = (
            quantities_to_restore.get(item.product_id, 0)
            + item.quantity
        )

    product_ids = sorted(quantities_to_restore.keys())

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

    for product_id, quantity in quantities_to_restore.items():
        product = product_map.get(product_id)

        if product is not None:
            product.stock_quantity += quantity


@router.post(
    "/orders/{order_id}",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED
)
def process_payment(
    order_id: int,
    payment_data: PaymentCreate,
    db: Session = Depends(get_db)
):
    existing_payment = db.scalar(
        select(Payment).where(
            Payment.idempotency_key
            == payment_data.idempotency_key
        )
    )

    if existing_payment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate payment submission"
        )

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

    if order.status != OrderStatus.RESERVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Payment can only be processed "
                "for a RESERVED order"
            )
        )

    # Prevent a payment from succeeding after
    # its reservation has already expired.
    if (
        order.reservation_expires_at is not None
        and order.reservation_expires_at <= datetime.utcnow()
    ):
        restore_order_stock(db, order)

        order.status = OrderStatus.EXPIRED

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reservation has expired"
        )

    outcome = PaymentOutcome(payment_data.outcome)

    payment = Payment(
        order_id=order.id,
        idempotency_key=payment_data.idempotency_key,
        outcome=outcome,
        amount=order.total_amount
    )

    db.add(payment)

    if outcome == PaymentOutcome.SUCCESS:
        order.status = OrderStatus.PAID

    elif outcome == PaymentOutcome.FAILED:
        restore_order_stock(db, order)
        order.status = OrderStatus.FAILED

    elif outcome == PaymentOutcome.TIMEOUT:
        restore_order_stock(db, order)
        order.status = OrderStatus.EXPIRED

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate payment submission"
        )

    db.refresh(payment)

    return payment