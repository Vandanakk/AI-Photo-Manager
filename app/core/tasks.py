import asyncio
import logging
from app.core.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_photo_task(self, file_path: str, filename: str, source: str = "local"):
    """Background task to process a single photo through the AI pipeline."""
    try:
        from app.core.database import WorkerAsyncSessionLocal
        from app.services.photo_service import process_photo
        from app.models.models import PhotoSource

        async def _run():
            async with WorkerAsyncSessionLocal() as db:
                photo_source = PhotoSource(source)
                photo = await process_photo(db, file_path, filename, photo_source)
                return str(photo.id)

        return asyncio.run(_run())
    except Exception as exc:
        logger.error(f"Task failed for {filename}: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task
def batch_scan_directory_task(directory: str, recursive: bool = True):
    """Background task to scan and process a full directory."""
    from app.core.database import WorkerAsyncSessionLocal
    from app.services.photo_service import scan_local_directory

    async def _run():
        async with WorkerAsyncSessionLocal() as db:
            result = await scan_local_directory(db, directory, recursive)
            return result

    return asyncio.run(_run())
