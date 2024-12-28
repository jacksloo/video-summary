from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.models.summary import VideoSummary, SummaryType
from app.models.video_source import VideoTranscript
from app.services.summary import SummaryService
from app.schemas.summary import SummaryCreate, SummaryResponse

router = APIRouter()
summary_service = SummaryService()

@router.post("/{transcript_id}", response_model=SummaryResponse)
async def create_summary(
    transcript_id: int,
    summary_type: SummaryType = Query(...),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """生成视频摘要"""
    # 检查转录记录是否存在
    transcript = db.query(VideoTranscript).filter(
        VideoTranscript.id == transcript_id
    ).first()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )

    # 检查是否已存在摘要
    existing_summary = db.query(VideoSummary).filter(
        VideoSummary.transcript_id == transcript_id,
        VideoSummary.summary_type == summary_type
    ).first()

    if existing_summary:
        return existing_summary

    try:
        summary = await summary_service.generate_summary(
            text=transcript.text,
            transcript_id=transcript_id,
            source_id=transcript.source_id,
            user_id=current_user.id,
            summary_type=summary_type,
            db=db
        )
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{transcript_id}", response_model=List[SummaryResponse])
def get_summaries(
    transcript_id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """获取视频的所有摘要"""
    # 首先检查转录记录是否存在
    transcript = db.query(VideoTranscript).filter(
        VideoTranscript.id == transcript_id
    ).first()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )

    summaries = db.query(VideoSummary).filter(
        VideoSummary.transcript_id == transcript_id
    ).all()
    
    return summaries 