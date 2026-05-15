from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str           # "student" or "admin"
    name: Optional[str] = None


class QuestionOut(BaseModel):
    id: int
    order_num: int
    text: str
    hint: Optional[str]
    difficulty: int
    prep_seconds: int
    max_seconds: int

    class Config:
        from_attributes = True


class ResponseScore(BaseModel):
    task_completion: Optional[float]
    fluency: Optional[float]
    vocabulary: Optional[float]
    grammar: Optional[float]
    communication: Optional[float]
    total_score: Optional[float]
    feedback: Optional[str]


class ResponseOut(BaseModel):
    id: int
    question_id: int
    transcript: Optional[str]
    duration_seconds: Optional[float]
    audio_path: Optional[str]
    task_completion: Optional[float]
    fluency: Optional[float]
    vocabulary: Optional[float]
    grammar: Optional[float]
    communication: Optional[float]
    total_score: Optional[float]
    feedback: Optional[str]
    scored_at: Optional[datetime]

    class Config:
        from_attributes = True


class TestOut(BaseModel):
    id: int
    student_id: int
    started_at: datetime
    completed_at: Optional[datetime]
    total_score: Optional[float]
    level: Optional[str]
    status: str
    responses: List[ResponseOut] = []

    class Config:
        from_attributes = True


class StudentCreate(BaseModel):
    username: str
    password: str
    name: str
    country: str
    age_group: str
    grade: Optional[str] = None


class StudentOut(BaseModel):
    id: int
    username: str
    name: str
    country: str
    age_group: str
    grade: Optional[str]
    created_at: datetime
    latest_test_status: Optional[str] = None
    total_score: Optional[float] = None
    level: Optional[str] = None
    class_name: Optional[str] = None

    class Config:
        from_attributes = True


class StudentDetailOut(BaseModel):
    id: int
    username: str
    name: str
    country: str
    age_group: str
    grade: Optional[str]
    created_at: datetime
    tests: List[TestOut] = []
    class_name: Optional[str] = None

    class Config:
        from_attributes = True


class ClassOut(BaseModel):
    id: int
    name: str
    level: str
    capacity: int
    student_count: int = 0
    students: List[dict] = []

    class Config:
        from_attributes = True


class PlacementResult(BaseModel):
    classes_created: int
    students_assigned: int
    summary: List[dict]


class StatsOut(BaseModel):
    total_students: int
    completed_tests: int
    pending_tests: int
    scored_tests: int
    level_distribution: dict
    country_distribution: dict
    assigned_students: int
