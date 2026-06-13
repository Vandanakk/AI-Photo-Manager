from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import photos, search, faces, duplicates, categories, health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Photo Management Platform...")
    await init_db()
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="AI Photo Management Platform",
    description="Intelligent photo management with duplicate detection, categorization, and facial recognition",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(photos.router, prefix="/api/v1/photos", tags=["photos"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
app.include_router(faces.router, prefix="/api/v1/faces", tags=["faces"])
app.include_router(duplicates.router, prefix="/api/v1/duplicates", tags=["duplicates"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])


@app.get("/")
async def root():
    return {"message": "AI Photo Management Platform", "version": "1.0.0", "docs": "/docs"}
