from decimal import Decimal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy import or_, select
from sqlalchemy.orm import (
    Session,
    joinedload,
)

from app.database import get_db
from app.models import Category, Product
from app.schemas import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)


router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


@router.get(
    "",
    response_model=list[ProductResponse]
)
def get_products(
    search: str | None = Query(
        default=None
    ),
    category_id: int | None = Query(
        default=None
    ),
    min_price: Decimal | None = Query(
        default=None,
        ge=0
    ),
    max_price: Decimal | None = Query(
        default=None,
        ge=0
    ),
    in_stock: bool | None = Query(
        default=None
    ),
    db: Session = Depends(get_db),
):
    query = (
        select(Product)
        .options(
            joinedload(Product.category)
        )
        .where(Product.is_active.is_(True))
    )

    if search:
        search_term = f"%{search.strip()}%"

        query = query.where(
            or_(
                Product.name.ilike(
                    search_term
                ),
                Product.description.ilike(
                    search_term
                ),
            )
        )

    if category_id is not None:
        query = query.where(
            Product.category_id
            == category_id
        )

    if min_price is not None:
        query = query.where(
            Product.price >= min_price
        )

    if max_price is not None:
        query = query.where(
            Product.price <= max_price
        )

    if in_stock is True:
        query = query.where(
            Product.stock_quantity > 0
        )

    if in_stock is False:
        query = query.where(
            Product.stock_quantity == 0
        )

    products = db.scalars(
        query.order_by(Product.id)
    ).all()

    return products


@router.get(
    "/{product_id}",
    response_model=ProductResponse
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = db.scalar(
        select(Product)
        .options(
            joinedload(Product.category)
        )
        .where(
            Product.id == product_id,
            Product.is_active.is_(True),
        )
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    return product


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED
)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
):
    category = db.get(
        Category,
        product_data.category_id
    )

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    product = Product(
        name=product_data.name.strip(),
        description=product_data.description,
        price=product_data.price,
        stock_quantity=(
            product_data.stock_quantity
        ),
        image_url=product_data.image_url,
        category_id=product_data.category_id,
    )

    db.add(product)
    db.commit()

    created_product = db.scalar(
        select(Product)
        .options(
            joinedload(Product.category)
        )
        .where(Product.id == product.id)
    )

    return created_product


@router.put(
    "/{product_id}",
    response_model=ProductResponse
)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = db.get(
        Product,
        product_id
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    update_data = product_data.model_dump(
        exclude_unset=True
    )

    if "category_id" in update_data:
        category = db.get(
            Category,
            update_data["category_id"]
        )

        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

    for field, value in update_data.items():
        setattr(
            product,
            field,
            value
        )

    db.commit()

    updated_product = db.scalar(
        select(Product)
        .options(
            joinedload(Product.category)
        )
        .where(Product.id == product_id)
    )

    return updated_product


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = db.get(
        Product,
        product_id
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Soft delete so existing order history
    # can still reference the product.
    product.is_active = False

    db.commit()

    return None