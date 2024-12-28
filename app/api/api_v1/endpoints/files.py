from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
import os
import platform
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.file import FileResponse, FolderResponse
from pathlib import Path

router = APIRouter()  # 这个变量名需要与 __init__.py 中的导入匹配

@router.get("/default-path", response_model=str)
def get_default_path(
    current_user: User = Depends(get_current_user)
) -> str:
    """获取默认文件路径"""
    default_path = str(Path.home())
    return default_path

@router.get("/folders", response_model=List[FolderResponse])
def list_folders(
    path: str = Query("", description="要列出内容的文件夹路径"),
    show_hidden: bool = Query(False, description="是否显示隐藏文件"),
    current_user: User = Depends(get_current_user)
) -> List[FolderResponse]:
    """列出指定路径下的文件夹和文件"""
    try:
        # 如果路径为空，使用默认路径
        if not path:
            path = str(Path.home())

        # 获取目录内容
        items = []
        with os.scandir(path) as entries:
            for entry in entries:
                # 跳过隐藏文件（除非指定显示）
                if not show_hidden and entry.name.startswith('.'):
                    continue
                
                try:
                    stats = entry.stat()
                    items.append(FolderResponse(
                        name=entry.name,
                        path=str(entry.path),
                        is_dir=entry.is_dir(),
                        size=stats.st_size if not entry.is_dir() else None,
                        modified_time=stats.st_mtime
                    ))
                except (PermissionError, OSError):
                    continue

        return items
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e)) 