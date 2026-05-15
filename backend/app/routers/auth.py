from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Student, Admin
from ..schemas import LoginRequest, TokenResponse
from ..auth import verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    # Try admin first
    admin = db.query(Admin).filter(Admin.username == req.username).first()
    if admin and verify_password(req.password, admin.password_hash):
        token = create_token({"sub": admin.id, "role": "admin"})
        return TokenResponse(access_token=token, role="admin", name=admin.username)

    # Try student
    student = db.query(Student).filter(Student.username == req.username).first()
    if student and verify_password(req.password, student.password_hash):
        token = create_token({"sub": student.id, "role": "student"})
        return TokenResponse(access_token=token, role="student", name=student.name)

    raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
