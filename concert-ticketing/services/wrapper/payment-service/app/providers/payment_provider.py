from abc import ABC, abstractmethod


class ChargeResult:
    """Standardised result returned by any payment provider."""

    def __init__(self, success: bool, provider_txn_id: str = None, failure_reason: str = None):
        self.success = success
        self.provider_txn_id = provider_txn_id  # reference ID from the external provider
        self.failure_reason = failure_reason


class PaymentProvider(ABC):
    """Abstract interface for payment providers.

    Implement this class to add a real provider (e.g. Stripe, PayPal).
    The service layer only depends on this interface, never on a concrete provider.
    """

    @abstractmethod
    def charge(self, order_id: str, user_id: str, amount: float, currency: str) -> ChargeResult:
        """Attempt to charge the given amount.

        Returns a ChargeResult indicating success or failure.
        Must never raise — all provider errors should be caught and returned as a failed ChargeResult.
        """
        pass
