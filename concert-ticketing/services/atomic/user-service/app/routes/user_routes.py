from flask import Blueprint, request, jsonify
from app.services.user_service import UserService
from app.core.database import SessionLocal

user_bp = Blueprint("user_bp", __name__)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@user_bp.route("/users", methods=["POST"])
def create_user():
    db = next(get_db())
    try:
        data = request.json
        user = UserService.register_user(db, data)
        return jsonify(user.to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@user_bp.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    db = next(get_db())
    try:
        user = UserService.get_user(db, user_id)
        return jsonify(user.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 404


@user_bp.route("/users", methods=["GET"])
def list_users():
    users = UserService.list_users()
    return jsonify([u.to_dict() for u in users])


@user_bp.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    db = next(get_db())
    try:
        UserService.delete_user(db, user_id)
        return jsonify({"message": "User deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 404