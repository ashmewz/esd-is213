# app/routes/user_routes.py
from flask import Blueprint, app, request, jsonify
import grpc
from app.grpc_server import user_pb2, user_pb2_grpc
from app.services.user_service import UserService

user_bp = Blueprint("user_bp", __name__)

channel = grpc.insecure_channel("localhost:50051")
grpc_client = user_pb2_grpc.UserServiceStub(channel)

@user_bp.route("/users/login", methods=["POST"])
def login_user():
    data = request.json
    grpc_request = user_pb2.LoginRequest(email=data["email"], password=data["password"])
    try:
        response = grpc_client.LoginUser(grpc_request)
        return jsonify({
            "token": response.token,
            "user": {
                "id": response.user.id,
                "username": response.user.username,
                "email": response.user.email
            }
        })
    except grpc.RpcError as e:
        return jsonify({"error": e.details()}), 401

@user_bp.route("/debug/users", methods=["GET"])
def debug_users():
    return UserService.list_users()

@user_bp.route("/users", methods=["POST"])
def create_user():
    data = request.json
    grpc_request = user_pb2.CreateUserRequest(username=data["username"], email=data["email"], password=data["password"])
    response = grpc_client.CreateUser(grpc_request)
    return jsonify({
        "id": response.user.id,
        "username": response.user.username,
        "email": response.user.email
    })

@user_bp.route("/users", methods=["GET"])
def list_users():
    grpc_request = user_pb2.ListUsersRequest()
    response = grpc_client.ListUsers(grpc_request)
    users = [{"id": u.id, "username": u.username, "email": u.email} for u in response.users]
    return jsonify(users)

@user_bp.route("/users/<user_id>", methods=["GET"])
def get_user(user_id):
    grpc_request = user_pb2.GetUserRequest(user_id=user_id)
    try:
        response = grpc_client.GetUser(grpc_request)
        return jsonify({
            "id": response.user.id,
            "username": response.user.username,
            "email": response.user.email
        })
    except grpc.RpcError as e:
        return jsonify({"error": e.details()}), 404

@user_bp.route("/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    grpc_request = user_pb2.DeleteUserRequest(user_id=user_id)
    try:
        response = grpc_client.DeleteUser(grpc_request)
        return jsonify({"message": response.message})
    except grpc.RpcError as e:
        return jsonify({"error": e.details()}), 404