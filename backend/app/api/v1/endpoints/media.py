import asyncio
import logging
from dataclasses import dataclass
from typing import Sequence

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.services.media_storage import (
    MediaStorageError,
    get_media_storage,
)


router = APIRouter()
logger = logging.getLogger(__name__)

MAX_FILES_PER_REQUEST = 5


@dataclass(frozen=True)
class ValidatedUpload:
    content: bytes
    filename: str
    content_type: str


async def validate_upload(
    file: UploadFile,
) -> ValidatedUpload:
    content_type = (
        file.content_type or ""
    ).strip().lower()

    if (
        content_type
        not in settings.media_allowed_content_types
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
            ),
            detail=(
                "Unsupported media type. Allowed types: "
                + ", ".join(
                    sorted(
                        settings.media_allowed_content_types
                    )
                )
            ),
        )

    content = await file.read(
        settings.media_max_file_size_bytes + 1
    )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if len(content) > settings.media_max_file_size_bytes:
        raise HTTPException(
            status_code=(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            ),
            detail=(
                "File exceeds the maximum size of "
                f"{settings.MEDIA_MAX_FILE_SIZE_MB} MB"
            ),
        )

    return ValidatedUpload(
        content=content,
        filename=file.filename or "upload",
        content_type=content_type,
    )


async def store_uploads(
    uploads: Sequence[ValidatedUpload],
) -> list[str]:
    try:
        storage = get_media_storage()

        tasks = [
            asyncio.to_thread(
                storage.save,
                upload.content,
                upload.filename,
                upload.content_type,
            )
            for upload in uploads
        ]

        return list(await asyncio.gather(*tasks))
    except MediaStorageError as exc:
        logger.exception("Media storage operation failed")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Media storage is temporarily unavailable",
        ) from exc


@router.post("/upload")
async def upload_single(
    file: UploadFile = File(...),
    _current_user: User = Depends(
        deps.get_current_user
    ),
):
    validated = await validate_upload(file)
    urls = await store_uploads([validated])

    return {
        "filename": validated.filename,
        "file_path": urls[0],
    }


@router.post("/upload-many")
async def upload_many(
    files: list[UploadFile] = File(...),
    _current_user: User = Depends(
        deps.get_current_user
    ),
):
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file is required",
        )

    if len(files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Maximum {MAX_FILES_PER_REQUEST} files "
                "are allowed"
            ),
        )

    validated_uploads = [
        await validate_upload(file)
        for file in files
    ]

    urls = await store_uploads(validated_uploads)

    return {
        "file_paths": urls,
    }
