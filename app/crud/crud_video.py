from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.video_source import VideoSource
from app.schemas.video_source import VideoSourceCreate, VideoSourceUpdate

class CRUDVideoSource(CRUDBase[VideoSource, VideoSourceCreate, VideoSourceUpdate]):
    def get_by_user(self, db: Session, *, user_id: int) -> List[VideoSource]:
        return db.query(self.model).filter(VideoSource.user_id == user_id).all()

video_source = CRUDVideoSource(VideoSource) 