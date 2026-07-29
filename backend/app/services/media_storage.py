import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

import boto3

from app.core.config import settings


CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


class MediaStorageError(RuntimeError):
    """Raised when media cannot be persisted."""


class MediaStorage(Protocol):
    def save(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        """Persist media and return its public URL."""


def build_object_name(content_type: str) -> str:
    extension = CONTENT_TYPE_EXTENSIONS.get(
        content_type.lower(),
        ".bin",
    )

    return f"{uuid.uuid4().hex}{extension}"


class LocalMediaStorage:
    def __init__(
        self,
        directory: str | Path,
        public_url: str,
    ) -> None:
        self.directory = Path(directory).expanduser().resolve()
        self.directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        normalized_url = public_url.strip().rstrip("/")
        self.public_url = normalized_url or "/uploads"

    def save(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        del filename

        object_name = build_object_name(content_type)
        destination = self.directory / object_name

        try:
            destination.write_bytes(file_bytes)
        except OSError as exc:
            raise MediaStorageError(
                "Unable to write media to local storage"
            ) from exc

        return f"{self.public_url}/{object_name}"


class S3MediaStorage:
    def __init__(
        self,
        bucket: str,
        region: str,
        access_key_id: str | None = None,
        secret_access_key: str | None = None,
        client: Any = None,
    ) -> None:
        if not bucket:
            raise MediaStorageError(
                "S3_BUCKET is required for S3 media storage"
            )

        self.bucket = bucket
        self.region = region

        if client is not None:
            self.client = client
            return

        client_options: dict[str, Any] = {
            "region_name": region,
        }

        if access_key_id and secret_access_key:
            client_options.update(
                {
                    "aws_access_key_id": access_key_id,
                    "aws_secret_access_key": (
                        secret_access_key
                    ),
                }
            )

        try:
            self.client = boto3.client(
                "s3",
                **client_options,
            )
        except Exception as exc:
            raise MediaStorageError(
                "Unable to initialize S3 media storage"
            ) from exc

    def save(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        del filename

        object_name = build_object_name(content_type)
        object_key = f"reports/{object_name}"

        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=object_key,
                Body=file_bytes,
                ContentType=content_type,
            )
        except Exception as exc:
            raise MediaStorageError(
                "Unable to upload media to S3"
            ) from exc

        return (
            f"https://{self.bucket}.s3."
            f"{self.region}.amazonaws.com/{object_key}"
        )


@lru_cache
def get_media_storage() -> MediaStorage:
    if settings.MEDIA_STORAGE_PROVIDER == "local":
        return LocalMediaStorage(
            directory=settings.local_media_directory,
            public_url=settings.local_media_url,
        )

    return S3MediaStorage(
        bucket=settings.S3_BUCKET or "",
        region=settings.AWS_REGION,
        access_key_id=settings.AWS_ACCESS_KEY_ID,
        secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
