from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.schemas.settings import Settings, SettingsUpdate

router = APIRouter()

@router.get("/", response_model=Settings)
def get_settings(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """获取用户设置"""
    return current_user.settings or {}

@router.post("/", response_model=Settings)
def update_settings(
    settings: SettingsUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """更新用户设置"""
    current_user.settings = settings.dict()
    db.commit()
    return current_user.settings 