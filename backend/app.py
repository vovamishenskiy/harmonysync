from flask import Flask, jsonify, request, redirect, url_for, session
from functools import wraps
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import os
import json
from datetime import timedelta, datetime
import pytz
import logging
from pymongo import MongoClient
from uuid import uuid4
import threading
import time
from bson import ObjectId

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger('googleapiclient.discovery_cache').setLevel(logging.ERROR)

# Области доступа Google API (только нужные)
SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'  # нужен для openid
]

# Часовой пояс Саратова
saratov_tz = pytz.timezone('Europe/Saratov')

def convert_to_saratov_time(dt_str):
    """Преобразует ISO-строку в datetime с часовым поясом Саратова."""
    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
    return dt.astimezone(saratov_tz)

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)

# Flask приложение
app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

class MongoJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

app.json_encoder = MongoJSONEncoder

# MongoDB
client = MongoClient(
    'mongodb://admin:LIv48nw6KyYbIyPX@localhost:27017/',
    authSource='admin'
)
db = client['harmonysync']
tasklists_collection = db['tasklists']
tasks_collection = db['tasks']
users_collection = db['users']

# Инициализация БД
def initialize_db():
    if not tasklists_collection.find_one({"title": "Мои задачи"}):
        tasklists_collection.insert_one({"id": str(uuid4()), "title": "Мои задачи"})
    if not tasklists_collection.find_one({"title": "Money"}):
        tasklists_collection.insert_one({"id": str(uuid4()), "title": "Money"})
    
    # Уникальный индекс по email
    users_collection.create_index("email", unique=True)

# Декоратор авторизации
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not get_credentials():
            logger.warning("User is not authenticated.")
            return jsonify({'error': 'Unathorized', 'authenticated': False}), 401
        return f(*args, **kwargs)
    return decorated_function

# Получение credentials из сессии
def get_credentials():
    creds_data = session.get('credentials')
    if not creds_data:
        return None
    try:
        if isinstance(creds_data, str):
            creds_dict = json.loads(creds_data)
        else:
            creds_dict = creds_data
        return Credentials.from_authorized_user_info(creds_dict, SCOPES)
    except Exception as e:
        logger.error(f"Invalid credentials format: {e}")
        session.pop('credentials', None)
        return None

# Сохранение credentials в сессию (как dict)
def save_credentials(creds):
    session['credentials'] = creds.to_json()  # dict, не строка!

# Вход через Google
@app.route('/login')
def login():
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES,
        redirect_uri="https://harmonysync.ru/oauth2callback"
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'
    )
    session['state'] = state
    return redirect(authorization_url)

# OAuth callback
@app.route('/oauth2callback')
def oauth2callback():
    state = request.args.get('state')
    if state != session.get('state'):
        logger.error("Mismatching state in OAuth callback")
        return "Mismatching state", 400

    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES,
        state=state,
        redirect_uri="https://harmonysync.ru/oauth2callback"
    )
    try:
        flow.fetch_token(authorization_response=request.url)
        creds = flow.credentials
        save_credentials(creds)

        # Получаем только email
        user_info_service = build('oauth2', 'v2', credentials=creds)
        user_info = user_info_service.userinfo().get().execute()
        email = user_info.get('email', '')

        # Сохраняем в сессию
        session['user'] = {'email': email}

        # Сохраняем в MongoDB
        if email:
            if not users_collection.find_one({'email': email}):
                users_collection.insert_one({
                    '_id': ObjectId(),
                    'email': email,
                    'created_at': datetime.now(saratov_tz).isoformat()
                })
                logger.info(f"New user created: {email}")
            else:
                logger.info(f"User logged in: {email}")

        return redirect('/')
    except Exception as e:
        logger.error(f"Error processing OAuth callback: {e}")
        return f"Error: {e}", 500

# Получение email пользователя
@app.route('/api/user', methods=['GET'])
@login_required
def get_user():
    user = session.get('user', {})
    email = user.get('email')
    if not email:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'email': email}), 200

# Выход
@app.route('/api/logout')
def logout():
    try:
        session.clear()
        logger.info('Session cleared successfully')
        return jsonify({'message': 'Logged out'}), 200
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        return jsonify({'error': 'Logout failed'}), 500

# Проверка авторизации
@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    try:
        creds = get_credentials()
        return jsonify({'authenticated': bool(creds)}), 200
    except Exception as e:
        logger.error(f"Auth check failed: {e}")
        return jsonify({'authenticated': False}), 200

# === Календарь ===
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
        return json.dumps(events, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        logger.error(f"Error fetching calendar events: {e}")
        return jsonify({'error': 'Failed to fetch events', 'details': str(e)}), 500

# === Списки задач ===
@app.route('/api/tasklists', methods=['GET'])
@login_required
def get_tasklists():
    tasklists = list(tasklists_collection.find({}, {'_id': 0}))
    for tl in tasklists:
        if 'id' in tl and isinstance(tl['id'], ObjectId):
            tl['id'] = str(tl['id'])
    return jsonify(tasklists), 200

# === Задачи ===
@app.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    list_id = request.args.get('list_id')
    if not list_id:
        return jsonify({'error': 'Missing list_id'}), 400
    tasks = list(tasks_collection.find({"list_id": list_id}, {'_id': 0}))
    for task in tasks:
        if 'id' in task and isinstance(task['id'], ObjectId):
            task['id'] = str(task['id'])
    return jsonify(tasks), 200

@app.route('/api/tasks', methods=['POST'])
@login_required
def create_task():
    data = request.json
    title = data.get('title', '').strip()
    due_date = data.get('due')
    due_time = data.get('time')
    list_id = data.get('list_id')

    if not list_id:
        return jsonify({'error': 'Missing list_id'}), 400
    if not title:
        return jsonify({'error': 'Missing title'}), 400

    due_datetime = None
    if due_date and due_time:
        due_datetime = saratov_tz.localize(datetime.strptime(f"{due_date} {due_time}", "%Y-%m-%d %H:%M"))
    elif due_date:
        due_datetime = saratov_tz.localize(datetime.strptime(due_date, "%Y-%m-%d"))
    elif due_time:
        today = datetime.now(saratov_tz).date()
        due_datetime = saratov_tz.localize(datetime.strptime(f"{today} {due_time}", "%Y-%m-%d %H:%M"))

    task = {
        "id": str(uuid4()),
        "title": title,
        "due_date": due_date,
        "due_time": due_time,
        "due": due_datetime.isoformat() if due_datetime else None,
        "status": "pending",
        "list_id": list_id,
        "created_at": datetime.now(saratov_tz).isoformat(),
        "updated_at": datetime.now(saratov_tz).isoformat()
    }

    tasks_collection.insert_one(task)
    return jsonify({'message': 'Task created', 'task': {
        "id": task["id"], "title": task["title"], "due_date": task["due_date"],
        "due_time": task["due_time"], "due": task["due"], "status": task["status"],
        "list_id": task["list_id"]
    }}), 201

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    result = tasks_collection.delete_one({"id": task_id})
    if result.deleted_count == 0:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({'message': 'Task deleted'}), 204

@app.route('/api/tasks/<task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    data = request.json
    title = data.get('title')
    due_date = data.get('due')
    due_time = data.get('time')
    status = data.get('status')

    update_data = {}
    if title is not None:
        update_data["title"] = title.strip()
    if status:
        update_data["status"] = status

    due_datetime = None
    if due_date and due_time:
        due_datetime = saratov_tz.localize(datetime.strptime(f"{due_date} {due_time}", "%Y-%m-%d %H:%M"))
    elif due_date:
        due_datetime = saratov_tz.localize(datetime.strptime(due_date, "%Y-%m-%d"))
    elif due_time:
        today = datetime.now(saratov_tz).date()
        due_datetime = saratov_tz.localize(datetime.strptime(f"{today} {due_time}", "%Y-%m-%d %H:%M"))

    if due_datetime:
        update_data["due_date"] = due_date
        update_data["due_time"] = due_time
        update_data["due"] = due_datetime.isoformat()

    update_data["updated_at"] = datetime.now(saratov_tz).isoformat()

    result = tasks_collection.update_one({"id": task_id}, {"$set": update_data})
    if result.matched_count == 0:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({'message': 'Task updated'}), 200

# Архивация старых задач
def archive_completed_tasks():
    while True:
        try:
            cutoff = (datetime.now(saratov_tz) - timedelta(days=30)).isoformat()
            old_tasks = list(tasks_collection.find({
                "status": "completed",
                "updated_at": {"$lt": cutoff}
            }, {'_id': 0}))

            if old_tasks:
                archive_dir = "task_archive"
                os.makedirs(archive_dir, exist_ok=True)
                archive_file = os.path.join(archive_dir, "archive.json")
                archived = []
                if os.path.exists(archive_file):
                    with open(archive_file, "r", encoding="utf-8") as f:
                        archived = json.load(f)
                archived.extend(old_tasks)
                with open(archive_file, "w", encoding="utf-8") as f:
                    json.dump(archived, f, ensure_ascii=False, indent=4)
                tasks_collection.delete_many({
                    "status": "completed",
                    "updated_at": {"$lt": cutoff}
                })
                logger.info(f"Archived {len(old_tasks)} tasks.")
            else:
                logger.info("No tasks to archive.")
        except Exception as e:
            logger.error(f"Archive error: {e}")
        time.sleep(86400)

threading.Thread(target=archive_completed_tasks, daemon=True).start()

# Количество выполненных задач
@app.route('/api/completed_tasks_count', methods=['GET'])
@login_required
def get_completed_tasks_count():
    count = tasks_collection.count_documents({"status": "completed"})
    return jsonify({'completed_tasks_count': count}), 200

# Запуск
if __name__ == '__main__':
    initialize_db()
    app.run(host='0.0.0.0', port=5000)