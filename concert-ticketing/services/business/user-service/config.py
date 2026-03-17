import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "postgresql+psycopg://user:password@postgres:5432/user_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")