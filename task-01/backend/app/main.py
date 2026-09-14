from fastapi import FastAPI

from app import models
from app.database import Base, engine
from app.routers import products


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Techloom POS API",
    description="Backend API for the POS Order & Inventory System",
    version="1.0.0"
)


app.include_router(products.router)


@app.get("/")
def root():
    return {
        "message": "Techloom POS API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }