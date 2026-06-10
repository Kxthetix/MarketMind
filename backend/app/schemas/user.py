import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: uuid.UUID
    role: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str

class OTPRequest(UserBase):
    pass

class OTPVerify(UserBase):
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")

class PasswordResetRequest(UserBase):
    pass

class PasswordResetConfirm(UserBase):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=6)
