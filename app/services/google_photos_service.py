"""
Google Photos API integration.
Uses OAuth 2.0 for authentication and the Photos Library API.
"""
import httpx
import logging
from typing import List, Dict, Optional, AsyncGenerator
from datetime import datetime, timedelta

from app.core.config import settings

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_PHOTOS_BASE = "https://photoslibrary.googleapis.com/v1"

SCOPES = [
    "https://www.googleapis.com/auth/photoslibrary.readonly",
    "openid",
    "email",
]


def get_auth_url(state: str = "default") -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "state": state,
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query}"


async def exchange_code_for_tokens(code: str) -> Dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> Dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "refresh_token": refresh_token,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        return response.json()


async def list_google_photos(
    access_token: str,
    page_size: int = 100,
    page_token: Optional[str] = None,
) -> Dict:
    """List photos from Google Photos library."""
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"pageSize": page_size}
    if page_token:
        params["pageToken"] = page_token

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{GOOGLE_PHOTOS_BASE}/mediaItems",
            headers=headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()


async def download_google_photo(access_token: str, base_url: str) -> bytes:
    """Download photo bytes from Google Photos."""
    download_url = f"{base_url}=d"  # =d suffix forces download
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(download_url, headers=headers)
        response.raise_for_status()
        return response.content


async def sync_all_google_photos(
    access_token: str,
    max_photos: int = 100000,
) -> AsyncGenerator[Dict, None]:
    """
    Generator that yields photo metadata dicts from Google Photos.
    Handles pagination automatically.
    """
    fetched = 0
    page_token = None

    while fetched < max_photos:
        data = await list_google_photos(access_token, page_size=100, page_token=page_token)
        items = data.get("mediaItems", [])

        for item in items:
            if fetched >= max_photos:
                return
            mime = item.get("mimeType", "")
            if not mime.startswith("image/"):
                continue

            yield {
                "google_photo_id": item["id"],
                "filename": item.get("filename", f"photo_{item['id']}.jpg"),
                "base_url": item["baseUrl"],
                "mime_type": mime,
                "created_at": item.get("mediaMetadata", {}).get("creationTime"),
                "width": int(item.get("mediaMetadata", {}).get("width", 0)),
                "height": int(item.get("mediaMetadata", {}).get("height", 0)),
            }
            fetched += 1

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    logger.info(f"Google Photos sync complete: {fetched} photos fetched")
