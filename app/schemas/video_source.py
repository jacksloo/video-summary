from typing import Optional, Dict
from pydantic import BaseModel, validator
from datetime import datetime
from enum import Enum
import json

class SourceType(str, Enum):
    LOCAL = "LOCAL"
    CLOUD = "CLOUD"
    URL = "URL"

class VideoSourceBase(BaseModel):
    name: str
    type: SourceType
    path: str
    config: Optional[str] = "{}"

    @validator('path')
    def validate_path(cls, v, values):
        if not v:
            raise ValueError("路径不能为空")
        
        # Windows 路径处理
        if values.get('type') == SourceType.LOCAL:
            v = v.replace('\\', '/')
        
        return v

    @validator('type')
    def validate_type(cls, v):
        if isinstance(v, str):
            return SourceType(v.upper())
        return v

    @validator('config')
    def validate_config(cls, v):
        """确保 config 是 JSON 字符串"""
        if isinstance(v, dict):
            return json.dumps(v)
        return v

class VideoSourceCreate(VideoSourceBase):
    pass

class VideoSourceUpdate(VideoSourceBase):
    pass

class VideoSource(VideoSourceBase):
    id: int
    user_id: int

    @validator('config', pre=True)
    def ensure_config_string(cls, v):
        if v is None:
            return "{}"
        if isinstance(v, dict):
            return json.dumps(v)
        if not isinstance(v, str):
            return str(v)
        return v

    class Config:
        from_attributes = True 