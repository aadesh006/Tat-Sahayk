import shutil
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import settings

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True) # Create folder if it doesn't exist

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Create a unique filename (or keep original)
        file_location = f"{UPLOAD_DIR}/{file.filename}"
        
        # Save the file to disk
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"filename": file.filename, "file_path": file_location}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))