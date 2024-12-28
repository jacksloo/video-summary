from typing import List, Optional, Dict
import logging
from sqlalchemy.orm import Session
from app.models.summary import VideoSummary, SummaryType
from app.models.video_source import VideoTranscript
from transformers import AutoTokenizer, MarianMTModel
import torch
import os
from dotenv import load_dotenv
import warnings

# 忽略特定的警告
warnings.filterwarnings("ignore", message=".*_pytree._register_pytree_node.*")
warnings.filterwarnings("ignore", message=".*resume_download.*")

logger = logging.getLogger(__name__)

# 加载环境变量
load_dotenv("app/.env")

class SummaryService:
    def __init__(self):
        # 设置模型缓存目录
        os.environ['TRANSFORMERS_CACHE'] = './models'
        os.environ['HF_HOME'] = './models'
        
        # 初始化模型
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        try:
            # 使用中文翻译模型
            model_name = "Helsinki-NLP/opus-mt-zh-en"
            
            # 分别加载tokenizer和模型
            self.tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                local_files_only=True  # 只使用本地文件
            )
            self.model = MarianMTModel.from_pretrained(
                model_name,
                local_files_only=True  # 只使用本地文件
            ).to(self.device)
            
        except Exception as e:
            logger.error(f"Error initializing models: {str(e)}")
            raise

    def generate_summary(
        self,
        text: str,
        max_length: int = 150,
        transcript_id: Optional[int] = None,
        source_id: Optional[int] = None,
        user_id: Optional[int] = None,
        summary_type: Optional[SummaryType] = None,
        db: Optional[Session] = None
    ) -> str:
        """生成文本摘要"""
        try:
            # 如果提供了数据库相关参数，则是视频摘要模式
            if all([transcript_id, source_id, user_id, summary_type, db]):
                return self._generate_video_summary(
                    transcript_id=transcript_id,
                    source_id=source_id,
                    user_id=user_id,
                    summary_type=summary_type,
                    db=db
                )
            
            # 否则是普通文本摘要模式
            inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
            inputs = inputs.to(self.device)
            
            outputs = self.model.generate(
                **inputs,
                max_length=max_length,
                num_beams=4,
                length_penalty=2.0,
                early_stopping=True
            )
            
            summary = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            raise

    def _generate_video_summary(
        self,
        transcript_id: int,
        source_id: int,
        user_id: int,
        summary_type: SummaryType,
        db: Session
    ) -> VideoSummary:
        """生成视频摘要"""
        # ... 原有的视频摘要生成逻辑 ...
        pass

    def _split_text(self, text: str, max_length: int = 1024) -> List[str]:
        """长文本分割成小段"""
        sentences = text.split("。")
        chunks = []
        current_chunk = []
        current_length = 0
        
        for sentence in sentences:
            sentence_length = len(sentence)
            if current_length + sentence_length > max_length:
                chunks.append("。".join(current_chunk) + "。")
                current_chunk = [sentence]
                current_length = sentence_length
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        
        if current_chunk:
            chunks.append("。".join(current_chunk) + "。")
        
        return chunks

    def _analyze_sentiment(self, text: str) -> Dict:
        """分析文本情感"""
        chunks = self._split_text(text, max_length=512)
        sentiments = []
        for chunk in chunks:
            result = self.sentiment_analyzer(chunk)
            sentiments.extend(result)
        
        # 统计情感分布
        positive_count = sum(1 for s in sentiments if s['label'] == 'positive')
        total_count = len(sentiments)
        
        return {
            "positive_ratio": positive_count / total_count if total_count > 0 else 0,
            "negative_ratio": 1 - (positive_count / total_count if total_count > 0 else 0),
            "details": sentiments
        }

    def _extract_topics(self, text: str) -> List[str]:
        """提取主题"""
        # TODO: 实现主题提取
        return ["主题1", "主题2"]

    def _generate_key_points(self, text: str) -> List[str]:
        """生成关键点"""
        # TODO: 实现关键点提取
        return ["关键点1", "关键点2"]

    async def generate_summary(
        self,
        transcript_id: int,
        source_id: Optional[int],
        user_id: int,
        summary_type: SummaryType,
        db: Session
    ) -> Optional[VideoSummary]:
        """生成视频摘要"""
        try:
            # 获取转录文本
            transcript = db.query(VideoTranscript).filter(
                VideoTranscript.id == transcript_id
            ).first()
            
            if not transcript or not transcript.text:
                raise ValueError("No transcript text available")

            # 创建摘要记录
            summary = VideoSummary(
                transcript_id=transcript_id,
                source_id=source_id or transcript.source_id,  # 从转录记录中获取
                user_id=user_id,
                title=transcript.title,
                summary_type=summary_type,
                status="processing"
            )
            
            db.add(summary)
            db.commit()
            db.refresh(summary)

            try:
                # 分段处理长文本
                text_chunks = self._split_text(transcript.text)
                
                # 生成摘要
                summaries = []
                for chunk in text_chunks:
                    result = self.summarizer(chunk, max_length=150, min_length=30)
                    summaries.extend(result)
                
                # 合并摘要
                final_summary = " ".join(s["summary_text"] for s in summaries)
                
                # 提取关键点
                key_points = self._generate_key_points(transcript.text)
                
                # 提取主题
                topics = self._extract_topics(transcript.text)
                
                # 情感分析
                sentiment = self._analyze_sentiment(transcript.text)
                
                # 更新摘要记录
                summary.summary = final_summary
                summary.key_points = key_points
                summary.topics = topics
                summary.sentiment = sentiment
                summary.status = "success"
                db.commit()
                db.refresh(summary)

            except Exception as e:
                summary.status = "error"
                summary.error = str(e)
                db.commit()
                raise

            return summary

        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            db.rollback()
            raise 