from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Header
from sqlalchemy.orm import Session
import os
import json
from pathlib import Path
import cv2
import base64
import numpy as np
from datetime import datetime, timedelta
from app import crud, models, schemas
from app.api import deps
from app.schemas.video_source import VideoSourceCreate, VideoSource, SourceType
from app.schemas.folder_content import FolderContent, FolderItem
import os.path
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from app.services.transcription import TranscriptionService
from app.core.config import settings
from app.schemas.transcription import (
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionStatus
)
from app.models.transcription import TranscriptionTask
import urllib.parse
import logging
from fastapi.responses import FileResponse, StreamingResponse
import aiofiles
from app.models.video_source import VideoTranscript

# 创建 logger
logger = logging.getLogger(__name__)

router = APIRouter()
# 创建线程池
thread_pool = ThreadPoolExecutor(max_workers=2)

# 创建一个视频文件服务实例
video_files = StaticFiles(directory=None)

transcription_service = TranscriptionService()

def get_thumbnail_root(source_path: str) -> Path:
    """获取缩略图根目录（隐藏文件夹）"""
    source_dir = Path(source_path)
    return source_dir / ".thumbnails"

def get_relative_path(file_path: str, base_path: str) -> str:
    """获取相对路径"""
    return str(Path(file_path).relative_to(base_path))

def ensure_thumbnail_dir(thumbnail_path: Path) -> None:
    """确保缩略图目录存在"""
    thumbnail_dir = thumbnail_path.parent
    if not thumbnail_dir.exists():
        thumbnail_dir.mkdir(parents=True, exist_ok=True)

def clean_orphaned_thumbnails(base_path: str) -> None:
    """清理没有对应视频文件的缩略图"""
    try:
        source_path = Path(base_path)
        thumbnail_root = get_thumbnail_root(base_path)
        
        if not thumbnail_root.exists():
            return
        
        # 遍历缩略图目录
        for root, _, files in os.walk(thumbnail_root):
            for file in files:
                if file.endswith('.jpg'):
                    thumb_path = Path(root) / file
                    # 计算对应的视频文件路径
                    rel_path = Path(root).relative_to(thumbnail_root)
                    video_name = Path(file).stem
                    
                    # 检查所有能的视频格式
                    video_exists = any(
                        (source_path / rel_path / f"{video_name}{ext}").exists()
                        for ext in ['.mp4', '.avi', '.mkv', '.mov']
                    )
                    
                    if not video_exists:
                        try:
                            thumb_path.unlink()
                            print(f"Removed orphaned thumbnail: {thumb_path}")
                        except OSError as e:
                            print(f"Error removing thumbnail {thumb_path}: {e}")
    except Exception as e:
        print(f"Error cleaning orphaned thumbnails: {e}")

