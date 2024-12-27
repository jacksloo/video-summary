from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
import os
import platform
import ctypes
from app.core.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from pathlib import Path
from app import models
from app.api import deps
import logging

logger = logging.getLogger(__name__)

class FileInfo(BaseModel):
    name: str
    path: str
    size: Optional[str] = None
    modified: Optional[float] = None
    created: Optional[float] = None

class FolderInfo(BaseModel):
    name: str
    path: str
    modified: Optional[float] = None
    created: Optional[float] = None
    subfolder_count: Optional[int] = None
    video_count: Optional[int] = None

class DriveInfo(BaseModel):
    name: str
    path: str
    type: str
    total: float
    free: float

class FolderResponse(BaseModel):
    current_path: str
    parent_path: Optional[str]
    folders: List[FolderInfo]
    drives: List[DriveInfo] = []
    special_folders: Dict[str, str] = {}

class PathRequest(BaseModel):
    path: str

class PathValidation(BaseModel):
    valid: bool

class PreviewResponse(BaseModel):
    files: List[FileInfo]

class DefaultPathResponse(BaseModel):
    path: str

router = APIRouter(tags=["files"])

def get_drive_info(drive_path: str) -> Dict:
    """获取驱动器信息"""
    try:
        if platform.system() == 'Windows':
            freeBytes = ctypes.c_ulonglong(0)
            totalBytes = ctypes.c_ulonglong(0)
            ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                ctypes.c_wchar_p(drive_path),
                None,
                ctypes.pointer(totalBytes),
                ctypes.pointer(freeBytes)
            )
            total_gb = round(totalBytes.value / (1024**3), 1)
            free_gb = round(freeBytes.value / (1024**3), 1)
            
            # 获取驱动器类型
            drive_type = ctypes.windll.kernel32.GetDriveTypeW(drive_path)
            type_map = {
                2: "可移动磁盘",
                3: "本地磁盘",
                4: "网络驱动器",
                5: "光盘驱动器",
                6: "RAM磁盘"
            }
            drive_type_name = type_map.get(drive_type, "未知类型")
            
            # 获取卷标
            try:
                import win32api
                volume_name = win32api.GetVolumeInformation(drive_path)[0]
            except:
                volume_name = ""

            return {
                "total": total_gb,
                "free": free_gb,
                "type": drive_type_name,
                "volume_name": volume_name
            }
    except:
        pass
    return {
        "total": 0,
        "free": 0,
        "type": "未知",
        "volume_name": ""
    }

def get_special_folders() -> Dict:
    """获取特殊文件夹路径"""
    if platform.system() == 'Windows':
        import winreg
        special_folders = {}
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                              r"Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders") as key:
                folders = {
                    "Desktop": "Desktop",
                    "Documents": "Personal",
                    "Downloads": "{374DE290-123F-4565-9164-39C4925E467B}",
                    "Pictures": "My Pictures",
                    "Music": "My Music",
                    "Videos": "My Video"
                }
                for name, reg_name in folders.items():
                    try:
                        path = winreg.QueryValueEx(key, reg_name)[0]
                        special_folders[name] = path
                    except:
                        continue
                return special_folders
        except:
            pass
    return {}

def get_default_user_folder() -> str:
    """获取系统默认用户文件夹路径"""
    try:
        if platform.system() == 'Windows':
            # Windows: 获取用户文件夹路径
            import os.path
            return os.path.expanduser('~')
        else:
            # Linux/Mac: 获取用户主目录
            from pwd import getpwuid
            from os import getuid
            return getpwuid(getuid()).pw_dir
    except:
        return ""

