import os
import stripe
from app.providers.payment_provider import PaymentProvider, ChargeResult

# Map card last-4 to Stripe test payment methods.
# These only work in Stripe test mode.
_TEST_PAYMENT_METHODS = {
    "0002": "pm_card_visa_chargeDeclined",           # Generic decline
    "0003": "pm_card_visa_chargeDeclinedInsufficientFunds",  # Insufficient funds
    "0004": "pm_card_chargeDeclinedExpiredCard",     # Expired card
    "0005": "pm_card_visa_chargeDeclinedFraudulent", # Fraud decline
}
_DEFAULT_PAYMENT_METHOD = "pm_card_visa"             # Always succeeds


class StripeProvider(PaymentProvider):
    """Stripe payment provider.

    Uses Stripe PaymentIntents API to process charges.
    The PaymentIntent ID (pi_xxx) is stored as external_ref_id in the
    transactions table and used later for refunds in Scenario B.

    In test mode, the last 4 digits of the card number control which
    Stripe test payment method is used, allowing failure scenarios to
    be triggered from the UI.
    """

    def __init__(self):
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe.api_key:
            raise ValueError("STRIPE_SECRET_KEY is not set.")

    def charge(self, order_id: str, user_id: str, amount: float, currency: str, card_last4: str = "") -> ChargeResult:
        try:
            amount_in_cents = int(round(amount * 100))
            payment_method = _TEST_PAYMENT_METHODS.get(card_last4, _DEFAULT_PAYMENT_METHOD)

            intent = stripe.PaymentIntent.create(
                amount=amount_in_cents,
                currency=currency.lower(),
                confirm=True,
                payment_method=payment_method,
                metadata={
                    "order_id": order_id,
                    "user_id": user_id,
                },
                automatic_payment_methods={
                    "enabled": True,
                    "allow_redirects": "never",
                }
            )

            return ChargeResult(success=True, provider_txn_id=intent.id)

        except stripe.error.CardError as e:
            return ChargeResult(success=False, failure_reason=e.user_message)

        except stripe.error.StripeError as e:
            return ChargeResult(success=False, failure_reason=str(e))

    def refund(self, external_ref_id: str, amount: float, currency: str) -> ChargeResult:
        try:
            amount_in_cents = int(round(amount * 100))
            refund = stripe.Refund.create(
                payment_intent=external_ref_id,
                amount=amount_in_cents,
            )
            return ChargeResult(success=True, provider_txn_id=refund.id)

        except stripe.error.StripeError as e:
            return ChargeResult(success=False, failure_reason=str(e))
