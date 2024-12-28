from .users import router as users_router
from .videos import router as videos_router
from .summaries import router as summaries_router
from .files import router as files_router
from .settings import router as settings_router

__all__ = [
    "users_router", 
    "videos_router", 
    "summaries_router", 
    "files_router",
    "settings_router"
]

users = users_router
videos = videos_router
summaries = summaries_router
files = files_router
settings = settings_router 