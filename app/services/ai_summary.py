from transformers import pipeline
import whisper

class VideoSummaryService:
    def __init__(self):
        self.transcriber = whisper.load_model("base")
        self.summarizer = pipeline("summarization")
    
    async def process_video(self, video_path: str):
        # 1. 提取音频
        # 2. 语音转文字
        # 3. 生成摘要
        # 4. 返回结果
        pass 