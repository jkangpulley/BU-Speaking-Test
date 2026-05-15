from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    name = Column(String)
    country = Column(String)        # Russia / Kazakhstan / Uzbekistan
    age_group = Column(String)      # elementary / middle / high
    grade = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tests = relationship("Test", back_populates="student")
    class_assignment = relationship("ClassAssignment", back_populates="student", uselist=False)


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)
    order_num = Column(Integer)
    text = Column(Text)
    hint = Column(Text, nullable=True)
    difficulty = Column(Integer)    # 1–5
    prep_seconds = Column(Integer, default=15)
    max_seconds = Column(Integer, default=60)

    responses = relationship("Response", back_populates="question")


class Test(Base):
    __tablename__ = "tests"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    total_score = Column(Float, nullable=True)       # 0–100
    level = Column(String, nullable=True)            # A1 A2 B1 B2 C1
    status = Column(String, default="in_progress")  # in_progress / completed / scored

    student = relationship("Student", back_populates="tests")
    responses = relationship("Response", back_populates="test", order_by="Response.question_id")


class Response(Base):
    __tablename__ = "responses"
    id = Column(Integer, primary_key=True)
    test_id = Column(Integer, ForeignKey("tests.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    audio_path = Column(String, nullable=True)
    transcript = Column(Text, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Scores 0–4 each, total 0–20
    task_completion = Column(Float, nullable=True)
    fluency = Column(Float, nullable=True)
    vocabulary = Column(Float, nullable=True)
    grammar = Column(Float, nullable=True)
    communication = Column(Float, nullable=True)
    total_score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    scored_at = Column(DateTime, nullable=True)

    test = relationship("Test", back_populates="responses")
    question = relationship("Question", back_populates="responses")


class Class(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)   # e.g. "B1-A"
    level = Column(String)              # A1 A2 B1 B2 C1
    capacity = Column(Integer, default=20)

    assignments = relationship("ClassAssignment", back_populates="class_")


class ClassAssignment(Base):
    __tablename__ = "class_assignments"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    assigned_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="class_assignment")
    class_ = relationship("Class", back_populates="assignments")
