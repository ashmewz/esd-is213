import os
 
if os.getenv("ENV") != "production":
    from dotenv import load_dotenv
    load_dotenv()
 
 
class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SCHEMA = "seat_allocation_service"