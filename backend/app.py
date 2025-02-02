from flask import Flask, jsonify, request, redirect, url_for, session, send_from_directory
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import os.path
import json
from datetime import datetime, timedelta
import pytz
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

saratov_tz = pytz.timezone('Europe/Saratov')

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)

app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')

@app.route('/')
def index():
    if not get_credentials():
        return redirect(url_for('login'))
    return app.send_static_file('index.html')

@app.route('/login')
def login():
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES, 
        redirect_uri=f"https://harmonysync.ru/oauth2callback"
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    session['state'] = state
    return f"""
    <!DOCTYPE html>
    <html>
      <head>
        <title>HarmonySync - Login</title>
      </head>
      <body>
        <h1>Авторизация через Google</h1>
        <p>Пожалуйста, авторизуйтесь, чтобы получить доступ к данным.</p>
        <a href="{authorization_url}">Войти через Google</a>
      </body>
    </html>
    """

@app.route('/oauth2callback')
def oauth2callback():
    state = session['state']
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json', SCOPES, 
        state=state, 
        redirect_uri=f"https://harmonysync.ru/oauth2callback"
    )
    flow.fetch_token(authorization_response=request.url)
    creds = flow.credentials
    save_credentials(creds)

    try:
        service = build('oauth2', 'v2', credentials=creds)
        user_info = service.userinfo().get().execute()
        session['user_email'] = user_info.get('email', 'unknown@example.com')
    except Exception as e:
        logger.error("Error fetching user info: %s", str(e))
        session['user_email'] = 'unknown@example.com'

    return redirect(url_for('index'))

@app.route('/logout')
def logout():
    if os.path.exists('token.json'):
        os.remove('token.json')
    session.clear()
    return redirect(url_for('login'))

@app.route('/tasks')
def get_taskslists():
    creds = get_credentials()
    if not creds:
        return redirect(url_for('login'))
    service = build('tasks', 'v1', credentials=creds)
    results = service.tasklists().list(maxResults=10).execute()
    tasklists = results.get('items', [])
    return jsonify(tasklists)

@app.route('/calendar/events')
def get_calendar_events():
    creds = get_credentials()
    if not creds:
        return redirect(url_for('login'))
    service = build('calendar', 'v3', credentials=creds)
    now = saratov_tz.localize(datetime.now() - timedelta(days=1)).isoformat()
    future = saratov_tz.localize(datetime.now() + timedelta(days=30)).isoformat()
    events_result = service.events().list(calendarId='primary', timeMin=now, timeMax=future, maxResults=10, singleEvents=True, orderBy='startTime').execute()
    events = events_result.get('items', [])
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
    app.run(host='0.0.0.0', port=5000)