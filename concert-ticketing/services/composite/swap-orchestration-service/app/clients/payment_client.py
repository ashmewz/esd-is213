import os
import requests

PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:5000")

PLATFORM_FEE_RATE = 0.05  # 5% of price difference


def get_payment_by_order(order_id):
    """Look up the original successful payment transaction for an order."""
    try:
        resp = requests.get(
            f"{PAYMENT_SERVICE_URL}/payments/by-order/{order_id}", timeout=5
        )
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        print(f"[swap-orchestration] get_payment_by_order failed: {e}")
        return None


def charge_swap_settlement(order_id, user_id, amount, currency="SGD"):
    """Charge the upgrading user (User A) the price difference + platform fee."""
    platform_fee = round(amount * PLATFORM_FEE_RATE, 2)
    total = round(amount + platform_fee, 2)
    try:
        resp = requests.post(f"{PAYMENT_SERVICE_URL}/payments", json={
            "orderId": str(order_id),
            "userId": str(user_id),
            "amount": total,
            "currency": currency,
            "type": "PURCHASE",
            "idempotencyKey": f"swap-settlement-{order_id}",
        }, timeout=10)
        data = resp.json()
        data["platformFee"] = platform_fee
        data["priceDiff"] = amount
        data["totalCharged"] = total
        return data
    except Exception as e:
        print(f"[swap-orchestration] charge_swap_settlement failed: {e}")
        return None


def refund_swap_difference(order_id, user_id, amount, currency, original_payment_intent_id):
    """Refund the downgrading user (User B) the price difference."""
    try:
        resp = requests.post(f"{PAYMENT_SERVICE_URL}/refunds", json={
            "orderId": str(order_id),
            "userId": str(user_id),
            "amount": round(amount, 2),
            "currency": currency,
            "originalPaymentIntentId": original_payment_intent_id,
            "idempotencyKey": f"swap-refund-{order_id}",
        }, timeout=10)
        return resp.json()
    except Exception as e:
        print(f"[swap-orchestration] refund_swap_difference failed: {e}")
        return None
