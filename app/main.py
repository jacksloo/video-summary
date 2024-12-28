from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.api_v1.api import api_router
from app.core.config import settings
from app.api.deps import get_current_user

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 设置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 自定义认证中间件
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # 不需要认证的路径列表
    public_paths = [
        "/api/summaries/text",  # 文本摘要接口
        "/docs",                # Swagger UI
        "/redoc",              # ReDoc
        "/openapi.json"        # OpenAPI schema
    ]
    
    # 检查是否是公开路径
    if any(request.url.path.startswith(path) for path in public_paths):
        return await call_next(request)
    
    # 其他路径需要认证
    return await call_next(request)

# 包含 API 路由
app.include_router(api_router, prefix=settings.API_V1_STR)

# 健康检查端点
@app.get("/health")
async def health_check():
    return {"status": "ok"} 