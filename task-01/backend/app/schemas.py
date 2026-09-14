from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

class PaymentCreate(BaseModel):
    outcome: Literal["SUCCESS", "FAILED", "TIMEOUT"]
    idempotency_key: str = Field(
        min_length=1,
        max_length=100
    )


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    idempotency_key: str
    outcome: str
    amount: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    price: float = Field(gt=0)
    stock_quantity: int = Field(ge=0)


class ProductUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    price: float = Field(gt=0)
    stock_quantity: int = Field(ge=0)


class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    stock_quantity: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    idempotency_key: str = Field(
        min_length=1,
        max_length=100
    )
    items: list[OrderItemCreate]


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    idempotency_key: str | None
    status: str
    total_amount: float
    reservation_expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)