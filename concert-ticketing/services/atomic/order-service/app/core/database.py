from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv
from pathlib import Path

current_path = Path(__file__).resolve()

for parent in current_path.parents:
    env_file = parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        print(f"Loaded .env from: {env_file}")
        break

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Check your .env file.")

print("DATABASE_URL:", DATABASE_URL)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()