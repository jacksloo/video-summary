from pydantic import BaseModel
from typing import Optional, List, Union

class TranscriptionRequest(BaseModel):
    sourceId: int
    relativePath: str
    language: str = "zh"  # 默认中文，可选值：zh, en, ja, ko 等

class TranscriptionResponse(BaseModel):
    taskId: int
    status: str = "processing"
    message: Optional[str] = None

class TranscriptionSegment(BaseModel):
    start: float
    end: float
    text: str

class TranscriptionStatus(BaseModel):
    taskId: int
    status: str
    text: Optional[str] = None
    segments: List[TranscriptionSegment] = []
    error: Optional[str] = None
    progress: int = 0 