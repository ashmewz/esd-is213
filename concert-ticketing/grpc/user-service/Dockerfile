FROM python:3.11-slim

WORKDIR /app
ENV ENV=production

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    curl \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
EXPOSE 50051

ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5000
ENV PYTHONPATH=/app

COPY entrypoint.sh /entrypoint.sh
COPY migrate.py /app/migrate.py
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]