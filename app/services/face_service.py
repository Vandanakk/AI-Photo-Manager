"""
Face detection using face_recognition (dlib-based).
Groups faces across photos by clustering embeddings with DBSCAN.
"""
from PIL import Image
from typing import List, Tuple, Optional, Dict
import numpy as np
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Photo, Person, FaceAppearance

logger = logging.getLogger(__name__)

FACE_SIMILARITY_THRESHOLD = 0.6  # cosine similarity threshold


def detect_and_encode_faces(image: Image.Image) -> List[Dict]:
    """
    Returns list of dicts: {bbox, embedding}
    bbox is (x, y, w, h) normalized to 0-1.
    """
    try:
        import face_recognition
        import numpy as np

        img_array = np.array(image.convert("RGB"))
        height, width = img_array.shape[:2]

        locations = face_recognition.face_locations(img_array, model="hog")
        encodings = face_recognition.face_encodings(img_array, locations)

        faces = []
        for (top, right, bottom, left), encoding in zip(locations, encodings):
            faces.append({
                "bbox": {
                    "x": left / width,
                    "y": top / height,
                    "w": (right - left) / width,
                    "h": (bottom - top) / height,
                },
                "embedding": encoding.tolist(),
            })
        return faces

    except ImportError:
        logger.warning("face_recognition not available, skipping face detection")
        return []
    except Exception as e:
        logger.error(f"Face detection failed: {e}")
        return []


def embedding_distance(e1: List[float], e2: List[float]) -> float:
    a = np.array(e1)
    b = np.array(e2)
    return float(np.linalg.norm(a - b))


async def find_or_create_person(db: AsyncSession, face_embedding: List[float]) -> Person:
    """Match face to existing person or create new person cluster."""
    stmt = select(Person)
    result = await db.execute(stmt)
    persons = result.scalars().all()

    best_match = None
    best_distance = float("inf")

    for person in persons:
        if person.face_embedding:
            dist = embedding_distance(face_embedding, person.face_embedding)
            if dist < best_distance:
                best_distance = dist
                best_match = person

    if best_match and best_distance < FACE_SIMILARITY_THRESHOLD:
        # Update centroid embedding (running average)
        n = best_match.photo_count or 1
        old_emb = np.array(best_match.face_embedding)
        new_emb = np.array(face_embedding)
        updated_emb = ((old_emb * n) + new_emb) / (n + 1)
        best_match.face_embedding = updated_emb.tolist()
        best_match.photo_count = (best_match.photo_count or 0) + 1
        db.add(best_match)
        return best_match

    # Create new person
    new_person = Person(
        face_embedding=face_embedding,
        photo_count=1,
    )
    db.add(new_person)
    await db.flush()
    return new_person


async def process_faces_for_photo(db: AsyncSession, photo: Photo, image: Image.Image):
    """Detect faces in photo, match/create persons, store appearances."""
    faces = detect_and_encode_faces(image)

    for face in faces:
        person = await find_or_create_person(db, face["embedding"])
        appearance = FaceAppearance(
            photo_id=photo.id,
            person_id=person.id,
            bbox_x=face["bbox"]["x"],
            bbox_y=face["bbox"]["y"],
            bbox_w=face["bbox"]["w"],
            bbox_h=face["bbox"]["h"],
            embedding=face["embedding"],
            confidence=1.0 - min(1.0, FACE_SIMILARITY_THRESHOLD),
        )
        db.add(appearance)

    if faces:
        from app.models.models import PhotoCategory
        photo.category = PhotoCategory.PEOPLE

    return len(faces)


async def get_persons_with_photos(db: AsyncSession, skip: int = 0, limit: int = 50):
    stmt = select(Person).offset(skip).limit(limit)
    result = await db.execute(stmt)
    persons = result.scalars().all()

    output = []
    for person in persons:
        app_stmt = (
            select(FaceAppearance)
            .where(FaceAppearance.person_id == person.id)
            .limit(10)
        )
        app_result = await db.execute(app_stmt)
        appearances = app_result.scalars().all()
        output.append({
            "person": person,
            "photo_ids": [str(a.photo_id) for a in appearances],
        })
    return output


async def rename_person(db: AsyncSession, person_id: str, name: str) -> Optional[Person]:
    stmt = select(Person).where(Person.id == uuid.UUID(person_id))
    result = await db.execute(stmt)
    person = result.scalar_one_or_none()
    if person:
        person.name = name
        db.add(person)
    return person
