from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


# -------------------------
# Category Schemas
# -------------------------

class CategoryCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100
    )

    description: str | None = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# -------------------------
# Product Schemas
# -------------------------

class ProductCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=150
    )

    description: str = ""

    price: Decimal = Field(
        gt=0
    )

    stock_quantity: int = Field(
        ge=0
    )

    image_url: str | None = None

    category_id: int


class ProductUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150
    )

    description: str | None = None

    price: Decimal | None = Field(
        default=None,
        gt=0
    )

    stock_quantity: int | None = Field(
        default=None,
        ge=0
    )

    image_url: str | None = None

    category_id: int | None = None

    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    price: Decimal
    stock_quantity: int
    image_url: str | None
    is_active: bool
    category_id: int
    category: CategoryResponse
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

# -------------------------
# Checkout / Order Schemas
# -------------------------

class CheckoutItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class CheckoutCreate(BaseModel):
    checkout_session_key: str = Field(
        min_length=1,
        max_length=100,
    )

    customer_name: str = Field(
        min_length=1,
        max_length=150,
    )

    customer_email: str = Field(
        min_length=3,
        max_length=200,
    )

    items: list[CheckoutItemCreate]


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal

    model_config = ConfigDict(
        from_attributes=True
    )


class OrderStatusHistoryResponse(BaseModel):
    id: int
    from_status: str | None
    to_status: str
    reason: str | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class OrderResponse(BaseModel):
    id: int
    checkout_session_key: str
    customer_name: str
    customer_email: str
    status: str
    total_amount: Decimal
    reservation_expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]
    status_history: list[OrderStatusHistoryResponse]

    model_config = ConfigDict(
        from_attributes=True
    )

# -------------------------
# Payment Schemas
# -------------------------

class PaymentCreate(BaseModel):
    outcome: str
    idempotency_key: str = Field(
        min_length=1,
        max_length=100,
    )


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    idempotency_key: str
    outcome: str
    amount: Decimal
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )