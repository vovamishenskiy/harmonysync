from flask import Flask, jsonify, request, redirect, url_for, session
from functools import wraps
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import os.path
import json
from datetime import datetime, timedelta
import pytz
import logging
from flask_sqlalchemy import SQLAlchemy

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger('googleapiclient.discovery_cache').setLevel(logging.ERROR)

# Области доступа Google API
SCOPES = ['https://www.googleapis.com/auth/calendar']

# Определение часового пояса Саратова
saratov_tz = pytz.timezone('Europe/Saratov')

def convert_to_saratov_time(dt_str):
    """Преобразует строку времени в объект datetime с учётом часового пояса Саратова."""
    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
    return dt.astimezone(saratov_tz)

class DateTimeEncoder(json.JSONEncoder):
    """Класс для сериализации объектов datetime в JSON."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)

# Создание приложения Flask
app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tasks.db'  # Путь к SQLite БД
db = SQLAlchemy(app)

# Модель задачи
class Task(db.Model):
    id = db.Column(db.String(50), primary_key=True)          # Уникальный ID задачи
    title = db.Column(db.String(200), nullable=False)        # Название задачи
    due = db.Column(db.DateTime, nullable=True)              # Время выполнения
    status = db.Column(db.String(20), default='pending')     # Статус задачи (pending, completed)

# Декоратор для проверки авторизации пользователя
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not get_credentials():
            logger.warning("User is not authenticated.")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Функция для получения токена из сессии
def get_credentials():
    creds_data = session.get('credentials')
    return Credentials.from_authorized_user_info(creds_data) if creds_data else None

# Функция для сохранения токена в сессии
def save_credentials(creds):
    session['credentials'] = json.loads(creds.to_json())

# Главная страница
@app.route('/')
def index():
    return app.send_static_file('index.html') if get_credentials() else app.send_static_file('login.html')

# Маршрут для входа через Google OAuth
@app.route('/login')
def login():
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES,
        redirect_uri=f"https://harmonysync.ru/oauth2callback"
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'
    )
    session['state'] = state
    return redirect(authorization_url)

# Маршрут для обработки колбэка OAuth
@app.route('/oauth2callback')
def oauth2callback():
    state = request.args.get('state')
    if state != session.get('state'):
        logger.error("Mismatching state in OAuth callback")
        return "Mismatching state", 400
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES,
        state=state,
        redirect_uri=f"https://harmonysync.ru/oauth2callback"
    )
    try:
        flow.fetch_token(authorization_response=request.url)
        creds = flow.credentials
        save_credentials(creds)
        return redirect(url_for('index'))
    except Exception as e:
        logger.error(f"Error processing OAuth callback: {e}")
        return f"Error processing OAuth callback: {e}", 500

# Маршрут для выхода
@app.route('/api/logout')
def logout():
    try:
        session.clear()
        logger.info("Session cleared successfully.")
        return redirect(url_for('index'))
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        return "An error occurred during logout.", 500

# Маршрут для получения событий календаря
@app.route('/api/calendar/events', methods=['GET'])
@login_required
def get_calendar_events():
    creds = get_credentials()
    service = build('calendar', 'v3', credentials=creds)
    now = saratov_tz.localize(datetime.now()).isoformat()
    future = saratov_tz.localize(datetime.now() + timedelta(days=30)).isoformat()
    try:
        events_result = service.events().list(
            calendarId='primary',
            timeMin=now,
            timeMax=future,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        events = events_result.get('items', [])
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            if start and 'T' in start:
                event['start']['dateTime'] = convert_to_saratov_time(start).isoformat()
            elif start:
                event['start']['date'] = saratov_tz.localize(datetime.fromisoformat(start)).date().isoformat()
            if end and 'T' in end:
                event['end']['dateTime'] = convert_to_saratov_time(end).isoformat()
            elif end:
                event['end']['date'] = saratov_tz.localize(datetime.fromisoformat(end)).date().isoformat()
        logger.info(f"Fetched {len(events)} calendar events.")
        return json.dumps(events, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        logger.error(f"Error fetching calendar events: {e}")
        return jsonify({'error': 'Failed to fetch calendar events', 'details': str(e)}), 500

# Маршрут для получения задач
@app.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    tasks = Task.query.all()
    result = []
    for task in tasks:
        result.append({
            'id': task.id,
            'title': task.title,
            'due': task.due.isoformat() if task.due else None,
            'status': task.status
        })
    return jsonify(result), 200

# Маршрут для создания задачи
@app.route('/api/tasks', methods=['POST'])
@login_required
def create_task():
    data = request.json
    title = data.get('title')
    due_date = data.get('due')  # Дата в формате ISO (например, "2025-02-03")
    due_time = data.get('time')  # Время в формате "HH:mm"

    due_datetime = None
    if due_date and due_time:
        due_datetime = datetime.strptime(f"{due_date} {due_time}", "%Y-%m-%d %H:%M")
        due_datetime = saratov_tz.localize(due_datetime)

    task = Task(id=str(uuid.uuid4()), title=title, due=due_datetime)
    db.session.add(task)
    db.session.commit()
    return jsonify({'message': 'Task created successfully', 'task': task.id}), 201

# Маршрут для удаления задачи
@app.route('/api/tasks/<task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted successfully'}), 204

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000)