from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base_class import Base

class TranscriptionTask(Base):
    __tablename__ = "transcription_tasks"

    id = Column(Integer, primary_key=True, index=True)
    video_path = Column(String, nullable=False)  # 存储相对路径
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")  # pending, processing, success, error
    text = Column(Text, nullable=True)
    segments = Column(JSON, nullable=True)
    error = Column(String, nullable=True)
    progress = Column(Integer, default=0)
    language = Column(String, default="zh")  # 添加语言字段
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="transcription_tasks") 