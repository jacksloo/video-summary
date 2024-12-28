from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class TranscriptionTask(Base):
    __tablename__ = "transcription_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    source_id = Column(Integer, ForeignKey("video_sources.id"))
    video_path = Column(String, nullable=False)
    status = Column(String, nullable=True)  # pending, processing, success, error
    text = Column(Text, nullable=True)
    segments = Column(JSON, nullable=True)
    error = Column(String, nullable=True)
    progress = Column(Integer, nullable=True)
    language = Column(String, nullable=True)
    model = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 添加关系
    user = relationship("User", back_populates="transcription_tasks")
    source = relationship("VideoSource", back_populates="transcription_tasks") 