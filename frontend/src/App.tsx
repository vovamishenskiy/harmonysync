/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react';
import axios from 'axios';
import TasksList from './components/TasksList';
import CalendarEvents from './components/CalendarEvents';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Проверяем, есть ли доступ к API (токен OAuth)
    const checkAuth = async () => {
      try {
        // @ts-expect-error: ignore not using response
        const response = await axios.get('/api/tasks');
        setIsAuthenticated(true); // Если запрос успешен, пользователь авторизован
      } catch (error) {
        console.error('Not authenticated:', error);
        setIsAuthenticated(false); // Если запрос завершился ошибкой, пользователь не авторизован
      }
    };

    checkAuth();
  }, []);

  // Если пользователь не авторизован, показываем страницу входа
  if (!isAuthenticated) {
    return (
      <div className="App">
        <h1>HarmonySync</h1>
        <p>Для доступа к приложению выполните авторизацию через Google.</p>
        <a href="/login" className="login-button">
          Войти через Google
        </a>
      </div>
    );
  }

  // Если пользователь авторизован, показываем интерфейс
  return (
    <div className="App">
      <h1>HarmonySync</h1>
      <button onClick={() => window.location.href = '/logout'} className="logout-button">
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