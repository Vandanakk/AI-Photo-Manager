from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.services.duplicate_service import get_duplicate_groups
from app.models.models import Photo, PhotoCategory

router = APIRouter()


@router.get("/")
async def list_duplicate_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List groups of duplicate/near-duplicate photos."""
    groups = await get_duplicate_groups(db, skip, limit)
    return {
        "total_groups": len(groups),
        "groups": [
            {
                "original_id": str(g["original"].id),
                "original_filename": g["original"].filename,
                "duplicate_count": g["count"] - 1,
                "duplicates": [
                    {"id": str(d.id), "filename": d.filename, "type": "exact" if d.md5_hash == g["original"].md5_hash else "near"}
                    for d in g["duplicates"]
                ],
            }
            for g in groups
        ],
    }


@router.get("/stats")
async def duplicate_stats(db: AsyncSession = Depends(get_db)):
    """Get duplicate detection statistics."""
    total = await db.scalar(select(func.count(Photo.id)))
    duplicates = await db.scalar(select(func.count(Photo.id)).where(Photo.is_duplicate == True))
    return {
        "total_photos": total,
        "duplicate_photos": duplicates,
        "unique_photos": total - duplicates,
        "duplicate_percentage": round((duplicates / total * 100) if total else 0, 2),
    }
