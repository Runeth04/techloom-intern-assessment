import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models
from app.database import Base, engine
from app.routers import orders, products
from app.services.reservations import expire_reservations_once


Base.metadata.create_all(bind=engine)


async def reservation_expiry_worker():
    while True:
        try:
            await asyncio.to_thread(expire_reservations_once)
        except Exception as exc:
            print(f"Reservation expiry worker error: {exc}")

        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    expiry_task = asyncio.create_task(
        reservation_expiry_worker()
    )

    try:
        yield
    finally:
        expiry_task.cancel()

        try:
            await expiry_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Techloom POS API",
    description="Backend API for the POS Order & Inventory System",
    version="1.0.0",
    lifespan=lifespan
)


app.include_router(products.router)
app.include_router(orders.router)


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