from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base_class import Base
import json

# ... 其他导入和模型保持不变 ...

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
    config = Column(String, nullable=True, default="{}")
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    user = relationship("User", back_populates="video_sources")
    videos = relationship("Video", back_populates="source")

    @property
    def safe_config(self) -> str:
        """确保返回有效的 JSON 字符串"""
        if self.config is None:
            return "{}"
        if isinstance(self.config, dict):
            return json.dumps(self.config)
        if not isinstance(self.config, str):
            return str(self.config)
        return self.config

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    path = Column(String(500), nullable=False)
    source_id = Column(Integer, ForeignKey("video_sources.id"))
    duration = Column(Integer)
    size = Column(Integer)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source = relationship("VideoSource", back_populates="videos") 