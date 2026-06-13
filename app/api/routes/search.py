from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.search_service import natural_language_search, get_search_suggestions

router = APIRouter()


@router.get("/")
async def search_photos(
    q: str = Query(..., min_length=1, description="Natural language search query"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Search photos using natural language."""
    results = await natural_language_search(db, q, limit, skip)
    return {
        "query": q,
        "total": len(results),
        "results": results,
    }


@router.get("/suggestions")
async def search_suggestions(q: str = Query(..., min_length=1)):
    """Get search suggestions for autocomplete."""
    suggestions = await get_search_suggestions(q)
    return {"query": q, "suggestions": suggestions}
