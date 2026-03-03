import boto3
import uuid
from fastapi import HTTPException

s3 = boto3.client("s3", region_name="us-east-1")
BUCKET = "tat-sahayk-media"

def upload_image(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    key = f"reports/{uuid.uuid4().hex}.{ext}"
    try:
        s3.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return f"https://{BUCKET}.s3.amazonaws.com/{key}"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {e}")