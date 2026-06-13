from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.face_service import get_persons_with_photos, rename_person

router = APIRouter()


@router.get("/")
async def list_persons(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List all detected persons/face clusters."""
    persons = await get_persons_with_photos(db, skip, limit)
    return {
        "total": len(persons),
        "persons": [
            {
                "person_id": str(p["person"].id),
                "name": p["person"].name,
                "photo_count": p["person"].photo_count,
                "sample_photo_ids": p["photo_ids"][:4],
            }
            for p in persons
        ],
    }


@router.patch("/{person_id}/name")
async def update_person_name(
    person_id: str,
    name: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """Assign a name to a face cluster (like tagging a person in Google Photos)."""
    person = await rename_person(db, person_id, name)
    if not person:
        raise HTTPException(404, "Person not found")
    return {"person_id": person_id, "name": name, "message": "Name updated"}
