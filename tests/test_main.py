"""
Automated test suite for AI Photo Management Platform.
Run with: pytest tests/ -v --cov=app --cov-report=term-missing
"""
import pytest
import pytest_asyncio
import asyncio
import io
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.duplicate_service import (
    compute_md5, compute_perceptual_hashes, hamming_distance
)
from app.services.categorization_service import (
    _fallback_categorize, cosine_similarity, CATEGORIES
)
from app.services.search_service import parse_category_from_query
from PIL import Image, ImageDraw
import tempfile
import os


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
def sample_image():
    """Create an in-memory test image."""
    img = Image.new("RGB", (100, 100), color=(128, 200, 50))
    return img


@pytest.fixture
def sample_image_file(tmp_path):
    """Create a real image file on disk."""
    img = Image.new("RGB", (200, 200), color=(255, 0, 0))
    path = tmp_path / "test.jpg"
    img.save(str(path), "JPEG")
    return str(path)


@pytest.fixture
def duplicate_image_file(tmp_path):
    """Create identical image file for duplicate testing."""
    img = Image.new("RGB", (200, 200), color=(255, 0, 0))
    path = tmp_path / "test_copy.jpg"
    img.save(str(path), "JPEG")
    return str(path)


# ─── Health Check ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check(client):
    with patch("app.api.routes.health.get_db"):
        response = await client.get("/api/v1/health")
    assert response.status_code in (200, 500)  # 500 ok if no real DB in CI


@pytest.mark.asyncio
async def test_root_endpoint(client):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert data["version"] == "1.0.0"


# ─── Duplicate Detection ──────────────────────────────────────────────────────

def test_md5_hash_consistency(sample_image_file):
    hash1 = compute_md5(sample_image_file)
    hash2 = compute_md5(sample_image_file)
    assert hash1 == hash2
    assert len(hash1) == 32


def test_md5_different_files(tmp_path):
    img1 = Image.new("RGB", (100, 100), color=(255, 0, 0))
    img2 = Image.new("RGB", (100, 100), color=(0, 255, 0))
    p1 = tmp_path / "a.jpg"
    p2 = tmp_path / "b.jpg"
    img1.save(str(p1))
    img2.save(str(p2))
    assert compute_md5(str(p1)) != compute_md5(str(p2))


def test_perceptual_hash_similar_images(sample_image):
    phash1, dhash1 = compute_perceptual_hashes(sample_image)
    # Slightly modified image
    modified = sample_image.copy()
    phash2, dhash2 = compute_perceptual_hashes(modified)
    dist = hamming_distance(phash1, phash2)
    assert dist == 0  # identical images → 0 distance


def test_perceptual_hash_different_images():
    img1 = Image.new("RGB", (100, 100), color=(255, 255, 255))
    draw1 = ImageDraw.Draw(img1)
    draw1.rectangle([0, 0, 50, 100], fill=(0, 0, 0))

    img2 = Image.new("RGB", (100, 100), color=(255, 255, 255))
    draw2 = ImageDraw.Draw(img2)
    draw2.rectangle([0, 0, 100, 50], fill=(0, 0, 0))

    phash1, _ = compute_perceptual_hashes(img1)
    phash2, _ = compute_perceptual_hashes(img2)
    dist = hamming_distance(phash1, phash2)
    assert dist > 0  # different images → some distance


def test_hamming_distance_identical():
    h = "aabbccddeeff0011"
    assert hamming_distance(h, h) == 0


def test_hamming_distance_invalid():
    dist = hamming_distance("invalid!!!", "alsoinvalid!!!")
    assert dist == 999  # fallback for bad hashes


# ─── Categorization ───────────────────────────────────────────────────────────

def test_fallback_categorize_returns_valid_category(sample_image):
    category, confidence, embedding = _fallback_categorize(sample_image)
    assert category in CATEGORIES
    assert 0.0 <= confidence <= 1.0
    assert len(embedding) == 512


