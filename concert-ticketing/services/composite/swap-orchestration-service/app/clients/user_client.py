import os
import requests

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:5000")


def get_user(user_id):
    try:
        resp = requests.get(f"{USER_SERVICE_URL}/users/{user_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        print(f"[swap-orchestration] get_user failed: {e}")
        return None
