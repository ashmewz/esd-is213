import requests
from config import Config

class UserClient:
    def get_user(self, user_id):
        url = f"{Config.USER_SERVICE_URL}/users/{user_id}"
        res = requests.get(url, timeout=10)
        if res.status_code != 200:
            return None
        return res.json()
