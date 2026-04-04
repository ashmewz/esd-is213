import uuid
import requests
from config import Config


class PaymentClient:
    def process_payment(self, order_id, user_id, amount, currency="SGD", card_last4=""):
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
            "idempotencyKey": f"purchase-{order_id}",
            "cardLast4": card_last4,
        }
        try:
            response = requests.post(
                f"{Config.PAYMENT_SERVICE_URL}/payments",
                json=payload,
                timeout=10,
            )
        except requests.exceptions.RequestException as exc:
            raise RuntimeError(f"Payment service unreachable: {exc}") from exc
        return response.json()
