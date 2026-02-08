from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    STORMGLASS_API_KEY: str = os.getenv("STORMGLASS_API_KEY", "")
    
    class Config:
        env_file = ".env"

settings = Settings()