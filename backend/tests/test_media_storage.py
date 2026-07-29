from pathlib import Path

from app.services.media_storage import (
    LocalMediaStorage,
    S3MediaStorage,
)


class FakeS3Client:
    def __init__(self) -> None:
        self.put_object_calls = []

    def put_object(self, **kwargs) -> None:
        self.put_object_calls.append(kwargs)


def test_local_storage_writes_media(
    tmp_path: Path,
):
    storage = LocalMediaStorage(
        directory=tmp_path,
        public_url="/uploads",
    )

    public_url = storage.save(
        file_bytes=b"prototype-image",
        filename="evidence.png",
        content_type="image/png",
    )

    assert public_url.startswith("/uploads/")
    assert public_url.endswith(".png")

    object_name = public_url.removeprefix(
        "/uploads/"
    )

    assert (
        tmp_path / object_name
    ).read_bytes() == b"prototype-image"


def test_local_storage_generates_unique_names(
    tmp_path: Path,
):
    storage = LocalMediaStorage(
        directory=tmp_path,
        public_url="/uploads",
    )

    first_url = storage.save(
        b"first",
        "same-name.jpg",
        "image/jpeg",
    )
    second_url = storage.save(
        b"second",
        "same-name.jpg",
        "image/jpeg",
    )

    assert first_url != second_url


def test_s3_storage_uploads_with_content_type():
    client = FakeS3Client()

    storage = S3MediaStorage(
        bucket="tat-sahayk-test",
        region="ap-south-1",
        client=client,
    )

    public_url = storage.save(
        file_bytes=b"image-data",
        filename="evidence.webp",
        content_type="image/webp",
    )

    assert public_url.startswith(
        "https://tat-sahayk-test.s3."
        "ap-south-1.amazonaws.com/reports/"
    )
    assert public_url.endswith(".webp")

    assert len(client.put_object_calls) == 1
    assert client.put_object_calls[0][
        "ContentType"
    ] == "image/webp"
    assert client.put_object_calls[0][
        "Body"
    ] == b"image-data"
