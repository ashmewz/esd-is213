import requests
from config import Config

class PaymentClient:
    def process_payment(self, order_id, amount):
        return requests.post(
            f"{Config.PAYMENT_SERVICE_URL}/payment/{order_id}",
            json={"amount": amount}
        ).json()