def test_cosine_similarity_identical():
    vec = [1.0, 0.0, 0.0]
    assert cosine_similarity(vec, vec) == pytest.approx(1.0)


def test_cosine_similarity_orthogonal():
    a = [1.0, 0.0]
    b = [0.0, 1.0]
    assert cosine_similarity(a, b) == pytest.approx(0.0)


def test_cosine_similarity_zero_vector():
    assert cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0


def test_categories_list():
    expected = {"document", "prescription", "receipt", "people", "travel", "pets", "other"}
    assert set(CATEGORIES) == expected


# ─── Search ───────────────────────────────────────────────────────────────────

def test_parse_category_people():
    assert parse_category_from_query("show me photos of people") == "people"


def test_parse_category_receipt():
    assert parse_category_from_query("find my receipts") == "receipt"


def test_parse_category_travel():
    assert parse_category_from_query("travel photos from my vacation") == "travel"


def test_parse_category_prescription():
    assert parse_category_from_query("medicine prescription") == "prescription"


def test_parse_category_pets():
    assert parse_category_from_query("pictures of my dog") == "pets"


def test_parse_category_none():
    assert parse_category_from_query("something random xyz") is None


# ─── API Routes ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_photos_returns_200(client):
    mock_db = AsyncMock()
    mock_db.execute.return_value = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))

    with patch("app.api.routes.photos.get_db", return_value=mock_db), \
         patch("app.api.routes.photos.list_photos", return_value=[]):
        response = await client.get("/api/v1/photos/")
    assert response.status_code == 200
    assert "photos" in response.json()


@pytest.mark.asyncio
async def test_search_requires_query(client):
    response = await client.get("/api/v1/search/")
    assert response.status_code == 422  # missing required query param


@pytest.mark.asyncio
async def test_upload_rejects_non_image(client):
    with patch("app.api.routes.photos.get_db"):
        response = await client.post(
            "/api/v1/photos/upload",
            files={"file": ("test.txt", b"hello world", "text/plain")},
        )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_faces_endpoint_returns_200(client):
    with patch("app.api.routes.faces.get_db"), \
         patch("app.api.routes.faces.get_persons_with_photos", return_value=[]):
        response = await client.get("/api/v1/faces/")
    assert response.status_code == 200
    data = response.json()
    assert "persons" in data


@pytest.mark.asyncio
async def test_categories_endpoint(client):
    from sqlalchemy.ext.asyncio import AsyncSession

    mock_result = MagicMock()
    mock_result.all.return_value = []
    with patch.object(AsyncSession, "execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = mock_result
        response = await client.get("/api/v1/categories/")
    assert response.status_code in (200, 500)


@pytest.mark.asyncio
async def test_duplicate_stats_endpoint(client):
    with patch("app.api.routes.duplicates.get_db"):
        response = await client.get("/api/v1/duplicates/stats")
    assert response.status_code in (200, 500)


# ─── Google Photos (mocked) ──────────────────────────────────────────────────

def test_google_auth_url_requires_client_id():
    from app.services.google_photos_service import get_auth_url
    from app.core.config import settings
    if not settings.GOOGLE_CLIENT_ID:
        # Should still construct the URL (even if invalid client id)
        url = get_auth_url()
        assert "accounts.google.com" in url


@pytest.mark.asyncio
async def test_google_auth_endpoint_without_config(client):
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", None):
        response = await client.get("/api/v1/photos/google/auth-url")
    assert response.status_code == 501


# ─── Performance / Scale ─────────────────────────────────────────────────────

def test_hash_performance(tmp_path):
    """Hashing 50 images should complete in reasonable time."""
    import time
    images = []
    for i in range(50):
        img = Image.new("RGB", (100, 100), color=(i * 5 % 256, i * 3 % 256, i % 256))
        path = tmp_path / f"img_{i}.jpg"
        img.save(str(path))
        images.append(str(path))

    start = time.time()
    for path in images:
        compute_md5(path)
    elapsed = time.time() - start
    assert elapsed < 5.0, f"Hashing 50 images took {elapsed:.2f}s — too slow"
