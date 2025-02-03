from flask import Flask, jsonify, request, redirect, url_for, session, send_from_directory
from functools import wraps
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import os.path
import json
from datetime import datetime, timedelta
import pytz
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger('googleapiclient.discovery_cache').setLevel(logging.ERROR)

# Области доступа Google API
SCOPES = ['https://www.googleapis.com/auth/tasks', 'https://www.googleapis.com/auth/calendar']

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

def login_required(f):
    """Декоратор для проверки авторизации пользователя."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not get_credentials():
            logger.warning("User is not authenticated.")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_credentials():
    """Получает токен из сессии."""
    creds_data = session.get('credentials')
    return Credentials.from_authorized_user_info(creds_data) if creds_data else None

def save_credentials(creds):
    """Сохраняет токен в сессии."""
    session['credentials'] = json.loads(creds.to_json())

@app.route('/')
def index():
    """Главная страница."""
    return app.send_static_file('index.html') if get_credentials() else app.send_static_file('login.html')

@app.route('/login')
def login():
    """Маршрут для входа через Google OAuth."""
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES,
        redirect_uri=f"https://harmonysync.ru/oauth2callback"
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        # include_granted_scopes='true',
        prompt='consent'
    )
    session['state'] = state
    return redirect(authorization_url)

@app.route('/oauth2callback')
def oauth2callback():
    """Маршрут для обработки колбэка OAuth."""
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

@app.route('/api/logout')
def logout():
    """Маршрут для выхода."""
    try:
        session.clear()
        logger.info("Session cleared successfully.")
        return redirect(url_for('index'))
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        return "An error occurred during logout.", 500

@app.route('/api/tasks')
@login_required
def get_tasklists():
    """Маршрут для получения списков задач."""
    logger.info("Fetching tasklists...")
    creds = get_credentials()
    service = build('tasks', 'v1', credentials=creds)
    try:
        results = service.tasklists().list(maxResults=10).execute()
        tasklists = results.get('items', [])
        logger.info(f"Fetched {len(tasklists)} tasklists.")
        return jsonify(tasklists)
    except Exception as e:
        logger.error(f"Error fetching tasklists: {e}")
        return jsonify({'error': 'Failed to fetch tasklists', 'details': str(e)}), 500

@app.route('/api/tasks/<tasklist_id>/tasks', methods=['GET'])
@login_required
def get_tasks(tasklist_id):
    """Маршрут для получения задач из списка."""
    logger.info(f"Fetching tasks for tasklist ID: {tasklist_id}")
    creds = get_credentials()
    service = build('tasks', 'v1', credentials=creds)
    try:
        tasks_result = service.tasks().list(tasklist=tasklist_id).execute()
        tasks = tasks_result.get('items', [])
        for task in tasks:
            if 'due' in task and task['due']:
                due_date = datetime.strptime(task['due'], '%Y-%m-%dT%H:%M:%S.%fZ')
                task['due'] = saratov_tz.localize(due_date).isoformat()
        logger.info(f"Fetched {len(tasks)} tasks for tasklist ID: {tasklist_id}")
        return json.dumps(tasks, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        logger.error(f"Error fetching tasks: {e}")
        return jsonify({'error': 'Failed to fetch tasks', 'details': str(e)}), 500

@app.route('/api/tasks/<tasklist_id>/tasks', methods=['POST'])
@login_required
def add_task(tasklist_id):
    """Маршрут для создания задачи."""
    logger.info(f"Adding a new task to tasklist ID: {tasklist_id}")
    creds = get_credentials()
    data = request.json
    title = data.get('title')
    due_time = data.get('dueTime')  # Время уведомления в формате "HH:mm"

    # Преобразуем время в формат RFC 3339
    due_datetime = None
    if due_time:
        now = datetime.now(saratov_tz)
        due_datetime = datetime.strptime(f"{now.date()} {due_time}", "%Y-%m-%d %H:%M")
        due_datetime = saratov_tz.localize(due_datetime)

    # Создаём задачу в Google Tasks
    service = build('tasks', 'v1', credentials=creds)
    task = {
        'title': title,
        'due': due_datetime.isoformat() if due_datetime else None,
    }

    try:
        task_response = service.tasks().insert(tasklist=tasklist_id, body=task).execute()
        logger.info(f"Task created successfully: {task_response}")
        return jsonify(task_response), 201
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        return jsonify({'error': 'Failed to create task', 'details': str(e)}), 500

@app.route('/api/tasks/<tasklist_id>/tasks/<task_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def manage_task(tasklist_id, task_id):
    """Маршрут для управления задачей (получение, обновление, удаление)."""
    try:
        creds = get_credentials()
        service = build('tasks', 'v1', credentials=creds)
        if request.method == 'GET':
            logger.info(f"Fetching task with ID: {task_id} from tasklist ID: {tasklist_id}")
            task = service.tasks().get(tasklist=tasklist_id, task=task_id).execute()
            if 'due' in task and task['due']:
                due_date = datetime.strptime(task['due'], '%Y-%m-%dT%H:%M:%S.%fZ')
                task['due'] = saratov_tz.localize(due_date).isoformat()
            logger.info(f"Fetched task ID: {task_id}")
            return json.dumps(task, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}
        elif request.method == 'PUT':
            logger.info(f"Updating task with ID: {task_id} in tasklist ID: {tasklist_id}")
            data = request.json
            updated_task = service.tasks().update(tasklist=tasklist_id, task=task_id, body=data).execute()
            if 'due' in updated_task and updated_task['due']:
                due_date = datetime.strptime(updated_task['due'], '%Y-%m-%dT%H:%M:%S.%fZ')
                updated_task['due'] = saratov_tz.localize(due_date).isoformat()
            logger.info(f"Updated task ID: {task_id}")
            return json.dumps(updated_task, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}
        elif request.method == 'DELETE':
            logger.info(f"Deleting task with ID: {task_id} from tasklist ID: {tasklist_id}")
            service.tasks().delete(tasklist=tasklist_id, task=task_id).execute()
            logger.info(f"Deleted task ID: {task_id}")
            return jsonify({'message': 'Задача успешно удалена'}), 204
    except Exception as e:
        logger.error(f"Error managing task: {e}")
        return jsonify({'error': 'Failed to manage task', 'details': str(e)}), 500

@app.route('/api/calendar/events', methods=['GET'])
@login_required
def get_calendar_events():
    """Маршрут для получения событий календаря."""
    logger.info("Fetching calendar events...")
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)