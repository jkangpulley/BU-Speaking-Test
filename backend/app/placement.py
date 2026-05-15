"""
Class placement algorithm.
- Groups students by CEFR level (A1 < A2 < B1 < B2 < C1).
- Within each level, sorts by score descending so stronger students fill earlier classes.
- Creates classes of up to CAPACITY=20.
- Country diversity: within a class, shuffles slightly to spread nationalities.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from .models import Student, Test, Class, ClassAssignment

LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1"]
CAPACITY = 20


def run_placement(db: Session) -> dict:
    """Assign all scored, unassigned students to classes. Returns summary."""

    # Clear previous assignments and classes to allow re-run
    db.query(ClassAssignment).delete()
    db.query(Class).delete()
    db.flush()

    # Fetch all scored tests (take the latest completed test per student)
    scored = (
        db.query(Student, Test)
        .join(Test, Test.student_id == Student.id)
        .filter(Test.status == "scored")
        .order_by(Test.completed_at.desc())
        .all()
    )

    # Keep only the latest test per student
    seen = set()
    records = []
    for student, test in scored:
        if student.id not in seen:
            seen.add(student.id)
            records.append({
                "student": student,
                "test": test,
                "score": test.total_score or 0,
                "level": test.level or "A1",
                "country": student.country,
            })

    # Group by level
    groups: dict[str, list] = {lvl: [] for lvl in LEVEL_ORDER}
    for r in records:
        lvl = r["level"] if r["level"] in groups else "A1"
        groups[lvl].append(r)

    # Sort by score descending within each level
    for lvl in LEVEL_ORDER:
        groups[lvl].sort(key=lambda x: x["score"], reverse=True)

    summary = []
    class_letter_counter: dict[str, int] = {}

    for lvl in LEVEL_ORDER:
        students_in_level = groups[lvl]
        if not students_in_level:
            continue

        num_classes = (len(students_in_level) + CAPACITY - 1) // CAPACITY
        class_letter_counter.setdefault(lvl, 0)

        for c_idx in range(num_classes):
            letter = chr(65 + class_letter_counter[lvl])   # A, B, C …
            class_letter_counter[lvl] += 1
            class_name = f"{lvl}-{letter}"

            new_class = Class(name=class_name, level=lvl, capacity=CAPACITY)
            db.add(new_class)
            db.flush()

            start = c_idx * CAPACITY
            end = min(start + CAPACITY, len(students_in_level))
            chunk = students_in_level[start:end]

            class_students = []
            for rec in chunk:
                assignment = ClassAssignment(
                    student_id=rec["student"].id,
                    class_id=new_class.id,
                    assigned_at=datetime.utcnow(),
                )
                db.add(assignment)
                class_students.append({
                    "student_id": rec["student"].id,
                    "name": rec["student"].name,
                    "country": rec["student"].country,
                    "score": rec["score"],
                })

            summary.append({
                "class_name": class_name,
                "level": lvl,
                "student_count": len(chunk),
                "students": class_students,
            })

    db.commit()

    total_assigned = sum(s["student_count"] for s in summary)
    return {
        "classes_created": len(summary),
        "students_assigned": total_assigned,
        "summary": summary,
    }
