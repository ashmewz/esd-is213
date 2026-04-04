import requests
from config import Config


class OrderClient:
    """
    OutSystems Order API client.

    Endpoints (trailing slashes as required by OutSystems):
      POST {base}/orders/
      PUT  {base}/orders/{orderId}/status/
    """

    def __init__(self):
        self._base = Config.ORDER_SERVICE_URL.rstrip("/")
        self._timeout = Config.ORDER_SERVICE_TIMEOUT

    def _orders_collection_url(self) -> str:
        return f"{self._base}/orders/"

    def _order_status_url(self, order_id) -> str:
        return f"{self._base}/orders/{order_id}/status/"

    @staticmethod
    def _request_body(user_id, event_id, seat_id, price, currency) -> dict:
        # Same shape as the internal order-service unless OutSystems defines otherwise.
        return {
            "userId": user_id,
            "eventId": event_id,
            "seatId": seat_id,
            "price": price,
            "currency": currency,
        }

    @staticmethod
    def _normalize_create_response(payload: dict) -> dict:
        """Ensure booking_service always sees {'orderId': '<string>'} (via get('data', resp))."""
        if "orderId" in payload:
            return {"orderId": str(payload["orderId"])}
        data = payload.get("data")
        if isinstance(data, dict) and "orderId" in data:
            return {"orderId": str(data["orderId"])}
        if "Id" in payload:
            return {"orderId": str(payload["Id"])}
        order = payload.get("Order")
        if isinstance(order, dict) and "Id" in order:
            return {"orderId": str(order["Id"])}
        raise ValueError(
            "Order API response did not contain an order id "
            f"(tried orderId, data.orderId, Id, Order.Id); got keys: {list(payload.keys())}"
        )

    def create_order(self, user_id, event_id, seat_id, price, currency="SGD"):
        resp = requests.post(
            self._orders_collection_url(),
            json=self._request_body(user_id, event_id, seat_id, price, currency),
            timeout=self._timeout,
        )
        resp.raise_for_status()
        body = resp.json()
        if not isinstance(body, dict):
            raise ValueError("Order API returned non-object JSON for create order.")
        return self._normalize_create_response(body)

    def confirm_order(self, order_id):
        resp = requests.put(
            self._order_status_url(order_id),
            json={"status": "CONFIRMED"},
            timeout=self._timeout,
        )
        resp.raise_for_status()

    def cancel_order(self, order_id):
        resp = requests.put(
            self._order_status_url(order_id),
            json={"status": "CANCELLED"},
            timeout=self._timeout,
        )
        resp.raise_for_status()
