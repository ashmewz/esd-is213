import os
import stripe
from app.providers.payment_provider import PaymentProvider, ChargeResult, RefundResult


class StripeProvider(PaymentProvider):
    """Stripe payment provider.

    Uses Stripe PaymentIntents API to process charges.
    The PaymentIntent ID (pi_xxx) is stored as external_ref_id in the
    transactions table and used later for refunds in Scenario B.
    """

    def __init__(self):
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe.api_key:
            raise ValueError("STRIPE_SECRET_KEY is not set.")

    def charge(self, order_id: str, user_id: str, amount: float, currency: str) -> ChargeResult:
        try:
            # Stripe amounts are in the smallest currency unit (cents)
            # e.g. SGD 188.00 → 18800 cents
            amount_in_cents = int(round(amount * 100))

            intent = stripe.PaymentIntent.create(
                amount=amount_in_cents,
                currency=currency.lower(),
                confirm=True,
                # Use Stripe test payment method — works in test mode only
                payment_method="pm_card_visa",
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
            # Card was declined
            return ChargeResult(success=False, failure_reason=e.user_message)

        except stripe.error.StripeError as e:
            # Any other Stripe error
            return ChargeResult(success=False, failure_reason=str(e))

    def refund(self, provider_txn_id: str, amount: float) -> RefundResult:
        try:
            amount_in_cents = int(round(amount * 100))

            refund = stripe.Refund.create(
                payment_intent=provider_txn_id,  # pi_xxx from the original charge
                amount=amount_in_cents,
            )

            return RefundResult(success=True, provider_refund_id=refund.id)

        except stripe.error.StripeError as e:
            return RefundResult(success=False, failure_reason=str(e))
