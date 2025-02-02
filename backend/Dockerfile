FROM python:3.9-slim

WORKDIR /var/www/harmonysync/backend

# COPY token.json token.json
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app", "--timeout", "120"]
