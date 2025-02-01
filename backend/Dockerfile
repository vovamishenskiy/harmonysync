FROM python:3.9-slim

WORKDIR /app

COPY token.json token.json
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "79.174.84.178:5000", "app:app", "--timeout", "120"]