from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )
    

    PROJECT_NAME: str = "Tat-Sahayk ML Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_WORKERS: int = 4
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    

    BASE_DIR: Path = Path(__file__).parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    RAW_DATA_DIR: Path = DATA_DIR / "raw"
    PROCESSED_DATA_DIR: Path = DATA_DIR / "processed"
    MODELS_DIR: Path = BASE_DIR / "models"
    LOGS_DIR: Path = BASE_DIR / "logs"
    

    TEXT_MODEL_NAME: str = "distilbert-base-uncased"
    MAX_SEQ_LENGTH: int = 128
    BATCH_SIZE: int = 16
    EPOCHS: int = 3
    LEARNING_RATE: float = 2e-5
    

    TEST_SIZE: float = 0.2
    VALIDATION_SIZE: float = 0.1
    RANDOM_SEED: int = 42
    

    HOTSPOT_RADIUS_KM: int = 5
    HOTSPOT_MIN_REPORTS: int = 3
    DENSITY_RADIUS_KM: int = 20
    

    CREDIBILITY_THRESHOLD: float = 0.6
    CONFIDENCE_THRESHOLD: float = 0.7
    PANIC_THRESHOLD: float = 0.8
    

    TWITTER_API_KEY: Optional[str] = None
    TWITTER_API_SECRET: Optional[str] = None
    FACEBOOK_ACCESS_TOKEN: Optional[str] = None
    YOUTUBE_API_KEY: Optional[str] = None
    

    MONGODB_URI: str = "mongodb://localhost:27017/"
    REDIS_URI: str = "redis://localhost:6379/0"
    

    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_REPORTS: str = "ocean-reports"
    KAFKA_TOPIC_SOCIAL: str = "social-media"
    

    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._create_directories()
    
    def _create_directories(self):
        """Create necessary directories"""
        for dir_path in [
            self.DATA_DIR,
            self.RAW_DATA_DIR,
            self.PROCESSED_DATA_DIR,
            self.MODELS_DIR,
            self.LOGS_DIR,
        ]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


settings = Settings()


if settings.DEBUG:
    print(f" Loaded configuration: {settings.PROJECT_NAME} v{settings.VERSION}")
    print(f"  Environment: {settings.ENVIRONMENT}")
    print(f"  Data directory: {settings.DATA_DIR}")
    print(f"  Models directory: {settings.MODELS_DIR}")