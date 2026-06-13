from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Photo Management Platform"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://photouser:photopass@db:5432/photodb"
    REDIS_URL: str = "redis://redis:6379/0"

    # Storage
    LOCAL_STORAGE_PATH: str = "/data/photos"
    UPLOAD_MAX_SIZE_MB: int = 50

    # Google Photos OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/photos/google/callback"

    # AI / Embeddings
    CLIP_MODEL_NAME: str = "openai/clip-vit-base-patch32"
    FACE_DETECTION_THRESHOLD: float = 0.6
    DUPLICATE_HASH_THRESHOLD: int = 10  # perceptual hash distance

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"

    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://localhost:8080"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
