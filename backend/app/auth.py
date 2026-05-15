import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import Student, Admin

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        result = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return result
    except JWTError as e:
        print(f"[DEBUG] JWT 오류: {e}")
        print(f"[DEBUG] SECRET_KEY: {SECRET_KEY}")
        print(f"[DEBUG] Token 앞 20자: {token[:20]}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Student:
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    student = db.query(Student).filter(Student.id == int(payload["sub"])).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Admin:
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    admin = db.query(Admin).filter(Admin.id == int(payload["sub"])).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin
