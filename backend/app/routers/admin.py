import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db, SessionLocal
from ..models import Student, Test, Response, Question, Class, ClassAssignment, Admin
from ..schemas import StudentCreate, StudentOut, StudentDetailOut, StatsOut, ClassOut
from ..auth import get_current_admin, hash_password
from ..scoring import score_response, compute_overall_level
from ..placement import run_placement

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/test-scoring")
def test_scoring():
    """채점 엔진 상태 확인"""
    import os
    key = os.getenv("GROQ_API_KEY", "")
    all_keys = [k for k in os.environ.keys() if "GROQ" in k or "API" in k or "KEY" in k]
    if not key:
        return {"status": "error", "message": "GROQ_API_KEY not set", "env_keys_found": all_keys}
    try:
        from ..scoring import score_response
        result = score_response("What is your name?", "My name is Ivan.", 3.0)
        return {"status": "ok", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")


# ── Students ──────────────────────────────────────────────────────────────────

@router.get("/students", response_model=list[StudentOut])
def list_students(
    country: Optional[str] = None,
    status: Optional[str] = None,
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Student)
    if country:
        query = query.filter(Student.country == country)

    students = query.order_by(Student.name).all()
    result = []
    for s in students:
        latest_test = (
            db.query(Test)
            .filter(Test.student_id == s.id)
            .order_by(Test.started_at.desc())
            .first()
        )
        assignment = db.query(ClassAssignment).filter(ClassAssignment.student_id == s.id).first()
        class_name = None
        if assignment:
            cls = db.query(Class).filter(Class.id == assignment.class_id).first()
            class_name = cls.name if cls else None

        row = StudentOut(
            id=s.id,
            username=s.username,
            name=s.name,
            country=s.country,
            age_group=s.age_group,
            grade=s.grade,
            created_at=s.created_at,
            latest_test_status=latest_test.status if latest_test else None,
            total_score=latest_test.total_score if latest_test else None,
            level=latest_test.level if latest_test else None,
            class_name=class_name,
        )
        if status and row.latest_test_status != status:
            continue
        result.append(row)
    return result


@router.post("/students", response_model=StudentOut)
def create_student(
    data: StudentCreate,
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if db.query(Student).filter(Student.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    student = Student(
        username=data.username,
        password_hash=hash_password(data.password),
        name=data.name,
        country=data.country,
        age_group=data.age_group,
        grade=data.grade,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentOut(
        id=student.id,
        username=student.username,
        name=student.name,
        country=student.country,
        age_group=student.age_group,
        grade=student.grade,
        created_at=student.created_at,
    )


@router.post("/students/bulk")
def bulk_create_students(
    students: list[StudentCreate],
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    created, skipped = 0, 0
    for data in students:
        if db.query(Student).filter(Student.username == data.username).first():
            skipped += 1
            continue
        student = Student(
            username=data.username,
            password_hash=hash_password(data.password),
            name=data.name,
            country=data.country,
            age_group=data.age_group,
            grade=data.grade,
        )
        db.add(student)
        created += 1
    db.commit()
    return {"created": created, "skipped": skipped}


@router.get("/students/{student_id}", response_model=StudentDetailOut)
def get_student(
    student_id: int,
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    assignment = db.query(ClassAssignment).filter(ClassAssignment.student_id == student_id).first()
    class_name = None
    if assignment:
        cls = db.query(Class).filter(Class.id == assignment.class_id).first()
        class_name = cls.name if cls else None
    return StudentDetailOut(
        id=student.id,
        username=student.username,
        name=student.name,
        country=student.country,
        age_group=student.age_group,
        grade=student.grade,
        created_at=student.created_at,
        tests=student.tests,
        class_name=class_name,
    )


# ── Scoring ───────────────────────────────────────────────────────────────────

def _score_test(test_id: int, db: Session):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test or test.status not in ("completed", "scored"):
        return

    questions = {q.id: q for q in db.query(Question).all()}

    for response in test.responses:
        if response.scored_at:
            continue
        question = questions.get(response.question_id)
        if not question:
            continue

        try:
            result = score_response(
                question=question.text,
                transcript=response.transcript or "",
                duration=response.duration_seconds or 0.0,
            )
        except Exception as e:
            print(f"[SCORING ERROR] response {response.id}: {e}")
            continue

        response.task_completion = result["task_completion"]
        response.fluency = result["fluency"]
        response.vocabulary = result["vocabulary"]
        response.grammar = result["grammar"]
        response.communication = result["communication"]
        response.total_score = sum([
            result["task_completion"],
            result["fluency"],
            result["vocabulary"],
            result["grammar"],
            result["communication"],
        ])
        response.feedback = result.get("feedback", "")
        response.scored_at = datetime.utcnow()

    db.flush()

    total, level = compute_overall_level(test.responses)
    test.total_score = total
    test.level = level
    test.status = "scored"
    db.commit()


@router.post("/score/{test_id}")
def score_test(
    test_id: int,
    background_tasks: BackgroundTasks,
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    background_tasks.add_task(_score_test, test_id, SessionLocal())
    return {"status": "scoring_started"}


@router.post("/rescore/{test_id}")
def rescore_test(
    test_id: int,
    background_tasks: BackgroundTasks,
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """강제 재채점 — 기존 점수를 초기화하고 다시 채점"""
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    # 기존 점수 초기화
    for resp in test.responses:
        resp.scored_at = None
        resp.task_completion = None
        resp.fluency = None
        resp.vocabulary = None
        resp.grammar = None
        resp.communication = None
        resp.total_score = None
        resp.feedback = None
    test.status = "completed"
    test.total_score = None
    test.level = None
    db.commit()
    background_tasks.add_task(_score_test, test_id, SessionLocal())
    return {"status": "rescoring_started"}


@router.post("/score-all")
def score_all(
    background_tasks: BackgroundTasks,
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    tests = db.query(Test).filter(Test.status == "completed").all()
    new_db = SessionLocal()
    for test in tests:
        background_tasks.add_task(_score_test, test.id, new_db)
    return {"status": "scoring_started", "count": len(tests)}


# ── Placement ─────────────────────────────────────────────────────────────────

@router.post("/placement/run")
def run_placement_endpoint(
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    result = run_placement(db)
    return result


@router.get("/classes", response_model=list[ClassOut])
def list_classes(
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    classes = db.query(Class).order_by(Class.level, Class.name).all()
    result = []
    for cls in classes:
        assignments = (
            db.query(ClassAssignment, Student)
            .join(Student, Student.id == ClassAssignment.student_id)
            .filter(ClassAssignment.class_id == cls.id)
            .all()
        )
        students = []
        for asn, stu in assignments:
            test = (
                db.query(Test)
                .filter(Test.student_id == stu.id, Test.status == "scored")
                .first()
            )
            students.append({
                "id": stu.id,
                "name": stu.name,
                "country": stu.country,
                "age_group": stu.age_group,
                "score": test.total_score if test else None,
            })
        result.append(ClassOut(
            id=cls.id,
            name=cls.name,
            level=cls.level,
            capacity=cls.capacity,
            student_count=len(students),
            students=students,
        ))
    return result


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsOut)
def get_stats(
    _admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    total_students = db.query(Student).count()
    all_tests = db.query(Test).all()
    completed = sum(1 for t in all_tests if t.status == "completed")
    scored = sum(1 for t in all_tests if t.status == "scored")
    in_progress = sum(1 for t in all_tests if t.status == "in_progress")

    level_dist: dict = {}
    country_dist: dict = {}
    for t in all_tests:
        if t.status == "scored" and t.level:
            level_dist[t.level] = level_dist.get(t.level, 0) + 1
        student = db.query(Student).filter(Student.id == t.student_id).first()
        if student:
            country_dist[student.country] = country_dist.get(student.country, 0) + 1

    assigned = db.query(ClassAssignment).count()

    return StatsOut(
        total_students=total_students,
        completed_tests=completed,
        pending_tests=in_progress,
        scored_tests=scored,
        level_distribution=level_dist,
        country_distribution=country_dist,
        assigned_students=assigned,
    )


# ── Audio file ────────────────────────────────────────────────────────────────

@router.get("/audio/{filename}")
def get_audio(
    filename: str,
    _admin: Admin = Depends(get_current_admin),
):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(filepath, media_type="audio/webm")

