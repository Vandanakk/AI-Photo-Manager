"""
Natural language search powered by CLIP text embeddings.
Query text → CLIP text embedding → cosine similarity against stored photo embeddings.
"""
from typing import List, Dict, Optional
import numpy as np
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Photo, PhotoCategory
from app.services.categorization_service import cosine_similarity, get_clip_model

logger = logging.getLogger(__name__)


def get_text_embedding(query: str) -> Optional[List[float]]:
    try:
        import torch

        model, processor = get_clip_model()
        if model is None or processor is None:
            return None

        inputs = processor(text=[query], return_tensors="pt", padding=True)
        with torch.no_grad():
            text_features = model.get_text_features(**inputs)
        return text_features[0].numpy().tolist()
    except Exception as e:
        logger.warning(f"Text embedding failed: {e}")
        return None


def parse_category_from_query(query: str) -> Optional[str]:
    """Simple keyword detection for category filtering."""
    q = query.lower()
    mapping = {
        "document": ["document", "paper", "form", "certificate"],
        "prescription": ["prescription", "medicine", "rx", "doctor"],
        "receipt": ["receipt", "bill", "invoice", "payment"],
        "people": ["person", "people", "face", "portrait", "selfie"],
        "travel": ["travel", "vacation", "trip", "holiday", "landmark"],
        "pets": ["pet", "dog", "cat", "animal"],
    }
    for category, keywords in mapping.items():
        if any(kw in q for kw in keywords):
            return category
    return None


async def natural_language_search(
    db: AsyncSession,
    query: str,
    limit: int = 20,
    skip: int = 0,
) -> List[Dict]:
    """
    Search photos by natural language.
    1. Try category filter from keywords.
    2. Use CLIP embedding similarity if available.
    3. Fall back to tag/caption text match.
    """
    results = []

    # Step 1: Category keyword filter
    detected_category = parse_category_from_query(query)

    stmt = select(Photo).where(Photo.is_processed == True, Photo.is_duplicate == False)
    if detected_category:
        stmt = stmt.where(Photo.category == detected_category)

    result = await db.execute(stmt)
    photos = result.scalars().all()

    # Step 2: CLIP semantic similarity
    query_embedding = get_text_embedding(query)

    scored = []
    for photo in photos:
        score = 0.5  # default

        if query_embedding and photo.clip_embedding:
            score = cosine_similarity(query_embedding, photo.clip_embedding)
        elif photo.caption and query.lower() in photo.caption.lower():
            score = 0.8
        elif photo.tags:
            tag_hits = sum(1 for tag in photo.tags if query.lower() in tag.lower())
            score = min(0.9, 0.5 + tag_hits * 0.1)

        scored.append((photo, score))

    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)

    for photo, score in scored[skip: skip + limit]:
        results.append({
            "photo_id": str(photo.id),
            "filename": photo.filename,
            "score": round(score, 4),
            "category": photo.category,
            "caption": photo.caption,
            "tags": photo.tags,
            "taken_at": photo.taken_at.isoformat() if photo.taken_at else None,
        })

    return results


async def get_search_suggestions(query: str) -> List[str]:
    """Return autocomplete suggestions based on common photo categories."""
    suggestions_map = {
        "doc": ["documents", "doctor's prescription"],
        "rec": ["receipts", "recent photos"],
        "tra": ["travel photos", "travel to beaches"],
        "pe": ["people photos", "pets"],
        "sel": ["selfies"],
    }
    for prefix, suggestions in suggestions_map.items():
        if query.lower().startswith(prefix):
            return suggestions
    return [f"photos of {query}", f"{query} documents", f"{query} travel"]
