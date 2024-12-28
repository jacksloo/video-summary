from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse

router = APIRouter()

@router.get("/", response_model=List[DocumentResponse])
def get_documents(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """获取文档列表"""
    return db.query(Document).filter(Document.user_id == current_user.id).all()

@router.post("/", response_model=DocumentResponse)
def create_document(
    document: DocumentCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """创建新文档"""
    db_document = Document(**document.dict(), user_id=current_user.id)
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    document: DocumentUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """更新文档"""
    db_document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    for key, value in document.dict(exclude_unset=True).items():
        setattr(db_document, key, value)
    
    db.commit()
    db.refresh(db_document)
    return db_document

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """删除文档"""
    db_document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db.delete(db_document)
    db.commit()
    return {"message": "Document deleted"} 