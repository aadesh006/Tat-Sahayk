import boto3
import uuid
from fastapi import HTTPException
from app.core.config import settings

s3 = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

def upload_image(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """
    Upload file (image or video) to S3.
    
    Args:
        file_bytes: File content as bytes
        filename: Original filename
        content_type: MIME type (e.g., 'image/jpeg', 'video/mp4')
    
    Returns:
        Public S3 URL
    """
    bucket = settings.S3_BUCKET
    if not bucket:
        raise HTTPException(status_code=500, detail="S3 bucket not configured")
    
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    key = f"reports/{uuid.uuid4().hex}.{ext}"
    
    try:
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {e}")