from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class TranscriptionSegment(BaseModel):
    """转录片段模型"""
    start: float
    end: float
    text: str

class TranscriptionRequest(BaseModel):
    sourceId: int
    relativePath: str
    language: Optional[str] = None
    force: Optional[bool] = False
    model: Optional[str] = "base"

class TranscriptionResponse(BaseModel):
    taskId: int

class TranscriptionStatus(BaseModel):
    taskId: int
    status: str
    text: Optional[str] = None
    segments: Optional[List[Dict[str, Any]]] = []
    error: Optional[str] = None
    progress: Optional[int] = 0

class TranscriptionResult(BaseModel):
    """转录结果模型"""
    id: int
    source_id: int
    video_path: str
    text: Optional[str]
    segments: Optional[List[TranscriptionSegment]]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True 