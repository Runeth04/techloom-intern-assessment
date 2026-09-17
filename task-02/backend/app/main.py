import asyncio
import os

from fastapi.middleware.cors import CORSMiddleware
from contextlib import (
    asynccontextmanager,
    suppress,
)

from fastapi import FastAPI
from app.services.reservations import (
    expire_reservations_once,
)

from app.database import Base, engine
from app import models
from app.routers import (
    categories,
    orders,
    payments,
    products,
)

async def reservation_expiry_loop():
    while True:
        try:
            await asyncio.to_thread(
                expire_reservations_once
            )
        except Exception as error:
            print(
                "Reservation expiry error:",
                error,
            )

        await asyncio.sleep(10)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    expiry_task = asyncio.create_task(
        reservation_expiry_loop()
    )

    try:
        yield
    finally:
        expiry_task.cancel()

        with suppress(
            asyncio.CancelledError
        ):
            await expiry_task


app = FastAPI(
    title="Techloom E-Commerce API",
    description="Backend API for the E-Commerce Checkout & Payment System",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(payments.router)

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