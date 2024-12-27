from typing import Optional
from pydantic import BaseModel, EmailStr

# 共享属性
class UserBase(BaseModel):
    username: str
    email: EmailStr
    phone: Optional[str] = None

# 创建用户时需要的属性
class UserCreate(UserBase):
    password: str

# 更新用户时可以更新的属性
class UserUpdate(UserBase):
    password: Optional[str] = None

# 数据库中存储的用户信息
class UserInDB(UserBase):
    id: int
    hashed_password: str

    class Config:
        from_attributes = True

# API 返回的用户信息
class User(UserBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True 