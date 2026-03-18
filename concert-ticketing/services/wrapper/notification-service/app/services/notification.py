import requests
import os

TELEGRAM_API_URL = os.environ.get("TELEGRAM_API_URL", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


def send_notification(event_type: str, data: dict):
    """
    Called by the RabbitMQ consumer whenever a relevant event is received.
    
    implement the Telegram/Email logic here based on event_type.

    event_type options:
      - "ticket.purchased"      -> order confirmed, ticket booked
      - "seat.reassigned"       -> seat changed due to seatmap update
      - "payment.refund.issued" -> refund issued after seatmap change
      - "swap.completed"        -> seat swap finalized
    """
    message = _build_message(event_type, data)
    _send_telegram(message)


def _build_message(event_type: str, data: dict) -> str:
    if event_type == "ticket.purchased":
        return f"Your ticket has been confirmed! Order ID: {data.get('orderId')}, Seat: {data.get('seatId')}"
    elif event_type == "seat.reassigned":
        return f"Your seat has been reassigned. New seat: {data.get('newSeatId')} for order {data.get('orderId')}"
    elif event_type == "payment.refund.issued":
        return f"A refund of ${data.get('amount')} has been issued for order {data.get('orderId')}"
    elif event_type == "swap.completed":
        return f"Your seat swap is complete! Order ID: {data.get('orderId')}"
    else:
        return f"Notification: {event_type} - {data}"


def _send_telegram(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print(f"[Notification] Telegram not configured. Message: {message}")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message})
