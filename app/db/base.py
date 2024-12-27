from app.db.base_class import Base  # noqa
from app.models.user import User  # noqa
from app.models.video_source import VideoSource  # noqa

# 确保所有模型都被导入，这样 Alembic 才能检测到它们
__all__ = ["Base", "User", "VideoSource"] 