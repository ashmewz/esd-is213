import logging

import os

from app import db
from app.models.payment_models import Transaction
from app.providers.stripe_provider import StripeProvider
from app.providers.mock_provider import MockPaymentProvider

logger = logging.getLogger(__name__)

_provider = StripeProvider() if os.getenv("STRIPE_SECRET_KEY") else MockPaymentProvider()

_SUPPORTED_CURRENCIES = frozenset({"SGD", "USD", "EUR"})
_SUPPORTED_TYPES = frozenset({"PURCHASE"})

# Map incoming API type to internal DB constraint value
_TYPE_MAP = {
    "PURCHASE": "PAYMENT",
}


def process_purchase(order_id, user_id, amount, currency, payment_type, idempotency_key, card_last4=""):
    """Process a purchase payment for Scenario A.

    Returns the Transaction record (new or existing if idempotent retry).
    Raises ValueError for invalid input.
    """
    # --- Validation ---
    if not order_id or not user_id:
        raise ValueError("orderId and userId are required.")

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        raise ValueError("amount must be a number.")

    if amount <= 0:
        raise ValueError("amount must be greater than 0.")

    currency = str(currency).upper() if currency else ""
    if currency not in _SUPPORTED_CURRENCIES:
        raise ValueError(f"Unsupported currency '{currency}'. Supported: {', '.join(_SUPPORTED_CURRENCIES)}")

    payment_type = str(payment_type).upper() if payment_type else ""
    if payment_type not in _SUPPORTED_TYPES:
        raise ValueError(f"Unsupported payment type '{payment_type}' for this endpoint.")

    db_type = _TYPE_MAP[payment_type]

    # --- Idempotency check ---
    # If the same idempotency key has been seen before, return the existing transaction
    if idempotency_key:
        existing = db.session.query(Transaction).filter_by(
            idempotency_key=idempotency_key
        ).first()
        if existing:
            logger.info("Idempotent request detected for key=%s, returning existing transaction %s",
                        idempotency_key, existing.transaction_id)
            return existing

    # --- Create a PENDING transaction record ---
    txn = Transaction(
        order_id=str(order_id),
        user_id=str(user_id),
        type=db_type,
        amount=amount,
        currency=currency,
        idempotency_key=idempotency_key or None,
        status="PENDING",
    )
    try:
        db.session.add(txn)
        db.session.flush()  # get transaction_id assigned before calling provider
    except Exception:
        db.session.rollback()
        logger.exception("Failed to create pending transaction")
        raise

    # --- Call the payment provider ---
    try:
        result = _provider.charge(
            order_id=str(order_id),
            user_id=str(user_id),
            amount=amount,
            currency=currency,
            card_last4=card_last4,
        )
    except Exception as exc:
        # Provider raised unexpectedly — mark as failed and surface a clean error
        db.session.rollback()
        logger.exception("Unexpected error from payment provider")
        raise RuntimeError("Payment provider error.") from exc

    # --- Update transaction with provider result ---
    if result.success:
        txn.status = "SUCCESS"
        txn.external_ref_id = result.provider_txn_id
    else:
        txn.status = "FAILED"
        txn.failure_reason = result.failure_reason

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Failed to persist transaction result")
        raise

    return txn
