import requests
import os

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:5004")


def get_user(user_id: str) -> dict | None:
    """Fetch a user by ID. Returns the user dict or None if not found."""
    try:
        r = requests.get(f"{USER_SERVICE_URL}/users/{user_id}", timeout=30)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[user_client] Failed to fetch user {user_id}: {e}")
        return None
