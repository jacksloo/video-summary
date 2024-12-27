from pydantic import BaseModel
from enum import Enum
from typing import List
from datetime import datetime
from typing import Optional

class ItemType(str, Enum):
    FOLDER = "folder"
    VIDEO = "video"

class FolderItem(BaseModel):
    name: str
    path: str
    type: ItemType
    size: int
    modified_time: datetime
    # 视频特有属性
    duration: Optional[int] = None
    thumbnail: Optional[str] = None

class FolderContent(BaseModel):
    items: List[FolderItem]
    total: int
    page: int
    page_size: int 