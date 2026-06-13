from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, Index, LargeBinary, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class PhotoSource(str, enum.Enum):
    LOCAL = "local"
    GOOGLE_PHOTOS = "google_photos"


class PhotoCategory(str, enum.Enum):
    DOCUMENT = "document"
    PRESCRIPTION = "prescription"
    RECEIPT = "receipt"
    PEOPLE = "people"
    TRAVEL = "travel"
    PETS = "pets"
    OTHER = "other"


class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(512), nullable=False)
    original_path = Column(Text, nullable=False)
    source = Column(Enum(PhotoSource), default=PhotoSource.LOCAL)
    google_photo_id = Column(String(256), nullable=True, index=True)

    # File metadata
    file_size = Column(Integer)
    width = Column(Integer)
    height = Column(Integer)
    mime_type = Column(String(64))
    taken_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Hashes for deduplication
    md5_hash = Column(String(32), index=True)
    phash = Column(String(64), index=True)   # perceptual hash
    dhash = Column(String(64), index=True)   # difference hash

    # AI outputs
    category = Column(Enum(PhotoCategory), default=PhotoCategory.OTHER)
    category_confidence = Column(Float, default=0.0)
    clip_embedding = Column(ARRAY(Float), nullable=True)  # 512-dim CLIP vector
    caption = Column(Text, nullable=True)
    tags = Column(JSON, default=list)

    # Status
    is_processed = Column(Boolean, default=False)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"), nullable=True)

    # Relationships
    face_appearances = relationship("FaceAppearance", back_populates="photo", cascade="all, delete-orphan")
    duplicate_of = relationship("Photo", remote_side=[id], foreign_keys=[duplicate_of_id])

    __table_args__ = (
        Index("ix_photos_phash", "phash"),
        Index("ix_photos_category", "category"),
        Index("ix_photos_taken_at", "taken_at"),
    )


class Person(Base):
    __tablename__ = "persons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(256), nullable=True)  # user-assigned name
    face_embedding = Column(ARRAY(Float), nullable=False)  # 128-dim face embedding centroid
    photo_count = Column(Integer, default=0)
    thumbnail_photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    appearances = relationship("FaceAppearance", back_populates="person")


class FaceAppearance(Base):
    __tablename__ = "face_appearances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=True)

    # Bounding box (normalized 0-1)
    bbox_x = Column(Float)
    bbox_y = Column(Float)
    bbox_w = Column(Float)
    bbox_h = Column(Float)

    embedding = Column(ARRAY(Float), nullable=False)
    confidence = Column(Float, default=0.0)

    photo = relationship("Photo", back_populates="face_appearances")
    person = relationship("Person", back_populates="appearances")

    __table_args__ = (
        Index("ix_face_photo", "photo_id"),
        Index("ix_face_person", "person_id"),
    )


class DuplicateGroup(Base):
    __tablename__ = "duplicate_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    representative_photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"))
    group_type = Column(String(32))  # "exact" or "near"
    member_count = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GoogleAuthToken(Base):
    __tablename__ = "google_auth_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(256), nullable=False, unique=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
