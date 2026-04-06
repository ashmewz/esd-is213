import grpc
from app.grpc_server import user_pb2, user_pb2_grpc

def main():
    # Connect to the gRPC server
    channel = grpc.insecure_channel('localhost:50051')
    stub = user_pb2_grpc.UserServiceStub(channel)

    # ---- Test CreateUser ----
    try:
        create_response = stub.CreateUser(user_pb2.CreateUserRequest(
            username="Alice",
            email="alice@example.com",
            password="1234"
        ))
        print("CreateUser response:")
        print(f"ID: {create_response.user.id}")
        print(f"Username: {create_response.user.username}")
        print(f"Email: {create_response.user.email}")
    except grpc.RpcError as e:
        print(f"CreateUser failed: {e.details()} (code: {e.code()})")

    # ---- Test LoginUser ----
    try:
        login_response = stub.LoginUser(user_pb2.LoginRequest(
            email="alice@example.com",
            password="1234"
        ))
        print("\nLoginUser response:")
        print(f"Token: {login_response.token}")
        print(f"User ID: {login_response.user.id}")
        print(f"Username: {login_response.user.username}")
        print(f"User Email: {login_response.user.email}")
    except grpc.RpcError as e:
        print(f"LoginUser failed: {e.details()} (code: {e.code()})")

if __name__ == "__main__":
    main()