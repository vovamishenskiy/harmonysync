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

# Области доступа Google API
SCOPES = ['https://www.googleapis.com/auth/tasks', 'https://www.googleapis.com/auth/calendar.readonly']

# Определение часового пояса Саратова
saratov_tz = pytz.timezone('Europe/Saratov')

def convert_to_saratov_time(dt_str):
    # Преобразуем строку в объект datetime
    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))

    # Если объект уже имеет часовой пояс, преобразуем его в Saratov TZ
    if dt.tzinfo:
        return dt.astimezone(saratov_tz)
    else:
        # Если объект "наивный", добавляем часовой пояс UTC, затем преобразуем в Saratov TZ
        return pytz.utc.localize(dt).astimezone(saratov_tz)

# Класс для сериализации объектов datetime в JSON
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)

# Создание приложения Flask
app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not get_credentials():
            # Если пользователь не авторизован, перенаправляем на страницу входа
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Функция для получения токена из сессии
def get_credentials():
    creds_data = session.get('credentials')
    if not creds_data:
        return None
    return Credentials.from_authorized_user_info(creds_data)

# Функция для сохранения токена в сессии
def save_credentials(creds):
    session['credentials'] = json.loads(creds.to_json())

# Главная страница
@app.route('/')
def index():
    # Проверяем наличие токена
    if not get_credentials():
        # Если токена нет, возвращаем страницу авторизации
        return app.send_static_file('login.html')
    
    # Если токен есть, возвращаем главную страницу
    return app.send_static_file('index.html')

# Маршрут для входа через Google OAuth
@app.route('/login')
def login():
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES,
        redirect_uri=f"https://harmonysync.ru/oauth2callback"
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
	prompt='consent'
    )
    session['state'] = state  # Сохраняем состояние в сессии
    return redirect(authorization_url)

# Маршрут для обработки колбэка OAuth
@app.route('/oauth2callback')
def oauth2callback():
    # Проверяем состояние (state) из запроса
    state = request.args.get('state')
    if state != session.get('state'):
        logger.error("Mismatching state in OAuth callback")
        return "Mismatching state", 400

    # Создаём поток OAuth
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES,
        state=state,
        redirect_uri=f"https://harmonysync.ru/oauth2callback"
    )

    try:
        # Обмениваем код на токены
        flow.fetch_token(authorization_response=request.url)
        creds = flow.credentials

        # Сохраняем токен
        save_credentials(creds)

        # Перенаправляем пользователя на главную страницу
        return redirect(url_for('index'))
    except Exception as e:
        logger.error(f"Error processing OAuth callback: {e}")
        return f"Error processing OAuth callback: {e}", 500

@app.route('/api/calendar/create-task-calendar')
@login_required
def create_task_calendar():
    creds = get_credentials()
    service = build('calendar', 'v3', credentials=creds)
    try:
        calendar = {
            'summary': 'Task Calendar',
            'timeZone': 'Europe/Saratov'
        }
        created_calendar = service.calendars().insert(body=calendar).execute()
        logger.info(f"Created task calendar: {created_calendar['id']}")
        return jsonify(created_calendar, created_calendar['id']), 201
    except Exception as e:
        logger.error(f"Error creating task calendar: {e}")
        return jsonify({'error': 'Failed to create task calendar', 'details': str(e)}), 500

# Маршрут для выхода
@app.route('/api/logout')
def logout():
    try:
        # Удаляем файл токена, если он существует
        if os.path.exists('token.json'):
            os.remove('token.json')
            logger.info("Token file deleted successfully.")

        # Очищаем сессию
        session.clear()
        logger.info("Session cleared successfully.")

        # Перенаправляем пользователя на главную страницу
        return redirect(url_for('index'))
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        return "An error occurred during logout.", 500

# Маршрут для получения списков задач
@app.route('/api/tasks')
@login_required
def get_taskslists():
    logger.info("Fetching tasklists...")
    creds = get_credentials()
    if not creds or not creds.valid:
        logger.warning("User is not authenticated.")
        return redirect(url_for('login'))

    try:
        service = build('tasks', 'v1', credentials=creds)
        results = service.tasklists().list(maxResults=10).execute()
        tasklists = results.get('items', [])
        logger.info(f"Fetched {len(tasklists)} tasklists.")
        return jsonify(tasklists)
    except Exception as e:
        logger.error(f"Error fetching tasklists: {e}")
        return f"Error fetching tasklists: {e}", 500

