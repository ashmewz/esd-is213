import logging

from flask import Blueprint, jsonify, request

from app.services.payment_service import process_purchase

logger = logging.getLogger(__name__)

payment_bp = Blueprint("payments", __name__)

REQUIRED_FIELDS = ("orderId", "userId", "amount", "currency", "type", "idempotencyKey")


@payment_bp.route("/payments", methods=["POST"])
def create_payment():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON request body."}), 400

    missing = [f for f in REQUIRED_FIELDS if payload.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        txn = process_purchase(
            order_id=payload["orderId"],
            user_id=payload["userId"],
            amount=payload["amount"],
            currency=payload["currency"],
            payment_type=payload["type"],
            idempotency_key=payload["idempotencyKey"],
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception:
        logger.exception("Unexpected error in create_payment")
        return jsonify({"error": "Internal server error."}), 500

    if txn.status == "SUCCESS":
        return jsonify({
            "transactionId": str(txn.transaction_id),
            "providerTxnId": txn.external_ref_id,
            "status": "SUCCESS",
            "amount": float(txn.amount),
            "currency": txn.currency,
        }), 201

    # FAILED
    return jsonify({
        "transactionId": str(txn.transaction_id),
        "status": "FAILED",
        "reason": txn.failure_reason,
    }), 402
