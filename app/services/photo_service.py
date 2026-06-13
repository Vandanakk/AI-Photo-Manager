"""
Core photo ingestion and processing pipeline.
Handles: local file scan, upload, EXIF extraction, AI processing.
"""
import os
import shutil
import logging
from pathlib import Path
from typing import Optional, List
from datetime import datetime
import uuid

from PIL import Image
from PIL.ExifTags import TAGS
import aiofiles

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Photo, PhotoSource, PhotoCategory
from app.services.duplicate_service import process_duplicates_for_photo
from app.services.categorization_service import categorize_with_clip
from app.services.face_service import process_faces_for_photo
from app.core.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".heic", ".tiff"}


def extract_exif_data(image: Image.Image) -> dict:
    exif_data = {}
    try:
        raw_exif = image._getexif()
        if raw_exif:
            for tag_id, value in raw_exif.items():
                tag = TAGS.get(tag_id, tag_id)
                exif_data[tag] = value
    except Exception:
        pass
    return exif_data


def parse_taken_at(exif_data: dict) -> Optional[datetime]:
    for key in ("DateTimeOriginal", "DateTime", "DateTimeDigitized"):
        val = exif_data.get(key)
        if val:
            try:
                return datetime.strptime(val, "%Y:%m:%d %H:%M:%S")
            except Exception:
                continue
    return None


async def save_uploaded_file(file_content: bytes, filename: str) -> str:
    storage_dir = Path(settings.LOCAL_STORAGE_PATH)
    storage_dir.mkdir(parents=True, exist_ok=True)
    dest = storage_dir / f"{uuid.uuid4()}_{filename}"
    async with aiofiles.open(dest, "wb") as f:
        await f.write(file_content)
    return str(dest)


async def process_photo(
    db: AsyncSession,
    file_path: str,
    filename: str,
    source: PhotoSource = PhotoSource.LOCAL,
    google_photo_id: Optional[str] = None,
) -> Photo:
    """Full AI processing pipeline for a single photo."""

    # Check if already processed
    existing = await db.execute(select(Photo).where(Photo.original_path == file_path))
    if existing.scalar_one_or_none():
        logger.debug(f"Photo already processed: {file_path}")
        return existing.scalar_one_or_none()

    image = Image.open(file_path).convert("RGB")
    exif_data = extract_exif_data(image)
    taken_at = parse_taken_at(exif_data)
    file_size = os.path.getsize(file_path)

    photo = Photo(
        filename=filename,
        original_path=file_path,
        source=source,
        google_photo_id=google_photo_id,
        file_size=file_size,
        width=image.width,
        height=image.height,
        mime_type=Image.MIME.get(image.format, "image/jpeg"),
        taken_at=taken_at,
    )
    db.add(photo)
    await db.flush()  # get photo.id

    # 1. Duplicate detection
    await process_duplicates_for_photo(db, photo, image, file_path)

    if not photo.is_duplicate:
        # 2. Categorization + CLIP embedding
        category, confidence, embedding = categorize_with_clip(image)
        photo.category = category
        photo.category_confidence = confidence
        photo.clip_embedding = embedding

        # 3. Face detection & grouping
        await process_faces_for_photo(db, photo, image)

    photo.is_processed = True
    db.add(photo)

    logger.info(f"Processed: {filename} → {photo.category} (dup={photo.is_duplicate})")
    return photo


async def scan_local_directory(
    db: AsyncSession,
    directory: str,
    recursive: bool = True,
) -> dict:
    """Scan a local directory and process all images."""
    dir_path = Path(directory)
    if not dir_path.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")

    pattern = "**/*" if recursive else "*"
    files = [
        f for f in dir_path.glob(pattern)
        if f.suffix.lower() in SUPPORTED_EXTENSIONS and f.is_file()
    ]

    processed = 0
    failed = 0
    duplicates = 0

    for file_path in files:
        try:
            photo = await process_photo(db, str(file_path), file_path.name)
            if photo.is_duplicate:
                duplicates += 1
            else:
                processed += 1
        except Exception as e:
            logger.error(f"Failed to process {file_path}: {e}")
            failed += 1

    await db.commit()
    return {
        "total_files": len(files),
        "processed": processed,
        "duplicates_found": duplicates,
        "failed": failed,
        "directory": directory,
    }


async def get_photo_by_id(db: AsyncSession, photo_id: str) -> Optional[Photo]:
    result = await db.execute(select(Photo).where(Photo.id == uuid.UUID(photo_id)))
    return result.scalar_one_or_none()


async def list_photos(
    db: AsyncSession,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    include_duplicates: bool = False,
) -> List[Photo]:
    stmt = select(Photo)
    if not include_duplicates:
        stmt = stmt.where(Photo.is_duplicate == False)
    if category:
        stmt = stmt.where(Photo.category == category)
    stmt = stmt.order_by(Photo.taken_at.desc().nullslast()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()
