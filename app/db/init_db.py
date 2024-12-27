from sqlalchemy.orm import Session

from app.crud import crud_user
from app.schemas.user import UserCreate
from app.core.config import settings
from app.db import base  # noqa: F401

def init_db(db: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next line
    # Base.metadata.create_all(bind=engine)

    # 创建测试用户
    user = crud_user.get_by_email(db, email="test@example.com")
    if not user:
        user_in = UserCreate(
            email="test@example.com",
            password="test123",
            username="testuser",
            phone="13800000000"
        )
        crud_user.create(db, obj_in=user_in) 