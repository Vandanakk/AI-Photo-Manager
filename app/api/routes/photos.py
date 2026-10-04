from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import uuid

from app.core.database import get_db
from app.services.photo_service import (
    save_uploaded_file, create_initial_photo, process_photo, scan_local_directory,
    get_photo_by_id, list_photos
)
from app.core.tasks import process_photo_task
from app.services.google_photos_service import (
    get_auth_url, exchange_code_for_tokens, sync_all_google_photos, download_google_photo
)
from app.models.models import PhotoSource, PhotoCategory
from app.core.config import settings

router = APIRouter()


@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a single photo and queue it for AI processing."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    content = await file.read()
    if len(content) > settings.UPLOAD_MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File too large. Max {settings.UPLOAD_MAX_SIZE_MB}MB")

    file_path = await save_uploaded_file(content, file.filename)
    photo = await create_initial_photo(db, file_path, file.filename)
    process_photo_task.delay(file_path, file.filename, PhotoSource.LOCAL.value)

    return {
        "photo_id": str(photo.id),
        "filename": photo.filename,
        "category": photo.category,
        "is_duplicate": photo.is_duplicate,
        "duplicate_of": str(photo.duplicate_of_id) if photo.duplicate_of_id else None,
        "is_processed": photo.is_processed,
    }


@router.post("/upload/batch")
async def upload_batch(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload multiple photos at once and queue them for AI processing."""
    results = []
    for file in files:
        if not file.content_type.startswith("image/"):
            continue
        content = await file.read()
        file_path = await save_uploaded_file(content, file.filename)
        photo = await create_initial_photo(db, file_path, file.filename)
        process_photo_task.delay(file_path, file.filename, PhotoSource.LOCAL.value)
        results.append({
            "photo_id": str(photo.id),
            "filename": photo.filename,
            "category": photo.category,
            "is_duplicate": photo.is_duplicate,
            "is_processed": photo.is_processed,
        })
    return {"uploaded": len(results), "results": results}


@router.post("/scan")
async def scan_directory(
    directory: str = Query(..., description="Absolute path to scan"),
    recursive: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """Scan a local directory and process all images."""
    try:
        result = await scan_local_directory(db, directory, recursive)
        return result
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.get("/")
async def list_all_photos(
    category: Optional[str] = Query(None, enum=[c.value for c in PhotoCategory]),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    include_duplicates: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """List photos with optional category filter."""
    photos = await list_photos(db, category, skip, limit, include_duplicates)
    return {
        "total": len(photos),
        "skip": skip,
        "limit": limit,
        "photos": [
            {
                "id": str(p.id),
                "filename": p.filename,
                "category": p.category,
                "taken_at": p.taken_at.isoformat() if p.taken_at else None,
                "width": p.width,
                "height": p.height,
                "is_duplicate": p.is_duplicate,
                "tags": p.tags,
            }
            for p in photos
        ],
    }


@router.get("/{photo_id}")
async def get_photo(photo_id: str, db: AsyncSession = Depends(get_db)):
    """Get details of a single photo."""
    photo = await get_photo_by_id(db, photo_id)
    if not photo:
        raise HTTPException(404, "Photo not found")
    return {
        "id": str(photo.id),
        "filename": photo.filename,
        "source": photo.source,
        "category": photo.category,
        "category_confidence": photo.category_confidence,
        "caption": photo.caption,
        "tags": photo.tags,
        "width": photo.width,
        "height": photo.height,
        "file_size": photo.file_size,
        "taken_at": photo.taken_at.isoformat() if photo.taken_at else None,
        "is_duplicate": photo.is_duplicate,
        "duplicate_of": str(photo.duplicate_of_id) if photo.duplicate_of_id else None,
        "md5_hash": photo.md5_hash,
    }


# --- Google Photos OAuth ---

@router.get("/google/auth-url")
async def google_auth_url():
    """Get Google OAuth URL to initiate login."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(501, "Google Photos not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    return {"auth_url": get_auth_url()}


@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback and store tokens."""
    tokens = await exchange_code_for_tokens(code)
    # In production: store tokens in GoogleAuthToken table per user
    return {"message": "Google Photos connected", "access_token": tokens.get("access_token")}


@router.post("/google/sync")
async def sync_google_photos(
    access_token: str,
    max_photos: int = Query(1000, ge=1, le=100000),
    db: AsyncSession = Depends(get_db),
):
    """Sync photos from Google Photos library."""
    synced = 0
    async for photo_meta in sync_all_google_photos(access_token, max_photos):
        try:
            photo_bytes = await download_google_photo(access_token, photo_meta["base_url"])
            file_path = await save_uploaded_file(photo_bytes, photo_meta["filename"])
            await process_photo(
                db, file_path, photo_meta["filename"],
                source=PhotoSource.GOOGLE_PHOTOS,
                google_photo_id=photo_meta["google_photo_id"],
            )
            synced += 1
        except Exception as e:
            continue

    await db.commit()
    return {"synced": synced, "message": f"Successfully synced {synced} photos from Google Photos"}