@router.get(
    "/folders",
    response_model=FolderResponse,
    summary="列出指定路径下的所有文件夹",
    tags=["files"],
    description="""
    获取指定路径下的所有文件夹列表。
    - 如果路径为空，将返回系统驱动器列表和默认用户文件夹
    - 返回文件夹的基本信息，包括名称、路径、修改时间等
    - 对于 Windows 系统，还会返回驱动器信息和特殊文件夹路径
    """
)
def get_folders(
    path: str = "",
    show_hidden: bool = False,
    current_user: User = Depends(get_current_user)
):
    """获取文件夹列表"""
    try:
        special_folders = get_special_folders()
        
        # 处理空路径
        if not path:
            default_path = get_default_user_folder()
            
            if platform.system() == 'Windows':
                drives = []
                for d in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                    drive_path = f"{d}:\\"
                    try:
                        if os.path.exists(drive_path):
                            drive_info = get_drive_info(drive_path)
                            if drive_info["type"] != "未知":
                                name = f"{d}:"
                                if drive_info["volume_name"]:
                                    name = f"{name} ({drive_info['volume_name']})"
                                drives.append({
                                    "name": name,
                                    "path": drive_path,
                                    "type": drive_info["type"],
                                    "total": drive_info["total"],
                                    "free": drive_info["free"]
                                })
                    except:
                        continue

                if default_path:
                    try:
                        folders = []
                        for item in os.listdir(default_path):
                            item_path = os.path.join(default_path, item)
                            if os.path.isdir(item_path):
                                try:
                                    item_stat = os.stat(item_path)
                                    folders.append({
                                        "name": item,
                                        "path": item_path,
                                        "modified": item_stat.st_mtime,
                                        "created": item_stat.st_ctime
                                    })
                                except:
                                    folders.append({
                                        "name": item,
                                        "path": item_path
                                    })
                    except:
                        folders = []
                else:
                    folders = []

                return {
                    "current_path": default_path or "",
                    "parent_path": None,
                    "folders": folders,
                    "drives": drives,
                    "special_folders": special_folders
                }
            else:  # Linux/Mac
                if default_path:
                    path = default_path
                else:
                    path = "/"

        # 获取完整路径
        full_path = os.path.abspath(path)
        
        # 安全检查：确保用户不能访问系统关键目录
        if platform.system() == 'Windows':
            system_dirs = ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)']
            if any(full_path.startswith(dir) for dir in system_dirs):
                raise HTTPException(status_code=403, detail="无权访问系统目录")
        
        # 获取父目录
        parent_path = os.path.dirname(full_path) if full_path != "/" else None
        
        # 列出所有文件夹
        folders = []
        try:
            for item in os.listdir(full_path):
                item_path = os.path.join(full_path, item)
                if os.path.isdir(item_path):
                    # 在 Windows 上，隐藏文件的属性是通过 GetFileAttributes 获取的
                    if platform.system() == "Windows":
                        try:
                            attrs = ctypes.windll.kernel32.GetFileAttributesW(item_path)
                            is_hidden = bool(attrs & 2)  # 2 是 FILE_ATTRIBUTE_HIDDEN
                            if is_hidden and not show_hidden:
                                continue
                        except:
                            pass
                    # 在 Unix 系统上，以点开头的文件被视为隐藏文件
                    elif not show_hidden and item.startswith('.'):
                        continue
                    
                    try:
                        stat = os.stat(item_path)
                        # 计算子文件夹数量
                        subfolder_count = sum(
                            1 for x in os.listdir(item_path) 
                            if os.path.isdir(os.path.join(item_path, x))
                        )
                        # 计算视频文件数量
                        video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'}
                        video_count = sum(
                            1 for x in os.listdir(item_path)
                            if os.path.isfile(os.path.join(item_path, x)) and
                            os.path.splitext(x)[1].lower() in video_extensions
                        )
                        folders.append({
                            "name": item,
                            "path": item_path,
                            "modified": stat.st_mtime,
                            "created": stat.st_ctime,
                            "subfolder_count": subfolder_count,
                            "video_count": video_count
                        })
                    except:
                        continue
        except PermissionError:
            # 忽略没有权限的文件夹
            pass

        return {
            "current_path": full_path,
            "parent_path": parent_path,
            "folders": sorted(folders, key=lambda x: x["name"].lower()),
            "drives": [],
            "special_folders": special_folders if not path else {}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 

@router.post(
    "/validate",
    response_model=PathValidation,
    summary="验证路径是否有效",
    description="""
    验证指定的路径是否:
    - 存在且可访问
    - 是一个有效的目录
    - 用户具有读取权限
    """
)
def validate_path(
    path_request: PathRequest,
    current_user: User = Depends(get_current_user)
):
    """验证路径是否有效且可访问"""
    try:
        path = os.path.abspath(path_request.path)
        print(f"Validating path: {path}")
        
        # 检查路径是否存在
        exists = os.path.exists(path)
        print(f"Path exists: {exists}")
        if not exists:
            return PathValidation(valid=False)
            
        # 检查是否是目录
        is_dir = os.path.isdir(path)
        print(f"Is directory: {is_dir}")
        if not is_dir:
            return PathValidation(valid=False)
            
        # 尝试访问目录
        try:
            os.listdir(path)
            print("Directory is accessible")
            return PathValidation(valid=True)
        except PermissionError:
            print("Permission denied")
            return PathValidation(valid=False)
        except Exception as e:
            print(f"Error accessing directory: {str(e)}")
            return PathValidation(valid=False)
            
    except Exception as e:
        print(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e)) 

