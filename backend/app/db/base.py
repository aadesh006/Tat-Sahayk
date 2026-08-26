from app.db.session import Base
# Import models in dependency order to avoid circular import issues
from app.models.user import User
from app.models.confirmation import ReportConfirmation
from app.models.report import Report
from app.models.media import Media
from app.models.social import SocialPost
from app.models.comment import Comment
from app.models.alert import Alert
from app.models.map_annotation import MapAnnotation, DeployedForce
from app.models.rescue_deployment import RescueDeployment, Shelter
# Red Zone Management Extension
from app.models.hazard_zone import HazardZone
from app.models.relocation_site import RelocationSite
from app.models.vulnerable_habitation import VulnerableHabitation