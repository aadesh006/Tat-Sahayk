from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


AIProvider = Literal["local", "bedrock", "hybrid"]
MediaStorageProvider = Literal["local", "s3"]
PhoneOTPProvider = Literal["disabled", "console", "sns"]
Environment = Literal["development", "test", "production"]

DatabaseSSLMode = Literal[
    "disable",
    "allow",
    "prefer",
    "require",
    "verify-ca",
    "verify-full",
]


class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "Tat-Sahayk API"
    ENVIRONMENT: Environment = "development"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 5001
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    DATABASE_URL: str
    DATABASE_SSL_MODE: DatabaseSSLMode = "disable"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # CORS
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:5174"
    )

    # AI provider
    AI_PROVIDER: AIProvider = "local"
    AI_FALLBACK_ENABLED: bool = False

    # Local ML service
    ML_SERVICE_URL: str = "http://localhost:8000"
    ML_SERVICE_TIMEOUT_SECONDS: float = 30.0
    ML_SERVICE_HEALTH_PATH: str = "/health"
    ML_SERVICE_ANALYZE_PATH: str = (
        "/api/v1/analyze/report"
    )

    # Media storage
    MEDIA_STORAGE_PROVIDER: MediaStorageProvider = "local"
    LOCAL_MEDIA_DIR: str = "uploads"
    LOCAL_MEDIA_URL: str = "/uploads"
    MEDIA_MAX_FILE_SIZE_MB: int = 10
    MEDIA_ALLOWED_CONTENT_TYPES: str = (
        "image/jpeg,image/png,image/webp,image/gif"
    )

    # Phone verification
    PHONE_OTP_PROVIDER: PhoneOTPProvider = "disabled"
    PHONE_OTP_TTL_MINUTES: int = Field(
        default=10,
        ge=1,
        le=30,
    )
    PHONE_OTP_RESEND_SECONDS: int = Field(
        default=60,
        ge=0,
        le=3600,
    )
    PHONE_OTP_MAX_ATTEMPTS: int = Field(
        default=5,
        ge=1,
        le=10,
    )

    # Background processing
    ENABLE_SOCIAL_HARVESTER: bool = False
    ENABLE_CLUSTER_ANALYSIS: bool = False
    SOCIAL_HARVEST_INTERVAL_MINUTES: int = 15
    CLUSTER_ANALYSIS_INTERVAL_MINUTES: int = 15

    # AWS
    AWS_ENABLED: bool = False
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET: Optional[str] = None
    AWS_BEDROCK_MODEL_ID: str = (
        "us.amazon.nova-pro-v1:0"
    )
    AWS_BEDROCK_TEXT_MODEL_ID: str = (
        "us.amazon.nova-micro-v1:0"
    )
    SES_SOURCE_EMAIL: Optional[str] = None

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None

    # External verification services
    OPENWEATHER_API_KEY: Optional[str] = None
    TAVILY_API_KEY: Optional[str] = None

    # Legacy Cloudinary configuration
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_phone_otp_configuration(self):
        if (
            self.ENVIRONMENT == "production"
            and self.PHONE_OTP_PROVIDER == "console"
        ):
            raise ValueError(
                "PHONE_OTP_PROVIDER=console is not allowed "
                "in production"
            )

        if (
            self.PHONE_OTP_PROVIDER == "sns"
            and not self.AWS_ENABLED
        ):
            raise ValueError(
                "AWS_ENABLED must be true when "
                "PHONE_OTP_PROVIDER=sns"
            )

        return self

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def uses_local_ml(self) -> bool:
        return self.AI_PROVIDER in {"local", "hybrid"}

    @property
    def uses_bedrock(self) -> bool:
        return self.AI_PROVIDER in {"bedrock", "hybrid"}

    @property
    def uses_local_media(self) -> bool:
        return self.MEDIA_STORAGE_PROVIDER == "local"

    @property
    def local_media_directory(self) -> Path:
        return Path(
            self.LOCAL_MEDIA_DIR
        ).expanduser().resolve()

    @property
    def local_media_url(self) -> str:
        normalized = self.LOCAL_MEDIA_URL.strip().strip("/")

        if not normalized:
            return "/uploads"

        return f"/{normalized}"

    @property
    def media_max_file_size_bytes(self) -> int:
        return self.MEDIA_MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def media_allowed_content_types(self) -> frozenset[str]:
        return frozenset(
            content_type.strip().lower()
            for content_type in (
                self.MEDIA_ALLOWED_CONTENT_TYPES.split(",")
            )
            if content_type.strip()
        )

    @property
    def aws_credentials_configured(self) -> bool:
        return bool(
            self.AWS_ENABLED
            and self.AWS_ACCESS_KEY_ID
            and self.AWS_SECRET_ACCESS_KEY
        )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
