from fastapi import APIRouter
from app.api.api_v1.endpoints import (
    users_router, 
    videos_router, 
    summaries_router, 
    files_router,
    settings_router
)

api_router = APIRouter()

# 需要认证的路由
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(videos_router, prefix="/videos", tags=["videos"])

# 摘要路由，部分端点不需要认证
api_router.include_router(summaries_router, prefix="/summaries", tags=["summaries"])
api_router.include_router(files_router, prefix="/files", tags=["files"])
api_router.include_router(settings_router, prefix="/settings", tags=["settings"]) 