@router.get(
    "/preview",
    response_model=PreviewResponse,
    summary="获取文件夹预览信息",
    description="""
    获取指定文件夹中的文件列表预览：
    - 返回文件的基本信息（名称、大小、修改时间等）
    - 仅返回文件，不包含子文件夹
    - 限制返回前100个文件
    - 自动格式化文件大小��示
    """
)
def preview_folder(
    path: str,
    current_user: User = Depends(get_current_user)
):
    """获取文件夹预览信息"""
    try:
        if not path:
            return {"files": []}

        full_path = os.path.abspath(path)
        
        # 安全检查
        if platform.system() == 'Windows':
            system_dirs = ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)']
            if any(full_path.startswith(dir) for dir in system_dirs):
                raise HTTPException(status_code=403, detail="无权访问系统目录")

        # 获取文件列表
        files = []
        try:
            for item in os.listdir(full_path):
                item_path = os.path.join(full_path, item)
                if os.path.isfile(item_path):
                    try:
                        stat = os.stat(item_path)
                        size = stat.st_size
                        # 格式化文件大小
                        if size < 1024:
                            size_str = f"{size} B"
                        elif size < 1024 * 1024:
                            size_str = f"{size/1024:.1f} KB"
                        else:
                            size_str = f"{size/(1024*1024):.1f} MB"

                        files.append({
                            "name": item,
                            "path": item_path,
                            "size": size_str,
                            "modified": stat.st_mtime,
                            "created": stat.st_ctime
                        })
                    except:
                        continue

            return {
                "files": sorted(files, key=lambda x: x["name"].lower())[:100]  # 限制显示前100个文件
            }
        except PermissionError:
            raise HTTPException(status_code=403, detail="无权访问此文件夹")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 

@router.get(
    "/default-path",
    response_model=DefaultPathResponse,
    summary="获取系统默认用户文件夹路径",
    description="""
    获取系统默认的用户文件夹路径：
    - Windows: 返回用户主目录 (C:\\Users\\Username)
    - Linux/Mac: 返回用户主目录 (/home/username)
    - 如果无法获取或路径无效，返回空字符串
    """
)
def get_default_path(
    current_user: User = Depends(get_current_user)
):
    """获取默认文件夹路径"""
    try:
        default_path = get_default_user_folder()
        if os.path.exists(default_path) and os.path.isdir(default_path):
            return {"path": default_path}
        return {"path": ""}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 

