"""
Logging configuration
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from config.settings import settings

def setup_logging():
    """Setup logging configuration"""
    
    # Create logs directory
    settings.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    simple_formatter = logging.Formatter(
        fmt='%(levelname)s: %(message)s'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(simple_formatter)
    console_handler.setLevel(logging.INFO if not settings.DEBUG else logging.DEBUG)
    
    # File handler (rotating)
    file_handler = RotatingFileHandler(
        filename=settings.LOGS_DIR / "ml_service.log",
        maxBytes=10_000_000,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(detailed_formatter)
    file_handler.setLevel(logging.DEBUG)
    
    # Error file handler
    error_handler = RotatingFileHandler(
        filename=settings.LOGS_DIR / "errors.log",
        maxBytes=10_000_000,
        backupCount=5
    )
    error_handler.setFormatter(detailed_formatter)
    error_handler.setLevel(logging.ERROR)
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)
    
    # Suppress noisy loggers
    logging.getLogger("transformers").setLevel(logging.WARNING)
    logging.getLogger("torch").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    
    logging.info(f"Logging initialized - Level: {settings.LOG_LEVEL}")

# Initialize logging
setup_logging()
logger = logging.getLogger(__name__)