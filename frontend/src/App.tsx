import { useEffect, useState } from 'react';
import axios from 'axios';
import TasksList from './components/TasksList';
import CalendarEvents from './components/CalendarEvents';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  // Применение темы
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Проверка авторизации
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get('/api/auth/check', { withCredentials: true });
        setIsAuthenticated(true);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Вход через Google (OAuth)
  const signInWithGoogle = () => {
    window.location.href = '/login';
  };

  // Выход
  const handleLogout = async () => {
    try {
      await axios.get('/api/logout', { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      window.location.href = '/';
    }
  };

  // Загрузка
  if (isLoading) {
    return (
      <div className="App loading">
        <div className="loader">Загрузка...</div>
      </div>
    );
  }

  // Страница входа
  if (!isAuthenticated) {
    return (
      <div className="App">
        <div className="login-container">
          <h1>HarmonySync</h1>
          <p>Для доступа к приложению выполните авторизацию через Google.</p>
          <div className="login-btns">
            <button onClick={signInWithGoogle} className="google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66v-2.77h-3.57c-1.04.7-2.31 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 6.5c1.61 0 3.05.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.41 6.16-4.41z" fill="#EA4335" />
              </svg>
              Войти через Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Основной интерфейс
  return (
    <div className="App">
      <header className="app-header">
        <h1 className="main-title">HarmonySync</h1>
        <div className="header-actions">
          <button onClick={toggleTheme} className="theme-button" aria-label="Переключить тему">
            {theme === 'light' ? (
              <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"></path>
              </svg>
            ) : (
              <svg fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"></path>
              </svg>
            )}
          </button>
          <button onClick={handleLogout} className="logout-button">
            Выйти
          </button>
        </div>
      </header>

      <main className="container">
        <TasksList />
        <CalendarEvents />
      </main>
    </div>
  );
}

export default App;