@router.get(
    "/tree",
    summary="获取文件夹树形结构",
    description="""
    获取指定路径下的文件夹树形结构：
    - 如果不提供路径，返回根目录（Windows 下返回所有盘符，Unix 系统返回根目录）
    - 如果提供路径，返回该路径下的所有子文件夹
    - 树节点包含标题、路径、子节点等信息
    """
)
async def get_file_tree(
    path: str = "",
    show_hidden: bool = False,
    current_user: User = Depends(get_current_user)
):
    """获取文件夹树形结构"""
    try:
        if not path:
            # 返回根目录结构
            drives = []
            if platform.system() == "Windows":
                bitmask = ctypes.windll.kernel32.GetLogicalDrives()
                for letter in range(65, 91):
                    if bitmask & (1 << (letter - 65)):
                        drive = chr(letter) + ":\\"
                        drives.append({
                            "title": f"{drive}",
                            "key": drive,
                            "children": [],
                            "isLeaf": False,
                        })
            else:
                # Unix-like 系统返回根目录
                drives = [{
                    "title": "/",
                    "key": "/",
                    "children": [],
                    "isLeaf": False,
                }]
            return drives
        
        # 获取指定路径的子文件夹
        path = os.path.abspath(path)
        if not os.path.exists(path):
            return []
            
        children = []
        try:
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                if os.path.isdir(item_path):
                    # 在 Windows 上，隐藏文件的属性是通过 GetFileAttributes 获取的
                    if platform.system() == "Windows":
                        try:
                            attrs = ctypes.windll.kernel32.GetFileAttributesW(item_path)
                            is_hidden = bool(attrs & 2)  # 2 是 FILE_ATTRIBUTE_HIDDEN
                            if is_hidden and not show_hidden:
                                continue
                        except:
                            pass
                    # 在 Unix 系统上，以点开头的文件被视为隐藏文件
                    elif not show_hidden and item.startswith('.'):
                        continue
                    
                    children.append({
                        "title": item,
                        "key": item_path,
                        "children": [],
                        "isLeaf": False,
                    })
        except PermissionError:
            raise HTTPException(status_code=403, detail="无权访问此文件夹")
            
        return children
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 

async def video_stream_generator(video_path: Path, start: int = 0, chunk_size: int = 10485760):
    """生成视频流"""
    with open(video_path, 'rb') as video:
        video.seek(start)
        while True:
            chunk = video.read(chunk_size)
            if not chunk:
                break
            yield chunk

@router.get("/videos/{source_id}/{relative_path:path}")
async def serve_video(
    request: Request,
    source_id: int,
    relative_path: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """提供视频文件访问服务"""
    logger.info(f"Request headers: {request.headers}")
    logger.info(f"Serving video - source_id: {source_id}, relative_path: {relative_path}")
    
    # 获取视频来源
    source = db.query(models.VideoSource).filter(
        models.VideoSource.id == source_id,
        models.VideoSource.user_id == current_user.id
    ).first()
    
    logger.info(f"Found source: {source and source.path}")
    
    if not source:
        raise HTTPException(status_code=404, detail="视频来源不存在")
    
    try:
        # 规范化路径
        source_path = Path(source.path)
        relative_path = relative_path.replace('\\', '/').lstrip('/')
        video_path = source_path / relative_path
        
        logger.info(f"Constructed video path: {video_path}")
        logger.info(f"Video path exists: {video_path.exists()}")
        
        # 验证路径
        video_path.relative_to(source_path)
        
        if not video_path.exists():
            raise HTTPException(status_code=404, detail="视频文件不存在")
        
        logger.info(f"Serving file: {video_path}")
        
        # 获取文件大小
        file_size = video_path.stat().st_size
        
        # 处理范围请求
        start = 0
        end = file_size - 1
        status_code = 200
        
        if "range" in request.headers:
            range_header = request.headers["range"]
            try:
                range_data = range_header.replace('bytes=', '').split('-')
                start = int(range_data[0])
                if range_data[1]:
                    end = int(range_data[1])
            except ValueError:
                raise HTTPException(status_code=400, detail="无效的范围请求")
            
            # 设置部分内容响应
            status_code = 206
        
        # 计算内容长度
        content_length = end - start + 1
        
        # 设置响应头
        headers = {
            'Content-Range': f'bytes {start}-{end}/{file_size}',
            'Accept-Ranges': 'bytes',
            'Content-Length': str(content_length),
            'Content-Type': 'video/mp4',
            'Content-Disposition': f'inline; filename="{video_path.name}"',
            'Cache-Control': 'public, max-age=31536000'
        }
        
        # 返回流式响应
        return StreamingResponse(
            video_stream_generator(video_path, start),
            status_code=status_code,
            headers=headers
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="无效的文件路径")
    except Exception as e:
        logger.error(f"Error serving video: {str(e)}")
        raise HTTPException(status_code=500, detail="服务器内部错误") 