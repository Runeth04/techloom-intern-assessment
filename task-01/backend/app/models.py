from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OrderStatus(str, PyEnum):
    PENDING = "PENDING"
    RESERVED = "RESERVED"
    PAID = "PAID"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class PaymentOutcome(str, PyEnum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    stock_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    idempotency_key: Mapped[str | None] = mapped_column(
    String(100),
    unique=True,
    nullable=True,
    index=True
    )

    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus),
        default=OrderStatus.PENDING,
        nullable=False
    )

    total_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
    )

    reservation_expires_at: Mapped[datetime | None] = mapped_column(
    DateTime,
    nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id"),
        nullable=False
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    unit_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    order: Mapped["Order"] = relationship(
        back_populates="items"
    )

class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id"),
        nullable=False
    )

    idempotency_key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    outcome: Mapped[PaymentOutcome] = mapped_column(
        Enum(PaymentOutcome),
        nullable=False
    )

    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )