# harmonysync/Dockerfile
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY frontend/. .

# Сборка фронтенда
RUN npm run build

# Бэкенд
FROM python:3.9-slim

WORKDIR /app/backend

# Установка зависимостей для бэкенда
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование файлов бэкенда
COPY backend/token.json .
COPY backend/ .

# Копирование собранного фронтенда
COPY --from=frontend-builder /app/frontend/dist /app/backend/static

# Настройка Gunicorn для обслуживания фронтенда и бэкенда
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--chdir", "/app/backend", "app:app", "--timeout", "120"]