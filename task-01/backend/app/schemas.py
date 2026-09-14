from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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