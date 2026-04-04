import grpc
from concurrent import futures
from app.grpc_server import user_pb2, user_pb2_grpc

# In-memory "database"
users = {}
user_counter = 1

class UserService(user_pb2_grpc.UserServiceServicer):

    def CreateUser(self, request, context):
        global user_counter
        user_id = str(user_counter)
        users[user_id] = {
            "id": user_id,
            "name": request.name,
            "email": request.email,
            "password": request.password  # plaintext for now
        }
        user_counter += 1
        return user_pb2.CreateUserResponse(
            user=user_pb2.User(
                id=user_id,
                name=request.name,
                email=request.email
            )
        )

    def LoginUser(self, request, context):
        for u in users.values():
            if u["email"] == request.email and u["password"] == request.password:
                return user_pb2.LoginResponse(
                    token="dummy-token",
                    user=user_pb2.User(
                        id=u["id"],
                        name=u["name"],
                        email=u["email"]
                    )
                )
        context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid credentials")

    def GetUser(self, request, context):
        u = users.get(request.user_id)
        if not u:
            context.abort(grpc.StatusCode.NOT_FOUND, "User not found")
        return user_pb2.GetUserResponse(
            user=user_pb2.User(
                id=u["id"],
                name=u["name"],
                email=u["email"]
            )
        )

    def ListUsers(self, request, context):
        return user_pb2.ListUsersResponse(
            users=[user_pb2.User(id=u["id"], name=u["name"], email=u["email"]) for u in users.values()]
        )

    def DeleteUser(self, request, context):
        if request.user_id not in users:
            context.abort(grpc.StatusCode.NOT_FOUND, "User not found")
        del users[request.user_id]
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