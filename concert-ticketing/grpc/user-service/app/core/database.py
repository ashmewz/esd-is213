import os
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker, declarative_base

if os.getenv("ENV") != "production":
    from dotenv import load_dotenv
    from pathlib import Path
    for parent in Path(__file__).resolve().parents:
        env_file = parent / ".env"
        if env_file.exists():
            load_dotenv(env_file)
            print(f"[db] Loaded .env from: {env_file}")
            break

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Check your environment / .env file.")

engine = create_engine(DATABASE_URL, poolclass=NullPool)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def init_schema():
    """Create the service schema if it does not exist (idempotent)."""
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS user_service"))
        conn.commit()


def get_db():
    """Yield a SQLAlchemy session (use as a dependency)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()