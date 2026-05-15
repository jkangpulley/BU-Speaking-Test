"""
Run once to populate the database with:
- Default admin account
- 5 placement test questions
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal, engine, Base
from app.models import Admin, Question
from app.auth import hash_password

Base.metadata.create_all(bind=engine)

QUESTIONS = [
    {
        "order_num": 1,
        "difficulty": 1,
        "prep_seconds": 15,
        "max_seconds": 60,
        "text": "Please introduce yourself. Tell me your name, how old you are, and one thing you enjoy doing.",
        "hint": "My name is... I am ... years old. I like...",
    },
    {
        "order_num": 2,
        "difficulty": 2,
        "prep_seconds": 15,
        "max_seconds": 60,
        "text": "Describe your school. What subjects do you study? Which subject is your favorite, and why?",
        "hint": "My school is... I study... My favourite subject is ... because...",
    },
    {
        "order_num": 3,
        "difficulty": 3,
        "prep_seconds": 20,
        "max_seconds": 60,
        "text": "Tell me about an important person in your life. Who are they, and why are they important to you?",
        "hint": "The most important person in my life is... because...",
    },
    {
        "order_num": 4,
        "difficulty": 4,
        "prep_seconds": 20,
        "max_seconds": 60,
        "text": "What do you think is the biggest challenge young people face today? What can be done to solve it?",
        "hint": "I think the biggest challenge is... We could solve this by...",
    },
    {
        "order_num": 5,
        "difficulty": 5,
        "prep_seconds": 20,
        "max_seconds": 60,
        "text": "If you could travel anywhere in the world for one month, where would you go and what would you do there? Explain your reasons.",
        "hint": "If I could travel anywhere, I would go to ... because... I would...",
    },
]

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin1234"


def seed():
    db = SessionLocal()
    try:
        # Admin
        existing_admin = db.query(Admin).filter(Admin.username == ADMIN_USERNAME).first()
        if not existing_admin:
            admin = Admin(username=ADMIN_USERNAME, password_hash=hash_password(ADMIN_PASSWORD))
            db.add(admin)
            print(f"✅ Admin created: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
        else:
            print("ℹ️  Admin already exists, skipping.")

        # Questions
        existing_count = db.query(Question).count()
        if existing_count == 0:
            for q in QUESTIONS:
                db.add(Question(**q))
            print(f"✅ {len(QUESTIONS)} questions inserted.")
        else:
            print(f"ℹ️  {existing_count} questions already exist, skipping.")

        db.commit()
        print("\nDone! Start the server with:")
        print("  uvicorn app.main:app --reload --port 8000")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
