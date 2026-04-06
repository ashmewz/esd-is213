# hello this file is for you to list down and explain ur code
# be organised please

# how to docker compose?
1. run everything (go to folder with docker-compose.yml first)
    docker compose up

2. if no images, build images
    docker compose build --no-cache

3. list all running containers
    docker compose ps

4. view logs (but will have errors from Kong cuz havent set up ur services)
    docker compose logs

5. stop all containers
    docker compose down

# swagger api docs
OpenAPI file location:
- ./docs/swagger/openapi.yaml

Orders API note:
- OutSystems base:
    https://personal-v9ndj4pt.outsystemscloud.com/Order/rest/Order/

Verified OutSystems Order APIs (from swagger.json):
1. GET /orders/ (GetOrdersByUser)
2. POST /orders/ (CreateOrder)
3. GET /orders/{orderId}/ (GetOrder)
4. PUT /orders/{orderId}/seat/ (UpdateOrderSeat)
5. PUT /orders/{orderId}/status/ (UpdateOrderStatus)

Option 1: open in Swagger Editor online
1. go to https://editor.swagger.io/
2. copy the file contents from ./docs/swagger/openapi.yaml and paste

Option 2: run Swagger UI locally with Docker
1. from concert-ticketing folder, run:
   docker run --rm -p 8081:8080 \
   -e SWAGGER_JSON=/spec/openapi.yaml \
   -v "${PWD}/docs/swagger:/spec" \
   swaggerapi/swagger-ui
2. open http://localhost:8081
