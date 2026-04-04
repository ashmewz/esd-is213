import os

if os.getenv("ENV") != "production":
    from dotenv import load_dotenv
    load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SCHEMA = "user_service"

    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
    RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")