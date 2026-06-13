# AI Photo Management Platform

An intelligent, scalable photo management platform with AI-powered duplicate detection, auto-categorization, facial recognition, and natural language search. Supports Google Photos sync and local file systems. Designed to handle **100,000+ images**.

---

## Features

| Feature | Implementation |
|---|---|
| **Google Photos + Local Storage** | OAuth 2.0 + local directory scan |
| **Exact Duplicate Detection** | MD5 hashing |
| **Near-Duplicate Detection** | Perceptual hashing (pHash/dHash) with Hamming distance |
| **Auto Categorization** | CLIP zero-shot classification (7 categories) |
| **Face Grouping** | dlib face embeddings + DBSCAN-style clustering |
| **Natural Language Search** | CLIP text embeddings + cosine similarity |
| **Scalable Storage** | PostgreSQL + async SQLAlchemy (supports 100k+ photos) |
| **Background Processing** | Celery + Redis task queue |
| **Docker Deployment** | Full docker-compose setup |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FastAPI App                       │
│  /photos  /search  /faces  /duplicates  /categories │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │PostgreSQL│ │  Redis   │ │  Celery  │
  │(metadata)│ │ (cache)  │ │(workers) │
  └──────────┘ └──────────┘ └──────────┘
        
AI Pipeline (per photo):
  Image → MD5 Hash → pHash → CLIP Embedding → Face Detection → DB
             ↓           ↓          ↓               ↓
        Exact Dup    Near Dup   Category +       Person
        Detection    Detection    Search         Grouping
```

### Design Decisions

1. **CLIP for categorization & search**: Zero-shot classification means no labeled training data needed. The same model handles both categorization and semantic search.

2. **Perceptual hashing for near-duplicates**: pHash is O(1) per comparison and stores as a hex string. At 100k scale, we compare against indexed hashes. For larger scale, switch to LSH (Locality Sensitive Hashing) or a vector DB like pgvector.

3. **Async FastAPI + asyncpg**: Non-blocking I/O means the server handles concurrent uploads without blocking. Critical for batch processing of large photo libraries.

4. **Face clustering via running centroid**: Instead of a full DBSCAN re-run on every photo, we maintain a running average embedding per person cluster. Scales incrementally.

5. **Celery for background jobs**: Photo processing (CLIP inference, face detection) is CPU-heavy. Offloading to Celery workers means the API stays responsive.

---

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- (Optional) Google Cloud project with Photos API enabled

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/photo-platform.git
cd photo-platform
cp .env.example .env
# Edit .env if you want Google Photos support
```

### 2. Start with Docker

```bash
docker-compose up --build
```

The API will be live at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

### 3. Verify it's running

```bash
curl http://localhost:8000/api/v1/health
```

---

## API Reference

### Upload a Photo
```bash
curl -X POST http://localhost:8000/api/v1/photos/upload \
  -F "file=@/path/to/photo.jpg"
```

Response:
```json
{
  "photo_id": "uuid",
  "filename": "photo.jpg",
  "category": "travel",
  "is_duplicate": false
}
```

### Scan Local Directory
```bash
curl -X POST "http://localhost:8000/api/v1/photos/scan?directory=/data/photos&recursive=true"
```

### Natural Language Search
```bash
curl "http://localhost:8000/api/v1/search/?q=beach+vacation+photos&limit=20"
curl "http://localhost:8000/api/v1/search/?q=prescriptions+from+doctor"
curl "http://localhost:8000/api/v1/search/?q=photos+of+my+dog"
```

### List Photos by Category
```bash
curl "http://localhost:8000/api/v1/photos/?category=receipt"
curl "http://localhost:8000/api/v1/photos/?category=people"
```

### Get Duplicate Groups
```bash
curl http://localhost:8000/api/v1/duplicates/
curl http://localhost:8000/api/v1/duplicates/stats
```

### Browse Face Groups (People)
```bash
curl http://localhost:8000/api/v1/faces/

# Name a person
curl -X PATCH "http://localhost:8000/api/v1/faces/{person_id}/name?name=John"
```

### Google Photos Sync
```bash
# Step 1: Get OAuth URL
curl http://localhost:8000/api/v1/photos/google/auth-url

# Step 2: After OAuth, sync (up to 10,000 photos)
curl -X POST "http://localhost:8000/api/v1/photos/google/sync?access_token=YOUR_TOKEN&max_photos=10000"
```

---

## Photo Categories

| Category | Description |
|---|---|
| `document` | Papers, forms, certificates, IDs |
| `prescription` | Medical prescriptions, medicine labels |
| `receipt` | Shopping receipts, invoices, bills |
| `people` | Portraits, group photos, selfies |
| `travel` | Landmarks, scenic places, vacations |
| `pets` | Dogs, cats, animals |
| `other` | Everything else |

---

## Running Tests

```bash
# Inside Docker
docker-compose exec api pytest tests/ -v --cov=app --cov-report=term-missing

# Locally (with venv)
pip install -r requirements.txt
pytest tests/ -v
```

---

## Scalability Notes

- **100k+ images**: Hashes are indexed in PostgreSQL. CLIP embeddings stored as ARRAY(Float). For vector similarity search at scale, add `pgvector` extension and use `<=>` operator instead of Python-side cosine similarity.
- **Concurrent uploads**: Async SQLAlchemy with connection pool of 20+40 overflow handles high concurrency.
- **Batch processing**: Celery workers process photos in background. Scale workers horizontally by adding more containers.
- **Google Photos**: Streams photos page by page (100 at a time), never loads all metadata into memory at once.

---

## Project Structure

```
photo-platform/
├── app/
│   ├── main.py                    # FastAPI app entry point
│   ├── api/routes/
│   │   ├── photos.py              # Upload, scan, list, Google sync
│   │   ├── search.py              # Natural language search
│   │   ├── faces.py               # Face clusters / people
│   │   ├── duplicates.py          # Duplicate groups & stats
│   │   ├── categories.py          # Category counts
│   │   └── health.py              # Health check
│   ├── core/
│   │   ├── config.py              # Pydantic settings
│   │   └── database.py            # Async SQLAlchemy setup
│   ├── models/
│   │   └── models.py              # SQLAlchemy ORM models
│   └── services/
│       ├── photo_service.py       # Ingestion pipeline
│       ├── duplicate_service.py   # MD5 + pHash dedup
│       ├── categorization_service.py  # CLIP categorization
│       ├── face_service.py        # Face detection & grouping
│       ├── search_service.py      # NL search
│       └── google_photos_service.py   # Google Photos API
├── tests/
│   └── test_main.py               # Full test suite
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## Google Photos Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Photos Library API**
3. Create OAuth 2.0 credentials (Web Application type)
4. Add `http://localhost:8000/api/v1/photos/google/callback` as redirect URI
5. Copy Client ID and Secret to your `.env` file

---

## License

MIT
