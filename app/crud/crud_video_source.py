from typing import List
from sqlalchemy.orm import Session
from app.models import models
import json

class VideoSourceCrud:
    def __init__(self):
        self.model = models.VideoSource

    def get_by_user(self, db: Session, *, user_id: int) -> List[models.VideoSource]:
        try:
            sources = db.query(self.model).filter(
                self.model.user_id == user_id
            ).all()
            
            # 确保每个源的 config 字段是字符串
            for source in sources:
                if source.config is None:
                    source.config = "{}"
                elif isinstance(source.config, dict):
                    source.config = json.dumps(source.config)
                elif not isinstance(source.config, str):
                    source.config = str(source.config)
            
            return sources
        except Exception as e:
            print(f"Database error in get_by_user: {str(e)}")
            raise

video_source = VideoSourceCrud() 