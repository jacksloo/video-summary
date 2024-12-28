from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, JSON, Text
import json
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from sqlalchemy.sql import func
from app.db.base_class import Base

class SourceType(str, enum.Enum):
    LOCAL = "LOCAL"      # 本地文件夹
    CLOUD = "CLOUD"      # 云存储
    URL = "URL"         # 网络链接

class VideoSource(Base):
    __tablename__ = "video_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # 来源名称/标签
    type = Column(Enum(SourceType), nullable=False)  # 来源类型
    path = Column(String(500), nullable=False)  # 文件夹路径或云存储路径
    config = Column(String(1000), nullable=True, default='{}')  # 额外配置（如云存储凭证）
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="video_sources")
    transcripts = relationship("VideoTranscript", back_populates="source")
    transcription_tasks = relationship("TranscriptionTask", back_populates="source")

class VideoTranscript(Base):
    __tablename__ = "video_transcripts"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("video_sources.id"))
    video_path = Column(String, nullable=False)
    title = Column(String, nullable=True)
    text = Column(Text, nullable=True)
    segments = Column(JSON, nullable=True)
    labels = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    source = relationship("VideoSource", back_populates="transcripts") 