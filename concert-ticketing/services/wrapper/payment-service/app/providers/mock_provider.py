import uuid
from app.providers.payment_provider import PaymentProvider, ChargeResult


class MockPaymentProvider(PaymentProvider):
    """Mock payment provider for development and testing.

    Simulates success for normal amounts and declines amounts above 10,000
    to allow testing of the failure path without a real payment API.

    Swap this out for a real provider (e.g. StripeProvider) when ready.
    """

    DECLINE_THRESHOLD = 10_000.00

    def charge(self, order_id: str, user_id: str, amount: float, currency: str, card_last4: str = "") -> ChargeResult:
        if amount > self.DECLINE_THRESHOLD:
            return ChargeResult(
                success=False,
                failure_reason="Payment declined: amount exceeds limit"
            )

        # Simulate a successful charge — generate a fake provider transaction ID
        provider_txn_id = f"MOCK-{uuid.uuid4().hex[:12].upper()}"
        return ChargeResult(success=True, provider_txn_id=provider_txn_id)

    def refund(self, external_ref_id: str, amount: float, currency: str) -> ChargeResult:
        provider_txn_id = f"MOCK-REFUND-{uuid.uuid4().hex[:10].upper()}"
        return ChargeResult(success=True, provider_txn_id=provider_txn_id)
