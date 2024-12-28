from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime

class TranscriptionTask(Base):
    __tablename__ = "transcription_tasks"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("video_sources.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String)  # idle, processing, success, error
    text = Column(Text)
    segments = Column(JSON)
    error = Column(String)
    progress = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    source = relationship("VideoSource", back_populates="transcription_tasks")
    user = relationship("User", back_populates="transcription_tasks") 