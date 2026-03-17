# helo this file is for you to list down and explain ur code
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
