from flask import Flask, jsonify, request, redirect, url_for, session, send_from_directory
from flask_cors import CORS
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import os.path
import json
from datetime import datetime, timedelta
import pytz

SCOPES = ['https://www.googleapis.com/auth/tasks', 'https://www.googleapis.com/auth/calendar.readonly']

def get_credentials():
    creds = None
    if os.path.exists('token.json'):
        with open('token.json', 'r') as token:
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    return creds

def save_credentials(creds):
    with open('token.json', 'w') as token:
        token.write(creds.to_json())

# Определение часового пояса Саратова
saratov_tz = pytz.timezone('Europe/Saratov')

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')  # Используем переменную окружения

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/authorize')
def authorize():
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES, redirect_uri=url_for('oauth2callback', _external=True, _scheme='https'))
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true')
    session['state'] = state
    return redirect(authorization_url)

@app.route('/oauth2callback')
def oauth2callback():
    state = session['state']
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES, state=state, redirect_uri=url_for('oauth2callback', _external=True, _scheme='https'))
    flow.fetch_token(authorization_response=request.url)
    creds = flow.credentials
    save_credentials(creds)
    return 'Authorization complete. You can close this window.'

@app.route('/tasks')
def get_taskslists():
    creds = get_credentials()
    if not creds:
        return redirect(url_for('authorize'))
    service = build('tasks', 'v1', credentials=creds)
    results = service.tasklists().list(maxResults=10).execute()
    tasklists = results.get('items', [])
    return jsonify(tasklists)

@app.route('/tasks/<tasklist_id>/tasks')
def get_tasks(tasklist_id):
    creds = get_credentials()
    if not creds:
        return redirect(url_for('authorize'))
    service = build('tasks', 'v1', credentials=creds)
    tasks_result = service.tasks().list(tasklist=tasklist_id).execute()
    tasks = tasks_result.get('items', [])
    
    for task in tasks:
        if 'due' in task and task['due']:
            due_date = datetime.strptime(task['due'], '%Y-%m-%dT%H:%M:%S.%fZ')
            task['due'] = saratov_tz.localize(due_date).isoformat()

    return json.dumps(tasks, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}

@app.route('/tasks/<tasklist_id>/tasks/<task_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_task(tasklist_id, task_id):
    creds = get_credentials()
    if not creds:
        return redirect(url_for('authorize'))
    service = build('tasks', 'v1', credentials=creds)
    
    if request.method == 'GET':
        task = service.tasks().get(tasklist=tasklist_id, task=task_id).execute()
        if 'due' in task and task['due']:
            due_date = datetime.strptime(task['due'], '%Y-%m-%dT%H:%M:%S.%fZ')
            task['due'] = saratov_tz.localize(due_date).isoformat()
        return json.dumps(task, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}
    
    elif request.method == 'PUT':
        data = request.json
        updated_task = service.tasks().update(tasklist=tasklist_id, task=task_id, body=data).execute()
        if 'due' in updated_task and updated_task['due']:
            due_date = datetime.strptime(updated_task['due'], '%Y-%m-%dT%H:%M:%S.%fZ')
            updated_task['due'] = saratov_tz.localize(due_date).isoformat()
        return json.dumps(updated_task, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}
    
    elif request.method == 'DELETE':
        service.tasks().delete(tasklist=tasklist_id, task=task_id).execute()
        return jsonify({'message': 'Задача успешно удалена'}), 204

@app.route('/calendar/events')
def get_calendar_events():
    creds = get_credentials()
    if not creds:
        return redirect(url_for('authorize'))
    
    service = build('calendar', 'v3', credentials=creds)
    
    # Текущее время в часовом поясе Саратова
    now = saratov_tz.localize(datetime.now() - timedelta(days=1)).isoformat()
    future = saratov_tz.localize(datetime.now() + timedelta(days=30)).isoformat()
    
    events_result = service.events().list(calendarId='primary', timeMin=now, timeMax=future,  maxResults=10, singleEvents=True, orderBy='startTime').execute()
    events = events_result.get('items', [])
    
    # Преобразование времени в часовом поясе Саратова
    for event in events:
        start = event['start'].get('dateTime', event['start'].get('date'))
        end = event['end'].get('dateTime', event['end'].get('date'))
        if start and 'T' in start:
            start_datetime = datetime.fromisoformat(start.replace('Z', '+00:00'))
            event['start']['dateTime'] = saratov_tz.localize(start_datetime).isoformat()
        elif start:
            event['start']['date'] = saratov_tz.localize(datetime.fromisoformat(start)).date().isoformat()
        
        if end and 'T' in end:
            end_datetime = datetime.fromisoformat(end.replace('Z', '+00:00'))
            event['end']['dateTime'] = saratov_tz.localize(end_datetime).isoformat()
        elif end:
            event['end']['date'] = saratov_tz.localize(datetime.fromisoformat(end)).date().isoformat()

    return json.dumps(events, cls=DateTimeEncoder), 200, {'Content-Type': 'application/json'}

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)