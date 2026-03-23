import uuid
import requests
from config import Config


class PaymentClient:
    def process_payment(self, order_id, user_id, amount, currency="SGD"):
        """Call Payment Service to process a purchase payment.

        Returns the JSON response from Payment Service.
        Raises on HTTP errors or connection failures.
        """
        payload = {
            "orderId": order_id,
            "userId": user_id,
            "amount": amount,
            "currency": currency,
            "type": "PURCHASE",
            # Use orderId as idempotency key — one purchase attempt per order
            "idempotencyKey": f"purchase-{order_id}",
        }
        response = requests.post(
            f"{Config.PAYMENT_SERVICE_URL}/payments",
            json=payload,
            timeout=10,
        )
        return response.json()
