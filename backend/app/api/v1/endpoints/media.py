import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from app.core.config import settings

router = APIRouter()

if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

# Single upload
@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        result = cloudinary.uploader.upload(file.file, folder="tat_sahayk_reports")
        return {"filename": file.filename, "file_path": result.get("secure_url")}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Image upload failed")

# Multi upload
@router.post("/upload-many")
async def upload_many(files: List[UploadFile] = File(...)):
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images allowed")
    urls = []
    for file in files:
        try:
            result = cloudinary.uploader.upload(file.file, folder="tat_sahayk_reports")
            urls.append(result.get("secure_url"))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}")
    return {"file_paths": urls}