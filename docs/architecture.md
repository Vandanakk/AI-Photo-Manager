# Architecture & Design Decisions

## System Overview

The platform is built as a microservice-style monolith: a single FastAPI application with clear service separation, backed by PostgreSQL, Redis, and Celery workers. Each concern (duplicates, categorization, faces, search) is isolated in its own service module.

## Component Breakdown

### API Layer (FastAPI)
- Async endpoints using `async/await` throughout
- Input validation via Pydantic models
- OpenAPI docs auto-generated at `/docs`
- CORS enabled for frontend integration

### Database (PostgreSQL + SQLAlchemy async)
- `photos` table: core metadata, hashes, CLIP embeddings, category
- `persons` table: face cluster centroids, user-assigned names
- `face_appearances` table: per-photo face bounding boxes and embeddings
- `duplicate_groups` table: tracks exact/near-duplicate relationships
- All IDs are UUIDs for global uniqueness (supports distributed inserts)
- Connection pool: 20 base + 40 overflow = 60 concurrent DB connections

### Caching / Queue (Redis + Celery)
- Redis DB 0: general caching
- Redis DB 1: Celery broker
- Redis DB 2: Celery result backend
- Celery workers handle CPU-heavy AI inference asynchronously

## AI Pipeline

### 1. Duplicate Detection
```
Photo → MD5 hash → check DB → exact match? → mark duplicate
              ↓
         pHash + dHash → hamming distance ≤10 → near-duplicate
```
- MD5 is O(file_size) and deterministic — zero false positives for exact duplicates
- Perceptual hash (pHash) uses DCT of image thumbnail — robust to JPEG re-compression, minor crops
- Hamming distance threshold of 10 was chosen empirically (0=identical, ~64=max)

**Scaling to 100k+**: Current approach loads all pHashes into Python for comparison. For true scale:
- Add PostgreSQL `pg_trgm` extension for approximate string matching on hex hashes
- Or switch to LSH (MinHash / SimHash) for sub-linear duplicate search
- Or use pgvector with hamming distance operator

### 2. Categorization (CLIP)
```
Image → CLIP image encoder → 512-dim embedding
Text prompts per category → CLIP text encoder → 512-dim embeddings
Cosine similarity → highest scoring category
```
- Zero-shot: no labeled training data needed
- 3 prompts per category, max score used → more robust than single prompt
- Same embedding stored in DB and used for semantic search

### 3. Face Detection & Grouping
```
Image → face_recognition (HOG detector) → face locations + 128-dim embeddings
Each embedding → compare to Person centroids → match if L2 dist < 0.6
No match → create new Person cluster
Running average centroid update → adapts over time
```
- HOG model chosen over CNN for speed (CNN is more accurate but 4x slower)
- Centroid approach scales O(n_persons) per photo, no full re-clustering needed
- For production: switch to DBSCAN or HDBSCAN periodic re-clustering

### 4. Natural Language Search
```
Text query → keyword category filter (fast)
           + CLIP text embedding → cosine sim vs stored photo embeddings
Results sorted by score
```
- Keyword filter runs first, narrows candidate set
- CLIP enables semantic search: "beach vacation" finds beach photos even if not tagged
- Falls back to caption/tag text search when CLIP unavailable

## Scalability Design

| Concern | Current Solution | At 1M+ Scale |
|---|---|---|
| Duplicate detection | Python-side comparison | pgvector + HNSW index |
| Semantic search | Python cosine sim | pgvector `<=>` operator |
| Photo processing | Sync in-request | Celery queue + S3 storage |
| DB connections | Pool of 60 | PgBouncer connection pooler |
| Storage | Local volume | S3/GCS + CDN |
| Face clustering | Incremental centroid | Periodic DBSCAN re-run |

## Security Considerations
- Google OAuth tokens stored encrypted in DB (add encryption at rest in production)
- File uploads validated for MIME type and size before processing
- All IDs are UUIDs — no sequential ID enumeration attacks
- Secrets loaded from environment variables, never hardcoded
