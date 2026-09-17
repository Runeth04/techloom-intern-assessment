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