@app.route('/api/tasks/<tasklist_id>/tasks')
@login_required
def get_tasks(tasklist_id):
    logger.info(f"Fetching tasks for tasklist ID: {tasklist_id}")
    creds = get_credentials()
    if not creds or not creds.valid:
        logger.warning("User is not authenticated.")
        return redirect(url_for('login'))

    try:
        # Получаем события из календаря
        calendar_service = build('calendar', 'v3', credentials=creds)
        calendar_id = 'your-task-calendar-id'  # ID вашего календаря для задач
        now = saratov_tz.localize(datetime.now()).isoformat()
        events_result = calendar_service.events().list(
            calendarId=calendar_id,
            timeMin=now,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        events = events_result.get('items', [])

        # Преобразуем события в задачи
        tasks = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            task = {
                'id': event['id'],
                'title': event['summary'],
                'due': start,
                'time': datetime.fromisoformat(start).strftime('%H:%M') if 'T' in start else None,
            }
            tasks.append(task)

        logger.info(f"Fetched {len(tasks)} tasks from the calendar.")
        return json.dumps(tasks, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        logger.error(f"Error fetching tasks from calendar: {e}")
        return jsonify({'error': 'Failed to fetch tasks', 'details': str(e)}), 500

@app.route('/api/tasks/<tasklist_id>/tasks', methods=['POST'])
@login_required
def add_task(tasklist_id):
    logger.info(f"Adding a new task to tasklist ID: {tasklist_id}")
    creds = get_credentials()
    if not creds or not creds.valid:
        logger.warning("User is not authenticated.")
        return redirect(url_for('login'))

    data = request.json
    title = data.get('title')
    due_date = data.get('due')  # Дата в формате ISO (например, "2025-02-03")
    due_time = data.get('time')  # Время в формате "HH:mm" (например, "12:00")

    # Преобразуем дату и время в формат RFC 3339
    due_datetime = None
    if due_date and due_time:
        due_datetime = datetime.strptime(f"{due_date} {due_time}", "%Y-%m-%d %H:%M")
        due_datetime = saratov_tz.localize(due_datetime)

    # Создаём событие в календаре
    calendar_service = build('calendar', 'v3', credentials=creds)
    event = {
        'summary': title,
        'start': {
            'dateTime': due_datetime.isoformat() if due_datetime else None,
            'timeZone': 'Europe/Saratov',
        },
        'end': {
            'dateTime': due_datetime.isoformat() if due_datetime else None,
            'timeZone': 'Europe/Saratov',
        },
        'description': f"Task for list ID: {tasklist_id}",
    }

    calendar_id = 'your-task-calendar-id'
    try:
        event_response = calendar_service.events().insert(calendarId=calendar_id, body=event).execute()
        logger.info(f"Event created successfully: {event_response}")
        return jsonify(event_response), 201
    except Exception as e:
        logger.error(f"Error creating event: {e}")
        return jsonify({'error': 'Failed to create event', 'details': str(e)}), 500

@app.route('/api/tasks/<tasklist_id>/tasks/<task_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def manage_task(tasklist_id, task_id):
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
    except HttpError as e:
        logger.error(f"HTTP error managing task: {e}")
        return jsonify({'error': 'Failed to manage task', 'details': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error managing task: {e}")
        return jsonify({'error': 'An unexpected error occurred', 'details': str(e)}), 500

# Маршрут для получения событий календаря
@app.route('/api/calendar/events')
@login_required
def get_calendar_events():
    creds = get_credentials()
    service = build('calendar', 'v3', credentials=creds)

    now = saratov_tz.localize(datetime.now() - timedelta(days=1)).isoformat()
    future = saratov_tz.localize(datetime.now() + timedelta(days=30)).isoformat()

    events_result = service.events().list(
        calendarId='primary',
        timeMin=now,
        timeMax=future,
        maxResults=10,
        singleEvents=True,
        orderBy='startTime'
    ).execute()

    events = events_result.get('items', [])
    for event in events:
        start = event['start'].get('dateTime', event['start'].get('date'))
        end = event['end'].get('dateTime', event['end'].get('date'))

        if start and 'T' in start:
            start_datetime = convert_to_saratov_time(start)
            event['start']['dateTime'] = start_datetime.isoformat()
        elif start:
            event['start']['date'] = saratov_tz.localize(datetime.fromisoformat(start)).date().isoformat()

        if end and 'T' in end:
            end_datetime = convert_to_saratov_time(end)
            event['end']['dateTime'] = end_datetime.isoformat()
        elif end:
            event['end']['date'] = saratov_tz.localize(datetime.fromisoformat(end)).date().isoformat()

    return json.dumps(events, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
