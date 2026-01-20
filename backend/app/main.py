from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Tat-Sahayk API",
    description="Ocean Hazard Reporting Platform API",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:3000",  #default
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"project": "Tat-Sahayk", "status": "active", "message": "Coast Helper is ready to save lives!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}