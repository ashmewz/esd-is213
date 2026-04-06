import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    from app.models import Base
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS notification_service"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
