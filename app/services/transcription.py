import os
# 设置环境变量以解决 OpenMP 冲突
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from faster_whisper import WhisperModel
import torch
from pathlib import Path
from sqlalchemy.orm import Session
import logging
import warnings
import time
from app.models.transcription import TranscriptionTask
from app.models.video_source import VideoTranscript

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        try:
            # 检查 CUDA 是否可用
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.compute_type = "float16" if self.device == "cuda" else "int8"
            
            if self.device == "cuda":
                # 获取 GPU 信息
                gpu_id = torch.cuda.current_device()
                gpu_name = torch.cuda.get_device_name(gpu_id)
                gpu_memory = torch.cuda.get_device_properties(gpu_id).total_memory / 1024**3
                logger.info(f"Using GPU {gpu_id}: {gpu_name} ({gpu_memory:.1f}GB)")
            else:
                logger.warning("No CUDA device available! Transcription will be slow on CPU.")

            # 加载模型
            model_name = "base"
            logger.info(f"Loading Whisper model '{model_name}' on {self.device}")
            
            # 设置 num_workers=1 以避免多线程问题
            self.model = WhisperModel(
                model_size_or_path=model_name,
                device=self.device,
                compute_type=self.compute_type,
                download_root="./models",
                num_workers=1,
                cpu_threads=4  # 限制CPU线程数
            )
            
            logger.info(f"Model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Error initializing transcription service: {str(e)}")
            raise

    async def process_video(self, task_id: int, video_path: str, source_id: int, db: Session):
        """处理视频转录任务"""
        task = None
        try:
            task = db.query(TranscriptionTask).get(task_id)
            if not task:
                raise ValueError(f"Task {task_id} not found")

            task.status = "processing"
            task.progress = 0
            db.commit()

            # 执行转录
            segments, info = self.model.transcribe(
                audio=video_path,
                language=task.language,  # 使用指定的语言
                task="transcribe",
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=500,
                    speech_pad_ms=400
                ),
                initial_prompt="这是一段视频的音频内容。",
                condition_on_previous_text=True,
                temperature=0.0
            )

            # 更新任务状态和结果
            segments_data = [
                {
                    "start": float(segment.start),
                    "end": float(segment.end),
                    "text": segment.text.strip()
                }
                for segment in segments
            ]
            
            task.status = "success"
            task.text = " ".join(segment.text for segment in segments)
            task.segments = segments_data
            task.progress = 100
            db.commit()
            
            # 保存转录结果到 VideoTranscript
            transcript = VideoTranscript(
                source_id=source_id,
                video_path=task.video_path,  # 使用相对路径
                text=task.text,
                segments=segments_data
            )
            db.add(transcript)
            db.commit()

        except Exception as e:
            logger.error(f"Error in transcription task {task_id}: {str(e)}")
            if task:
                task.status = "error"
                task.error = str(e)
                db.commit()
            raise

    def _update_progress(self, task_id: int, progress: float, db: Session):
        """更新转录进度"""
        try:
            task = db.query(TranscriptionTask).get(task_id)
            if task and task.status == "processing":
                task.progress = min(int(progress * 100), 99)
                db.commit()
                logger.debug(f"Updated progress for task {task_id}: {task.progress}%")
        except Exception as e:
            logger.error(f"Error updating progress for task {task_id}: {str(e)}") 