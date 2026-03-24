import requests
import os

SWAP_SERVICE_URL = os.getenv("SWAP_SERVICE_URL", "http://localhost:5001")

def create_swap_request(order_id, event_id, current_seat_id, desired_tier):
    url = f"{SWAP_SERVICE_URL}/swap"
    payload = {
        "orderId": order_id,
        "eventId": event_id,
        "currentSeatId": current_seat_id,
        "desiredTier": desired_tier
    }
    r = requests.post(url, json=payload)
    r.raise_for_status()
    return r.json()

def submit_swap_response(swap_id, user_id, response):
    url = f"{SWAP_SERVICE_URL}/swap/{swap_id}/responses"
    payload = {"userId": user_id, "response": response}
    r = requests.post(url, json=payload)
    r.raise_for_status()
    return r.json()

def get_swap_status(swap_id):
    url = f"{SWAP_SERVICE_URL}/swap/{swap_id}"
    r = requests.get(url)
    r.raise_for_status()
    return r.json()