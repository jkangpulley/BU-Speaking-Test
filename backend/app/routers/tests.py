import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Student, Question, Test, Response
from ..schemas import QuestionOut, TestOut
from ..auth import get_current_student

router = APIRouter(prefix="/api", tags=["tests"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/questions", response_model=list[QuestionOut])
def get_questions(db: Session = Depends(get_db)):
    return db.query(Question).order_by(Question.order_num).all()


@router.post("/tests/start", response_model=TestOut)
def start_test(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    # If there's already an in_progress test, return it
    existing = (
        db.query(Test)
        .filter(Test.student_id == student.id, Test.status == "in_progress")
        .first()
    )
    if existing:
        return existing

    # If student already completed a test, block re-take
    completed = (
        db.query(Test)
        .filter(Test.student_id == student.id, Test.status.in_(["completed", "scored"]))
        .first()
    )
    if completed:
        raise HTTPException(status_code=400, detail="이미 시험을 완료했습니다.")

    test = Test(student_id=student.id)
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


@router.get("/tests/{test_id}", response_model=TestOut)
def get_test(
    test_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    test = db.query(Test).filter(Test.id == test_id, Test.student_id == student.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test


@router.post("/tests/{test_id}/responses/{question_id}")
async def submit_response(
    test_id: int,
    question_id: int,
    transcript: str = Form(default=""),
    duration: float = Form(default=0.0),
    audio: UploadFile = File(default=None),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    test = db.query(Test).filter(Test.id == test_id, Test.student_id == student.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test.status != "in_progress":
        raise HTTPException(status_code=400, detail="Test is not in progress")

    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Remove existing response for this question (allow re-submission)
    db.query(Response).filter(
        Response.test_id == test_id, Response.question_id == question_id
    ).delete()

    # Save audio file
    audio_path = None
    if audio and audio.filename:
        ext = os.path.splitext(audio.filename)[1] or ".webm"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        content = await audio.read()
        with open(filepath, "wb") as f:
            f.write(content)
        audio_path = filename

    response = Response(
        test_id=test_id,
        question_id=question_id,
        transcript=transcript.strip() or None,
        duration_seconds=duration,
        audio_path=audio_path,
    )
    db.add(response)
    db.commit()
    return {"status": "ok", "response_id": response.id}


@router.post("/tests/{test_id}/complete")
def complete_test(
    test_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    test = db.query(Test).filter(Test.id == test_id, Test.student_id == student.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test.status != "in_progress":
        raise HTTPException(status_code=400, detail="Test is not in progress")

    test.status = "completed"
    test.completed_at = datetime.utcnow()
    db.commit()
    return {"status": "ok"}
