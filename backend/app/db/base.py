from app.db.session import Base

# Import all your models here so Alembic/SQLAlchemy can "see" them
from app.models.user import User
from app.models.report import Report
from app.models.media import Media
from app.models.social import SocialPost