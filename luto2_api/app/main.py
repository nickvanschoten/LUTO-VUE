import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers import router as api_router

app = FastAPI(
    title="LUTO2 Spatial Explorer API",
    description="High-performance backend serving continent-scale scenario data",
    version="1.0.0"
)

# CORS setup for local React dev execution
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    data_root = os.getenv("LUTO2_DATA_ROOT", "Not Configured")
    return {"status": "ok", "data_root_configured": data_root != "Not Configured"}
