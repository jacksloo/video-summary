from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime

class VideoSource(Base):
    __tablename__ = "video_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    path = Column(String, unique=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    user = relationship("User", back_populates="video_sources")
    transcripts = relationship("VideoTranscript", back_populates="source")
    transcription_tasks = relationship("TranscriptionTask", back_populates="source")

class VideoTranscript(Base):
    __tablename__ = "video_transcripts"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("video_sources.id"))
    video_path = Column(String, index=True)
    text = Column(Text)
    segments = Column(JSON)
    language = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    source = relationship("VideoSource", back_populates="transcripts")
    summaries = relationship("VideoSummary", back_populates="transcript") 