def generate_thumbnail(file_path: str, thumbnail_path: str) -> None:
    """在后台生成视频缩略图"""
    try:
        # 如果视频文件不存在，不生成缩略图
        if not os.path.exists(file_path):
            print(f"Video file not found: {file_path}")
            return

        if os.path.exists(thumbnail_path):
            return

        # 强制使用 FFMPEG 后端
        file_path_ffmpeg = f"ffmpeg:{file_path}"
        cap = cv2.VideoCapture(file_path_ffmpeg)

        if not cap.isOpened():
            print(f"Failed to open video: {file_path}")
            # 如果 FFMPEG 失败，尝试直接打开
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                return

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if frame_count == 0:
            print(f"Video has no frames: {file_path}")
            return
        
        target_frame = int(frame_count / 3)
        print(f"Seeking to frame {target_frame} of {frame_count} frames")
        
        # 尝试直接设置帧位置
        if not cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame):
            print(f"Failed to seek directly, using frame-by-frame method")
            # 如果直接设置失败，使用逐帧读取
            current_frame = 0
            while current_frame < target_frame:
                ret = cap.grab()
                if not ret:
                    break
                current_frame += 1
        
        ret, frame = cap.read()
        if not ret:
            print(f"Failed to read frame from video: {file_path}")
            return
        
        if ret:
            target_height = 280
            target_width = 200
            # 计算缩放比例，确保图片至少填满一个维度
            scale_w = target_width / frame.shape[1]
            scale_h = target_height / frame.shape[0]
            # 使用较大的缩放比例，确保图片填满高度
            scale = max(scale_w, scale_h)
            width = int(frame.shape[1] * scale)
            height = int(frame.shape[0] * scale)
            thumbnail = cv2.resize(frame, (width, height))
            
            # 创建背景
            background = np.zeros((target_height, target_width, 3), dtype=np.uint8)
            # 计算居中位置，可能会有裁剪
            y_offset = 0
            x_offset = max((target_width - width) // 2, 0)
            # 如果片宽度超出，则裁剪中间部分
            if width > target_width:
                start_x = (width - target_width) // 2
                thumbnail = thumbnail[:, start_x:start_x + target_width]
                width = target_width
                x_offset = 0
            
            # 将缩略图放在背景中央
            background[y_offset:y_offset+height, x_offset:x_offset+width] = thumbnail
            
            print(f"Saving thumbnail to: {thumbnail_path}")
            cv2.imwrite(thumbnail_path, background)
            print(f"Thumbnail saved successfully")
        
        cap.release()
    except Exception as e:
        import traceback
        print(f"Error generating thumbnail for {file_path}:")
        print(traceback.format_exc())
        # 如果生成缩略图失败，确保不会留下损坏的文件
        if os.path.exists(thumbnail_path):
            try:
                os.remove(thumbnail_path)
            except:
                pass

def get_video_info(file_path: str, source_path: str, background_tasks: BackgroundTasks) -> tuple[int, str]:
    """获取视频时长和缩略图"""
    try:
        # 计算缩略图路径
        video_path = Path(file_path)
        rel_path = get_relative_path(file_path, source_path)
        thumbnail_root = get_thumbnail_root(source_path)
        thumbnail_path = thumbnail_root / rel_path
        thumbnail_path = thumbnail_path.with_suffix('.jpg')
        
        # 如果缩略图存在，直接返回
        if os.path.exists(thumbnail_path):
            with open(thumbnail_path, 'rb') as f:
                thumbnail_data = base64.b64encode(f.read()).decode('utf-8')
                return None, f"data:image/jpeg;base64,{thumbnail_data}"
        
        # 尝试不同的方式打开视频
        cap = None
        methods = [
            lambda: cv2.VideoCapture(file_path),  # 直接打开
            lambda: cv2.VideoCapture(f"ffmpeg:{file_path}"),  # FFMPEG
            lambda: cv2.VideoCapture(f"gst-launch-1.0 filesrc location={file_path} ! decodebin ! videoconvert ! appsink")  # GStreamer
        ]

        for method in methods:
            try:
                cap = method()
                if cap and cap.isOpened():
                    break
            except Exception as e:
                logger.warning(f"Failed to open video with method: {str(e)}")
                if cap:
                    cap.release()

        if not cap or not cap.isOpened():
            logger.error(f"Failed to open video: {file_path}")
            return None, None

        # 获取视频信息
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        
        if fps <= 0 or frame_count <= 0:
            # 尝试使用 ffprobe 获取信息
            try:
                import subprocess
                cmd = [
                    'ffprobe', 
                    '-v', 'error',
                    '-select_streams', 'v:0',
                    '-show_entries', 'stream=duration,r_frame_rate',
                    '-of', 'json',
                    file_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0:
                    import json
                    data = json.loads(result.stdout)
                    stream = data['streams'][0]
                    num, den = map(int, stream['r_frame_rate'].split('/'))
                    fps = num / den
                    duration = float(stream['duration'])
                    frame_count = int(duration * fps)
            except Exception as e:
                logger.error(f"Failed to get video info with ffprobe: {str(e)}")
                return None, None

        print(f"Video info - FPS: {fps}, Frames: {frame_count}")
        cap.release()

        # 直接生成缩略图
        print(f"Generating thumbnail for: {file_path}")
        ensure_thumbnail_dir(thumbnail_path)
        generate_thumbnail(file_path, str(thumbnail_path))
        
        # 如果缩略图生成成功，返回缩略图数据
        if os.path.exists(thumbnail_path):
            with open(thumbnail_path, 'rb') as f:
                thumbnail_data = base64.b64encode(f.read()).decode('utf-8')
                return duration, f"data:image/jpeg;base64,{thumbnail_data}"
        
        return duration, None
    except Exception as e:
        import traceback
        print(f"Error processing video {file_path}:")
        print(traceback.format_exc())
        return None, None

@router.get("/sources/")
async def get_sources(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """获取视频源列表"""
    try:
        sources = db.query(models.VideoSource).filter(
            models.VideoSource.user_id == current_user.id
        ).all()
        return sources
    except Exception as e:
        logger.error(f"Error getting sources: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sources/", response_model=schemas.VideoSource)
def create_video_source(
    source: schemas.VideoSourceCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """创建新的视频来源"""
    # 验证本地路径
    if source.type == SourceType.LOCAL:
        path = source.path.replace('\\', '/')
        if not os.path.exists(path):
            raise HTTPException(
                status_code=400,
                detail="指定的本地路径不存在"
            )
        if not os.path.isdir(path):
            raise HTTPException(
                status_code=400,
                detail="指定的路径不是文件夹"
            )
    
    # 检查是否已存在相同路径的来源
    existing_source = db.query(models.VideoSource).filter(
        models.VideoSource.path == source.path,
        models.VideoSource.user_id == current_user.id
    ).first()
    
    if existing_source:
        raise HTTPException(
            status_code=409,
            detail="已存在相同路径的视频来源"
        )
    
    try:
        db_source = models.VideoSource(
            name=source.name,
            type=source.type,
            path=source.path,
            config=source.config or "{}",
            user_id=current_user.id
        )
        
        db.add(db_source)
        db.commit()
        db.refresh(db_source)
        return db_source
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"创建视频来源失败: {str(e)}"
        )

@router.delete("/sources/{source_id}")
def delete_video_source(
    source_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """删除视频来源"""
    source = db.query(models.VideoSource).filter(
        models.VideoSource.id == source_id,
        models.VideoSource.user_id == current_user.id
    ).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    db.delete(source)
    db.commit()
    return {"message": "Source deleted successfully"} 

@router.get("/sources/{source_id}/contents")
async def get_folder_contents(
    source_id: int,
    path: str,
    page: int = 1,
    page_size: int = 50,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """获取文件夹内容"""
    try:
        # 获取视频源
        source = db.query(models.VideoSource).filter(
            models.VideoSource.id == source_id,
            models.VideoSource.user_id == current_user.id
        ).first()
        
        if not source:
            raise HTTPException(status_code=404, detail="视频来源不存在")

        # 规范化路径
        folder_path = Path(path)
        if not folder_path.exists():
            raise HTTPException(status_code=404, detail="文件夹不存在")

        # 获取文件夹内容
        items = []
        for item in folder_path.iterdir():
            if item.is_file() and item.suffix.lower() in ['.mp4', '.mkv', '.avi']:
                # 获取视频信息
                duration, thumbnail = get_video_info(str(item), str(folder_path), background_tasks)
                
                items.append({
                    "name": item.name,
                    "path": str(item),
                    "type": "video",
                    "size": item.stat().st_size,
                    "modified_time": datetime.fromtimestamp(item.stat().st_mtime),
                    "duration": duration,
                    "thumbnail": thumbnail
                })
            elif item.is_dir():
                items.append({
                    "name": item.name,
                    "path": str(item),
                    "type": "folder",
                    "size": 0,  # 目录大小计算可能比较耗时，这里暂时返回0
                    "modified_time": datetime.fromtimestamp(item.stat().st_mtime)
                })

        # 计算页
        total = len(items)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = items[start_idx:end_idx]

        return {
            "items": paginated_items,
            "total": total,
            "page": page,
            "page_size": page_size
        }

    except Exception as e:
        logger.error(f"Error getting folder contents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stream/{source_id}/{relative_path:path}")
async def stream_video(
    source_id: int,
    relative_path: str,
    range: str = Header(None),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """流式传输视频文件"""
    try:
        # 获取视频来源
        source = db.query(models.VideoSource).filter(
            models.VideoSource.id == source_id,
            models.VideoSource.user_id == current_user.id
        ).first()
        
        if not source:
            raise HTTPException(status_code=404, detail="视频来源不存在")

        # URL解码相对路径
        relative_path = urllib.parse.unquote(relative_path)
        
        # 构建完整路径
        video_path = Path(source.path) / relative_path
        
        # 验证路径安全性
        try:
            video_path.relative_to(Path(source.path))
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的文件路径")

        if not video_path.exists():
            raise HTTPException(status_code=404, detail="视频文件不存在")

        file_size = os.path.getsize(str(video_path))
        
        # 处理范围请求
        start = 0
        end = file_size - 1
        
        if range:
            start, end = range.replace("bytes=", "").split("-")
            start = int(start)
            end = int(end) if end else file_size - 1

        # 计算内容长度
        content_length = end - start + 1

        # 定义流式响应的生成器
        async def video_stream():
            async with aiofiles.open(str(video_path), mode='rb') as f:
                await f.seek(start)
                remaining = content_length
                chunk_size = 1024 * 1024  # 1MB chunks
                
                while remaining > 0:
                    chunk = await f.read(min(chunk_size, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        headers = {
            'Content-Range': f'bytes {start}-{end}/{file_size}',
            'Accept-Ranges': 'bytes',
            'Content-Length': str(content_length),
            'Content-Type': 'video/mp4',
        }

        return StreamingResponse(
            video_stream(),
            headers=headers,
            status_code=206 if range else 200,
            media_type='video/mp4'
        )

    except Exception as e:
        logger.error(f"Error streaming video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/related/{source_id}/{relative_path:path}")
async def get_related_videos(
    source_id: int,
    relative_path: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """获取相关视频"""
    try:
        source = db.query(models.VideoSource).filter(
            models.VideoSource.id == source_id,
            models.VideoSource.user_id == current_user.id
        ).first()
        
        if not source:
            raise HTTPException(status_code=404, detail="视频来源不存在")

        # URL解码相对路径
        relative_path = urllib.parse.unquote(relative_path)
        video_path = Path(source.path) / relative_path
        
        if not video_path.exists():
            raise HTTPException(status_code=404, detail="视频文件不存在")

        # 获取同目录下的其他视频
        video_dir = video_path.parent
        related_videos = []
        
        for file in video_dir.glob("*.mp4"):
            if file != video_path:
                related_videos.append({
                    "name": file.name,
                    "path": str(file.relative_to(Path(source.path))),
                    "thumbnail": None  # 可以在这里添加缩略图逻辑
                })

        return related_videos[:10]  # 限制返回数量

    except Exception as e:
        logger.error(f"Error getting related videos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcript", response_model=schemas.TranscriptionResponse)
async def create_transcript(
    request: schemas.TranscriptionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    创建视频转录任务
    """
    try:
        # 获取视频源
        source = db.query(models.VideoSource).filter(
            models.VideoSource.id == request.sourceId,
            models.VideoSource.user_id == current_user.id
        ).first()
        
        if not source:
            raise HTTPException(status_code=404, detail="视频源不存在")

        # 构建完整的视频路径
        video_path = Path(source.path) / request.relativePath
        if not video_path.exists():
            raise HTTPException(status_code=404, detail="视频文件不存在")

        # 创建转录任务
        task = models.TranscriptionTask(
            video_path=str(video_path),
            user_id=current_user.id,
            status="pending"
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # 在后台开始转录任务
        background_tasks.add_task(
            transcription_service.process_video,
            str(video_path),
            task.id,
            db
        )

        return {
            "taskId": task.id,
            "status": "processing",
            "message": "转录任务已创建"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transcript/{task_id}", response_model=schemas.TranscriptionStatus)
async def get_transcript_status(
    task_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    获取转录任务状态
    """
    task = db.query(models.TranscriptionTask).filter(
        models.TranscriptionTask.id == task_id,
        models.TranscriptionTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="转录任务不存在")

    return {
        "taskId": task.id,
        "status": task.status,
        "text": task.text if task.status == "success" else None,
        "segments": task.segments if task.status == "success" else [],
        "error": task.error if task.status == "error" else None,
        "progress": task.progress
    } 

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_video(
    request: TranscriptionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """开始视频转录任务"""
    try:
        # 获取视频来源
        source = db.query(models.VideoSource).filter(
            models.VideoSource.id == request.sourceId,
            models.VideoSource.user_id == current_user.id
        ).first()
        
        if not source:
            raise HTTPException(status_code=404, detail="视频来源不存在")

        # 构建完整路径
        video_path = Path(source.path) / request.relativePath
        
        # 验证路径安全性
        try:
            video_path.relative_to(Path(source.path))
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的文件路径")

        if not video_path.exists():
            raise HTTPException(status_code=404, detail="视频文件不存在")

        # 创建转录任务
        task = TranscriptionTask(
            user_id=current_user.id,
            status="pending",
            progress=0,
            video_path=request.relativePath,  # 保存相对路径
            language=request.language or "zh"  # 使用请求中的语言或默认值
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # 在后台启动转录任务
        background_tasks.add_task(
            transcription_service.process_video,
            task.id,
            str(video_path),  # 传递完整路径
            source.id,
            db
        )

        return TranscriptionResponse(
            taskId=task.id,
            status="processing",
            message="转录任务已开始"
        )

    except Exception as e:
        logger.error(f"Error starting transcription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/transcript/{task_id}", response_model=TranscriptionStatus)
async def get_transcription_status(
    task_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """获取转录任务状态"""
    try:
        task = db.query(models.TranscriptionTask).filter(
            models.TranscriptionTask.id == task_id,
            models.TranscriptionTask.user_id == current_user.id
        ).first()

        if not task:
            raise HTTPException(status_code=404, detail="转录任务不存在")

        return TranscriptionStatus(
            taskId=task.id,
            status=task.status,
            text=task.text if task.status == "success" else None,
            segments=task.segments if task.status == "success" else [],
            error=task.error if task.status == "error" else None,
            progress=task.progress
        )

    except Exception as e:
        logger.error(f"Error getting transcription status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 

@router.get("/transcript/exists/{source_id}/{video_path:path}")
async def check_transcript_exists(
    source_id: int,
    video_path: str,
    db: Session = Depends(deps.get_db)
):
    """检查是否存在转录记录"""
    try:
        # URL解码路径
        video_path = urllib.parse.unquote(video_path)
        
        # 查询转录记录
        transcript = db.query(VideoTranscript).filter(
            VideoTranscript.source_id == source_id,
            VideoTranscript.video_path == video_path
        ).first()
        
        if transcript:
            return {
                "status": "success",
                "text": transcript.text,
                "segments": transcript.segments,
                "progress": 100
            }
        return None
        
    except Exception as e:
        logger.error(f"Error checking transcript: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 