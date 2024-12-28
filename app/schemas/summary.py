from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime
from app.models.summary import SummaryType

class SummaryBase(BaseModel):
    title: Optional[str] = None
    summary_type: SummaryType
    summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    sentiment: Optional[Dict] = None
    status: str
    error: Optional[str] = None

class SummaryCreate(SummaryBase):
    transcript_id: int
    source_id: Optional[int] = None

class SummaryResponse(SummaryBase):
    id: int
    transcript_id: int
    source_id: Optional[int]
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True 

class SummaryRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150

class SummaryResponse(BaseModel):
    summary: str 