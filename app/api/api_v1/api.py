from fastapi import APIRouter
from .endpoints import auth, videos, files

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(files.router, prefix="/files", tags=["files"]) 