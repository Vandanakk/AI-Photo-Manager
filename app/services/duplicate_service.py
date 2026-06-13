"""
Duplicate detection using MD5 (exact) + perceptual hashing (near-duplicate).
Scales to 100k+ images via pre-indexed hashes in PostgreSQL.
"""
import hashlib
import imagehash
from PIL import Image
from pathlib import Path
from typing import Optional, Tuple
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.models import Photo, DuplicateGroup
import uuid

logger = logging.getLogger(__name__)

PHASH_THRESHOLD = 10   # hamming distance ≤10 → near-duplicate


def compute_md5(file_path: str) -> str:
    h = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def compute_perceptual_hashes(image: Image.Image) -> Tuple[str, str]:
    phash = str(imagehash.phash(image))
    dhash = str(imagehash.dhash(image))
    return phash, dhash


def hamming_distance(hash1: str, hash2: str) -> int:
    """Compare two hex perceptual hash strings."""
    try:
        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
        return h1 - h2
    except Exception:
        return 999


async def find_exact_duplicate(db: AsyncSession, md5: str, current_id: Optional[str] = None) -> Optional[Photo]:
    stmt = select(Photo).where(Photo.md5_hash == md5, Photo.is_duplicate == False)
    if current_id:
        stmt = stmt.where(Photo.id != uuid.UUID(current_id))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def find_near_duplicate(db: AsyncSession, phash: str, current_id: Optional[str] = None) -> Optional[Photo]:
    """
    Fetch candidate hashes and compute hamming distance in Python.
    For 100k+ scale, swap this with pgvector or a dedicated ANN index.
    """
    stmt = select(Photo).where(Photo.phash != None, Photo.is_duplicate == False)
    if current_id:
        stmt = stmt.where(Photo.id != uuid.UUID(current_id))

    result = await db.execute(stmt)
    candidates = result.scalars().all()

    for candidate in candidates:
        if candidate.phash and hamming_distance(phash, candidate.phash) <= PHASH_THRESHOLD:
            return candidate
    return None


async def mark_as_duplicate(db: AsyncSession, photo: Photo, original: Photo, dup_type: str = "exact"):
    photo.is_duplicate = True
    photo.duplicate_of_id = original.id
    db.add(photo)

    # Upsert duplicate group
    group = DuplicateGroup(
        representative_photo_id=original.id,
        group_type=dup_type,
        member_count=2,
    )
    db.add(group)
    await db.flush()
    logger.info(f"Marked {photo.id} as {dup_type} duplicate of {original.id}")


async def process_duplicates_for_photo(
    db: AsyncSession, photo: Photo, image: Image.Image, file_path: str
) -> dict:
    result = {"is_duplicate": False, "type": None, "original_id": None}

    # 1. Exact duplicate via MD5
    md5 = compute_md5(file_path)
    photo.md5_hash = md5

    exact_match = await find_exact_duplicate(db, md5, str(photo.id))
    if exact_match:
        await mark_as_duplicate(db, photo, exact_match, "exact")
        result.update({"is_duplicate": True, "type": "exact", "original_id": str(exact_match.id)})
        return result

    # 2. Near duplicate via perceptual hash
    phash, dhash = compute_perceptual_hashes(image)
    photo.phash = phash
    photo.dhash = dhash

    near_match = await find_near_duplicate(db, phash, str(photo.id))
    if near_match:
        await mark_as_duplicate(db, photo, near_match, "near")
        result.update({"is_duplicate": True, "type": "near", "original_id": str(near_match.id)})
        return result

    return result


async def get_duplicate_groups(db: AsyncSession, skip: int = 0, limit: int = 50):
    stmt = (
        select(Photo)
        .where(Photo.is_duplicate == False, Photo.md5_hash != None)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    originals = result.scalars().all()

    groups = []
    for original in originals:
        dup_stmt = select(Photo).where(Photo.duplicate_of_id == original.id)
        dup_result = await db.execute(dup_stmt)
        duplicates = dup_result.scalars().all()
        if duplicates:
            groups.append({"original": original, "duplicates": duplicates, "count": len(duplicates) + 1})
    return groups
