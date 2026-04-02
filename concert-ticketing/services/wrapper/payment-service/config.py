import os
from dotenv import load_dotenv

class Config:
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")