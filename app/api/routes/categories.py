from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import Photo, PhotoCategory

router = APIRouter()


@router.get("/")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Get photo counts per category."""
    results = await db.execute(
        select(Photo.category, func.count(Photo.id).label("count"))
        .where(Photo.is_duplicate == False, Photo.is_processed == True)
        .group_by(Photo.category)
    )
    rows = results.all()
    return {
        "categories": [
            {"category": row.category, "count": row.count}
            for row in rows
        ]
    }
