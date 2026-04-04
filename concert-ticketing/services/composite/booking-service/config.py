import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    EVENT_SERVICE_URL = os.getenv("EVENT_SERVICE_URL", "http://events-service:5000")
    SEAT_SERVICE_URL = os.getenv("SEAT_SERVICE_URL", "http://seat-allocation-service:5000")
    # OutSystems: REST module base URL (no trailing slash), e.g. https://.../MyModule_REST
    ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL", "http://order-service:5000")
    ORDER_SERVICE_TIMEOUT = float(os.getenv("ORDER_SERVICE_TIMEOUT", "30"))
    PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:5000")
    NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:5000") 