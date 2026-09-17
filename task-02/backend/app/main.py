from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import Base, engine
from app import models
from app.routers import categories, products


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Techloom E-Commerce API",
    description="Backend API for the E-Commerce Checkout & Payment System",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(categories.router)
app.include_router(products.router)

@app.get("/")
def root():
    return {
        "message": "Techloom E-Commerce API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }