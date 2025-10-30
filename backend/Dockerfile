# backend/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Копируй только нужное
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируй только backend
COPY backend/ .

# Копируй credentials.json (обязательно!)
COPY credentials.json .

EXPOSE 5000

# Переменные окружения (можно переопределить в docker-compose)
ENV FLASK_SECRET_KEY=your_secret_key_here
ENV PYTHONUNBUFFERED=1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app", "--timeout", "120", "--workers", "2"]