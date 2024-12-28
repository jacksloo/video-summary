import logging
from app.db.session import SessionLocal
from app.db.init_db import init_db
from app.models.dictionary import Dictionary
from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init() -> None:
    db = SessionLocal()
    init_db(db)

def init_dictionary_data(db: Session):
    # 视频相关的初始数据
    video_data = [
        # 画面比例
        {
            "type": "video.aspect_ratio",
            "key": "16:9",
            "value": "16:9",
            "description": "标准宽屏比例",
        },
        {
            "type": "video.aspect_ratio",
            "key": "4:3",
            "value": "4:3",
            "description": "传统电视比例",
        },
        {
            "type": "video.aspect_ratio",
            "key": "21:9",
            "value": "21:9",
            "description": "超宽屏比例",
        },
        # 分辨率
        {
            "type": "video.resolution",
            "key": "4K",
            "value": "3840x2160",
            "description": "超高清分辨率",
        },
        {
            "type": "video.resolution",
            "key": "2K",
            "value": "2560x1440",
            "description": "2K分辨率",
        },
        {
            "type": "video.resolution",
            "key": "1080p",
            "value": "1920x1080",
            "description": "全高清分辨率",
        },
        # 编码格式
        {
            "type": "video.codec",
            "key": "H.264",
            "value": "H.264/AVC",
            "description": "最常用的视频编码格式",
        },
        {
            "type": "video.codec",
            "key": "H.265",
            "value": "H.265/HEVC",
            "description": "高效视频编码",
        },
        # 帧率
        {
            "type": "video.fps",
            "key": "24fps",
            "value": "24",
            "description": "电影标准帧率",
        },
        {
            "type": "video.fps",
            "key": "30fps",
            "value": "30",
            "description": "常用视频帧率",
        },
    ]

    # 音频相关的初始数据
    audio_data = [
        # 采样率
        {
            "type": "audio.sample_rate",
            "key": "44.1kHz",
            "value": "44100",
            "description": "CD音质采样率",
        },
        {
            "type": "audio.sample_rate",
            "key": "48kHz",
            "value": "48000",
            "description": "专业音频采样率",
        },
        # 比特率
        {
            "type": "audio.bitrate",
            "key": "320kbps",
            "value": "320",
            "description": "高质量音频比特率",
        },
        {
            "type": "audio.bitrate",
            "key": "128kbps",
            "value": "128",
            "description": "标准音频比特率",
        },
        # 声道
        {
            "type": "audio.channels",
            "key": "stereo",
            "value": "2",
            "description": "立体声",
        },
        {
            "type": "audio.channels",
            "key": "mono",
            "value": "1",
            "description": "单声道",
        },
    ]

    # 转录相关的初始数据
    transcription_data = [
        # 语言
        {
            "type": "transcription.language",
            "key": "zh",
            "value": "中文",
            "description": "中文转录",
        },
        {
            "type": "transcription.language",
            "key": "en",
            "value": "英文",
            "description": "英文转录",
        },
        # 模型
        {
            "type": "transcription.model",
            "key": "whisper-large",
            "value": "Whisper Large",
            "description": "高精度转录模型",
        },
        {
            "type": "transcription.model",
            "key": "whisper-medium",
            "value": "Whisper Medium",
            "description": "中等精度转录模型",
        },
    ]

    # 摘要相关的初始数据
    summary_data = [
        # 风格
        {
            "type": "summary.style",
            "key": "concise",
            "value": "简洁",
            "description": "简洁的摘要风格",
        },
        {
            "type": "summary.style",
            "key": "detailed",
            "value": "详细",
            "description": "详细的摘要风格",
        },
        # 长度
        {
            "type": "summary.length",
            "key": "short",
            "value": "100",
            "description": "简短摘要",
        },
        {
            "type": "summary.length",
            "key": "medium",
            "value": "300",
            "description": "中等长度摘要",
        },
        # 模型
        {
            "type": "summary.model",
            "key": "gpt-4",
            "value": "GPT-4",
            "description": "高级摘要模型",
        },
        {
            "type": "summary.model",
            "key": "gpt-3.5",
            "value": "GPT-3.5",
            "description": "标准摘要模型",
        },
    ]

    # 字幕相关的初始数据
    subtitle_data = [
        # 格式
        {
            "type": "subtitle.format",
            "key": "srt",
            "value": ".srt",
            "description": "SubRip字幕格式",
        },
        {
            "type": "subtitle.format",
            "key": "ass",
            "value": ".ass",
            "description": "高级字幕格式",
        },
        # 语言
        {
            "type": "subtitle.language",
            "key": "zh",
            "value": "中文",
            "description": "中文字幕",
        },
        {
            "type": "subtitle.language",
            "key": "en",
            "value": "英文",
            "description": "英文字幕",
        },
        # 字体
        {
            "type": "subtitle.font",
            "key": "microsoft-yahei",
            "value": "微软雅黑",
            "description": "默认中文字体",
        },
        {
            "type": "subtitle.font",
            "key": "arial",
            "value": "Arial",
            "description": "默认英文字体",
        },
    ]

    # 合并所有初始数据
    initial_data = (
        video_data +
        audio_data +
        transcription_data +
        summary_data +
        subtitle_data
    )

    # 插入数据库
    for item in initial_data:
        db_item = Dictionary(**item)
        db.add(db_item)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error initializing dictionary data: {e}")

def main() -> None:
    logger.info("Creating initial data")
    init()
    logger.info("Initial data created")

if __name__ == "__main__":
    main() 
    main() 