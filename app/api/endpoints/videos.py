from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.get("/sources/", response_model=List[schemas.VideoSource])
def get_video_sources(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """获取用户的所有视频来源"""
    sources = crud.video_source.get_by_user(db, user_id=current_user.id)
    return sources

@router.post("/sources")
def add_source(
    source: schemas.VideoSourceCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """添加视频来源"""
    try:
        # 检查是否已经添加过该路径
        if source.type == "local":
            existing = db.query(models.VideoSource).filter(
                models.VideoSource.path == source.path,
                models.VideoSource.user_id == current_user.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=409,
                    detail="该文件夹已经添加过了"
                )

        db_source = models.VideoSource(
            name=source.name,
            type=source.type,
            path=source.path,
            config=source.config,
            user_id=current_user.id
        )
        db.add(db_source)
        db.commit()
        db.refresh(db_source)
        return db_source
    except Exception as e:
        db.rollback()
        print(f"Error adding source: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ... 添加更多视频相关的API端点 ... 