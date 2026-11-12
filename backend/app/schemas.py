from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    full_name: str

class EventBase(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str = ""
    start_at: datetime
    end_at: datetime
    duration_minutes: int = Field(gt=0, le=1440)
    priority: int = Field(default=3, ge=1, le=5)
    is_fixed: bool = False
    resource: str = Field(default="personal", max_length=120)
    window_start: datetime | None = None
    window_end: datetime | None = None

    @model_validator(mode="after")
    def validate_times(self):
        if self.end_at <= self.start_at:
            raise ValueError("end_at must be later than start_at")
        if self.window_start and self.window_end and self.window_end <= self.window_start:
            raise ValueError("window_end must be later than window_start")
        if self.is_fixed and self.duration_minutes != int((self.end_at-self.start_at).total_seconds() // 60):
            raise ValueError("For fixed events, duration_minutes must match start/end.")
        return self

class EventCreate(EventBase):
    pass

class EventUpdate(EventBase):
    pass

class EventOut(EventBase):
    id: int
    class Config:
        from_attributes = True

class OptimizeRequest(BaseModel):
    date: str
    max_alternatives: int = Field(default=3, ge=1, le=5)
    slot_minutes: int = Field(default=15, ge=5, le=60)
