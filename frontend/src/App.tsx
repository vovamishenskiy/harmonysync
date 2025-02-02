import { useEffect, useState } from 'react';
import axios from 'axios';
import TasksList from './components/TasksList';
import CalendarEvents from './components/CalendarEvents';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get('/api/tasks');
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Not authenticated:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  if (!isAuthenticated) {
    return (
      <div className="App">
        <h1>HarmonySync</h1>
        <p>Для доступа к приложению выполните авторизацию через Google.</p>
        <a href="/api/login" className="login-button">
          Войти через Google
        </a>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>HarmonySync</h1>
      <button onClick={handleLogout} className="logout-button">
        Выйти
      </button>
      <div className="container">
        <div>
          <TasksList />
        </div>
        <div>
          <CalendarEvents />
        </div>
      </div>
    </div>
  );
}

export default App;