from fastapi import FastAPI

app = FastAPI(
    title="Techloom POS API",
    description="Backend API for the POS Order & Inventory System",
    version="1.0.0"
)


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