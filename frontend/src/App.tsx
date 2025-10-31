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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [, setUserLoading] = useState(false);

  // Получение пользователя
  useEffect(() => {
    const fetchUser = async () => {
      if (isAuthenticated) {
        setUserLoading(true);
        try {
          const response = await axios.get('/api/user');
          setUser(response.data);
        } catch (error) {
          console.error('Error fetching user: ', error);
        } finally {
          setUserLoading(false);
        }
      }
    };
    fetchUser();
  }, [isAuthenticated]);

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
        <div className="logo-title">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="#68B6FF" />
            <path d="M22.2812 11V14M36.7188 11V14M41.875 32V17C41.875 16.2044 41.5491 15.4413 40.9689 14.8787C40.3887 14.3161 39.6018 14 38.7812 14H20.2188C19.3982 14 18.6113 14.3161 18.0311 14.8787C17.4509 15.4413 17.125 16.2044 17.125 17V24.5M41.875 32C41.875 32.7956 41.5491 33.5587 40.9689 34.1213C40.3887 34.6839 39.6018 35 38.7812 35H20.2188C19.3982 35 18.6113 34.6839 18.0311 34.1213M41.875 32V22C41.875 21.2044 41.5491 20.4413 40.9689 19.8787C40.3887 19.3161 39.6018 19 38.7812 19H20.2188C19.3982 19 18.6113 19.3161 18.0311 19.8787C17.4509 20.4413 17.125 21.2044 17.125 22V24.5M17.125 24.5V28.5M29.5 24H29.511V24.0107H29.5V24ZM29.5 27H29.511V27.0107H29.5V27ZM29.5 30H29.511V30.0107H29.5V30ZM26.4062 27H26.4173V27.0107H26.4062V27ZM26.4062 30H26.4173V30.0107H26.4062V30ZM23.3125 27H23.3235V27.0107H23.3125V27ZM23.3125 30H23.3235V30.0107H23.3125V30ZM32.5938 24H32.6048V24.0107H32.5938V24ZM32.5938 27H32.6048V27.0107H32.5938V27ZM32.5938 30H32.6048V30.0107H32.5938V30ZM35.6875 24H35.6985V24.0107H35.6875V24ZM35.6875 27H35.6985V27.0107H35.6875V27Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6.6875 32.05L12.9375 38.05L22.3125 24.55" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <h1 className="main-title">Harmonysync</h1>
        </div>
        <div className="header-actions">
          {user && (
            <div className="user-info">
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M7 15h10a2 2 0 0 1 2 2v4h2v-4a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v4h2v-4a2 2 0 0 1 2-2Z"></path><path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" clip-rule="evenodd" fill-rule="evenodd"></path></svg>
              <span>{user.email}</span>
            </div>
          )}
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