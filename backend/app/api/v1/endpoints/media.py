# import cloudinary
# import cloudinary.uploader
# from fastapi import APIRouter, UploadFile, File, HTTPException
# from typing import List
# from app.core.config import settings

# router = APIRouter()

# if settings.CLOUDINARY_CLOUD_NAME:
#     cloudinary.config(
#         cloud_name=settings.CLOUDINARY_CLOUD_NAME,
#         api_key=settings.CLOUDINARY_API_KEY,
#         api_secret=settings.CLOUDINARY_API_SECRET,
#         secure=True
#     )

# # Single upload
# @router.post("/upload")
# async def upload_file(file: UploadFile = File(...)):
#     try:
#         result = cloudinary.uploader.upload(file.file, folder="tat_sahayk_reports")
#         return {"filename": file.filename, "file_path": result.get("secure_url")}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail="Image upload failed")

# # Multi upload
# @router.post("/upload-many")
# async def upload_many(files: List[UploadFile] = File(...)):
#     if len(files) > 5:
#         raise HTTPException(status_code=400, detail="Maximum 5 images allowed")
#     urls = []
#     for file in files:
#         try:
#             result = cloudinary.uploader.upload(file.file, folder="tat_sahayk_reports")
#             urls.append(result.get("secure_url"))
#         except Exception as e:
#             raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}")
#     return {"file_paths": urls}

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from app.services.s3_upload import upload_image
import asyncio
from concurrent.futures import ThreadPoolExecutor

router = APIRouter()

# Thread pool for concurrent S3 uploads
executor = ThreadPoolExecutor(max_workers=5)

@router.post("/upload")
async def upload_single(file: UploadFile = File(...)):
    content = await file.read()
    # Run S3 upload in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    url = await loop.run_in_executor(
        executor,
        upload_image,
        content,
        file.filename,
        file.content_type or "image/jpeg"
    )
    return {"filename": file.filename, "file_path": url}

@router.post("/upload-many")
async def upload_many(files: List[UploadFile] = File(...)):
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images")
    
    # Read all files first
    file_data = []
    for f in files:
        content = await f.read()
        file_data.append((content, f.filename, f.content_type or "image/jpeg"))
    
    # Upload all files concurrently using thread pool
    loop = asyncio.get_event_loop()
    upload_tasks = [
        loop.run_in_executor(executor, upload_image, content, filename, content_type)
        for content, filename, content_type in file_data
    ]
    
    # Wait for all uploads to complete
    urls = await asyncio.gather(*upload_tasks)
    
    return {"file_paths": list(urls)}