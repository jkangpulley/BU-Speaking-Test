import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Railway PostgreSQL: fix postgres:// → postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL)
else:
    # 로컬 개발용 SQLite
    _data_dir = "/data" if os.path.isdir("/data") else os.path.dirname(os.path.abspath(__file__))
    os.makedirs(_data_dir, exist_ok=True)
    DATABASE_URL = f"sqlite:///{_data_dir}/speaking_test.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
