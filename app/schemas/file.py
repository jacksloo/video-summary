from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FileResponse(BaseModel):
    name: str
    path: str
    size: int
    modified_time: float
    is_dir: bool = False

class FolderResponse(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: Optional[int] = None
    modified_time: float

    class Config:
        from_attributes = True 