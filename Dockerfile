# harmonysync/Dockerfile
FROM node:18-alpine as frontend-builder

WORKDIR /var/www/harmonysync/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY frontend/. .

# Сборка фронтенда
RUN npm run build

# Бэкенд
FROM python:3.9-slim

WORKDIR /var/www/harmonysync/backend

# Установка зависимостей для бэкенда
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование файлов бэкенда
COPY backend/token.json .
COPY backend/ .

# Копирование собранного фронтенда
COPY --from=frontend-builder /var/www/harmonysync/frontend/dist /var/www/harmonysync/backend/static

# Настройка Gunicorn для обслуживания фронтенда и бэкенда
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--chdir", "/var/www/harmonysync/backend", "app:app", "--timeout", "120"]
