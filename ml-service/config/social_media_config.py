from pydantic_settings import BaseSettings


class SocialMediaConfig(BaseSettings):

    
    # Twitter/X
    twitter_api_key: str
    twitter_api_secret: str
    twitter_access_token: str
    twitter_access_secret: str
    twitter_bearer_token: str
    
    # Facebook
    facebook_app_id: str
    facebook_app_secret: str
    facebook_access_token: str
    
    # YouTube
    youtube_api_key: str
    
    class Config:
        env_file = ".env"
        case_sensitive = False


social_media_config = SocialMediaConfig()