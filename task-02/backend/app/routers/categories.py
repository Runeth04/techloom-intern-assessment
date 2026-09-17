from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category
from app.schemas import (
    CategoryCreate,
    CategoryResponse,
)


router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)


@router.get(
    "",
    response_model=list[CategoryResponse]
)
def get_categories(
    db: Session = Depends(get_db)
):
    categories = db.scalars(
        select(Category)
        .order_by(Category.name)
    ).all()

    return categories


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED
)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db)
):
    existing = db.scalar(
        select(Category).where(
            Category.name.ilike(
                category_data.name
            )
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists"
        )

    category = Category(
        name=category_data.name.strip(),
        description=category_data.description
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category