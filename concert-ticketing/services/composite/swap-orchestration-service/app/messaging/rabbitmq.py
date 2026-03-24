import pika
import os
from dotenv import load_dotenv
load_dotenv()

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

def get_connection():
    params = pika.URLParameters(RABBITMQ_URL)
    return pika.BlockingConnection(params)

def get_channel():
    conn = get_connection()
    return conn.channel(), conn