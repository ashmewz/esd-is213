import grpc
from concurrent import futures
from app.grpc_server import user_pb2, user_pb2_grpc
from app.core.database import SessionLocal
from app.models.user_model import User
import bcrypt

class UserService(user_pb2_grpc.UserServiceServicer):

    def CreateUser(self, request, context):
        db = SessionLocal()

        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            context.abort(grpc.StatusCode.ALREADY_EXISTS, "User already exists")

        hashed = bcrypt.hashpw(
            request.password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        user = User(
            username=request.username,
            email=request.email,
            password=hashed
        )

        db.add(user)
        db.commit()
        db.refresh(user)
    
        return user_pb2.CreateUserResponse(
            user=user_pb2.User(
                id=str(user.user_id),
                username=user.username,
                email=user.email
            )
        )

    def LoginUser(self, request, context):
        db = SessionLocal()
        user = db.query(User).filter(User.email == request.email).first()

        if not user:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid credentials")

        if not bcrypt.checkpw(
            request.password.encode("utf-8"),
            user.password.encode("utf-8")
        ):
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid credentials")

        return user_pb2.LoginResponse(
            token="real-token-here",
            user=user_pb2.User(
                id=str(user.user_id),
                username=user.username,
                email=user.email
            )
        )

    def GetUser(self, request, context):
        db = SessionLocal()
        user = db.query(User).filter(User.user_id == request.user_id).first()
        if not user:
            context.abort(grpc.StatusCode.NOT_FOUND, "User not found")
        return user_pb2.GetUserResponse(
            user=user_pb2.User(
                id=str(user.user_id),
                username=user.username,
                email=user.email
            )
        )

    def ListUsers(self, request, context):
        db = SessionLocal()
        users = db.query(User).all()
        return user_pb2.ListUsersResponse(
            users=[user_pb2.User(id=str(user.user_id), username=user.username, email=user.email) for user in users]
        )

    def DeleteUser(self, request, context):
        db = SessionLocal()
        user = db.query(User).filter(User.user_id == request.user_id).first()
        if not user:
            context.abort(grpc.StatusCode.NOT_FOUND, "User not found")
        db.delete(user)
        db.commit()
        return user_pb2.DeleteUserResponse(message="User deleted")


def serve_grpc():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    user_pb2_grpc.add_UserServiceServicer_to_server(UserService(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("gRPC server running on port 50051...")
    server.wait_for_termination()


if __name__ == "__main__":
    serve_grpc()