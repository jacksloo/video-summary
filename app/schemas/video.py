from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime

# VideoSeries schemas
class VideoSeriesBase(BaseModel):
    name: str

class VideoSeriesCreate(VideoSeriesBase):
    pass

class VideoSeriesUpdate(VideoSeriesBase):
    pass

class VideoSeries(VideoSeriesBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Video schemas
class VideoBase(BaseModel):
    title: str
    path: str
    duration: Optional[int] = None
    size: Optional[int] = None
    status: str = "pending"

class VideoCreate(VideoBase):
    source_id: int
    series_id: Optional[int] = None

class VideoUpdate(VideoBase):
    pass

class Video(VideoBase):
    id: int
    user_id: int
    source_id: int
    series_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# VideoSummary schemas
class VideoSummaryBase(BaseModel):
    content: str

class VideoSummaryCreate(VideoSummaryBase):
    video_id: int

class VideoSummaryUpdate(VideoSummaryBase):
    pass

class VideoSummary(VideoSummaryBase):
    id: int
    video_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# VideoTranscript schemas
class VideoTranscriptBase(BaseModel):
    video_path: str
    title: Optional[str] = None
    text: Optional[str] = None
    segments: Optional[List[Dict]] = None
    labels: Optional[Dict] = None

class VideoTranscriptCreate(VideoTranscriptBase):
    source_id: int

class VideoTranscriptUpdate(VideoTranscriptBase):
    pass

class VideoTranscriptInDBBase(VideoTranscriptBase):
    id: int
    source_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VideoTranscript(VideoTranscriptInDBBase):
    pass 