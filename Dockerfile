# === Frontend Build Stage ===
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/. .
RUN npm run build

# === Backend Stage ===
FROM python:3.9-slim
WORKDIR /app

# Backend deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend code
COPY backend/ .

# Копируй собранный фронтенд в Flask static
COPY --from=frontend-builder /app/frontend/dist ./static

# Копируй credentials.json (ОБЯЗАТЕЛЬНО!)
COPY credentials.json .

EXPOSE 5000

ENV FLASK_SECRET_KEY=change_me_in_production
ENV PYTHONUNBUFFERED=1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app", "--timeout", "120", "--workers", "3", "--threads", "2"]