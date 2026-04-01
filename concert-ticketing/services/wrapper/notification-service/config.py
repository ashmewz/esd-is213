import os
from dotenv import load_dotenv

load_dotenv()

EXCHANGE_NAME = "concert_ticketing"
EXCHANGE_TYPE = "topic"

# Queue this service listens on
NOTIFICATION_QUEUE = "notification_queue"

# Routing keys to consume
ROUTING_KEYS = [
    "ticket.purchased",       # Scenario A: ticket purchase confirmed
    "seat.reassigned",        # Scenario B: seat reassigned after seatmap change
    "payment.refund.issued",  # Scenario B: refund issued after seatmap change
    "swap.completed",         # Scenario C: swap completed
]

# Telegram
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# Email (Gmail SMTP)
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "")        # your Gmail address
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "") # your Gmail App Password
EMAIL_FROM = os.environ.get("EMAIL_FROM", SMTP_USER)
