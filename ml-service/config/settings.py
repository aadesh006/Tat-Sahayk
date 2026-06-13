from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional, List
import os

PROJECT_ROOT = Path(__file__).parent.parent

class Settings(BaseSettings):

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5000", "*"]
    
    PROJECT_NAME: str = "Tat-Sahayk ML Service"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    BASE_DIR: Path = PROJECT_ROOT
    DATA_DIR: Path = PROJECT_ROOT / "data"
    MODELS_DIR: Path = PROJECT_ROOT / "models"
    LOGS_DIR: Path = PROJECT_ROOT / "logs"
    
    OPENWEATHER_API_KEY: Optional[str] = None
    STORMGLASS_API_KEY: Optional[str] = None

    TEXT_MODEL_NAME: str = "distilbert-base-uncased"
    IMAGE_MODEL_NAME: str = "CLIP"
    MAX_SEQ_LENGTH: int = 128
    
    MAX_BATCH_SIZE: int = 32
    REQUEST_TIMEOUT: int = 30
    BATCH_SIZE: int = 16
    
    DEFAULT_RADIUS_KM: float = 10.0
    MIN_HOTSPOT_REPORTS: int = 3
    HOTSPOT_MIN_REPORTS: int = 3  
    HOTSPOT_RADIUS_KM: float = 10.0
    DENSITY_RADIUS_KM: float = 20.0
    
    CREDIBILITY_THRESHOLD: float = 0.6
    CONFIDENCE_THRESHOLD: float = 0.7
    PANIC_THRESHOLD: float = 0.8
    
    EPOCHS: int = 3
    LEARNING_RATE: float = 2e-5
    TEST_SIZE: float = 0.2
    VALIDATION_SIZE: float = 0.1
    RANDOM_SEED: int = 42
    
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        extra = "ignore"  
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._create_directories()
    
    def _create_directories(self):
        try:
            for dir_path in [self.DATA_DIR, self.MODELS_DIR, self.LOGS_DIR]:
                if dir_path.parent.exists() and os.access(dir_path.parent, os.W_OK):
                    dir_path.mkdir(parents=True, exist_ok=True)
                elif not dir_path.exists():
                    pass
        except Exception as e:
            pass
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


settings = Settings()

if settings.DEBUG:
    print(f" Loaded configuration: {settings.PROJECT_NAME} v{settings.VERSION}")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   API: {settings.API_HOST}:{settings.API_PORT}")