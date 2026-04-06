from flask import Blueprint, jsonify, request
from app.database import SessionLocal
from app.models import Notification
import uuid

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/notifications", methods=["GET"])
def get_notifications():
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"error": "userId query param required"}), 400
    db = SessionLocal()
    try:
        rows = (
            db.query(Notification)
            .filter(Notification.user_id == str(user_id))
            .order_by(Notification.created_at.desc())
            .all()
        )
        return jsonify([r.to_dict() for r in rows]), 200
    finally:
        db.close()
