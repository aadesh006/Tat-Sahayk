import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import settings

router = APIRouter()

# Initialize Cloudinary Configuration
if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config( 
      cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
      api_key = settings.CLOUDINARY_API_KEY, 
      api_secret = settings.CLOUDINARY_API_SECRET,
      secure = True
    )

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # 1. Upload the file directly to Cloudinary
        result = cloudinary.uploader.upload(file.file, folder="tat_sahayk_reports")
        
        # 2. Get the secure HTTPS URL
        url = result.get("secure_url")
        
        return {"filename": file.filename, "file_path": url}

    except Exception as e:
        print(f"Error uploading to Cloudinary: {e}")
        raise HTTPException(status_code=500, detail="Image upload failed")