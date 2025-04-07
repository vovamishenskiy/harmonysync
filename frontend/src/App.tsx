/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react';
import axios from 'axios';
import TasksList from './components/TasksList';
import CalendarEvents from './components/CalendarEvents';
// import { auth, provider, signInWithPopup } from './firebase';
import { Browser } from '@capacitor/browser';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  useEffect(() => {
    // Проверяем, есть ли доступ к API (токен OAuth)
    const checkAuth = async () => {
      try {
        // @ts-expect-error: ignore not using response
        const response = await axios.get('/api/auth/check');
        setIsAuthenticated(true); // Если запрос успешен, пользователь авторизован
      } catch (error) {
        console.error('Not authenticated:', error);
        setIsAuthenticated(false); // Если запрос завершился ошибкой, пользователь не авторизован
      }
    };

    checkAuth();
  }, []);

  // Функция для входа через Firebase
  const signInWithGoogle = async () => {
    const clientId = "353222475440-5d5tknk0fvfvo5drmv701ljhv5krmf9j.apps.googleusercontent.com";
    const redirectUri = "https://harmonysync.ru/oauth2callback";

    const scopes = [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar"
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes.join(" "))}&` +
      `access_type=offline&` +
      `prompt=consent`;

    try {
      // Открываем Google Login во встроенном браузере
      await Browser.open({ url: authUrl });

      // Ожидаем редиректа после входа
      Browser.addListener('browserFinished', async () => {
        console.log("Вход выполнен, можно получать токен!");
        // Тут можно обработать токен после логина
      });

    } catch (error) {
      console.error("Ошибка входа:", error);
    }
  };


  // Если пользователь не авторизован, показываем страницу входа
  if (!isAuthenticated) {
    return (
      <div className="App">
        <div className="login-container">
          <h1>HarmonySync</h1>
          <p>Для доступа к приложению выполните авторизацию через Google.</p>
          <div className="login-btns">
            <button onClick={signInWithGoogle}>Войти через Google</button>
          </div>
        </div>
      </div>
    );
  }

  // Если пользователь авторизован, показываем интерфейс
  return (
    <div className="App">
      <h1 className='main-title'>HarmonySync</h1>
      <button onClick={toggleTheme} className='theme-button'>
        {theme === 'light' ?
          <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"></path>
          </svg>
          :
          <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"></path>
          </svg>}
      </button>
      <button onClick={() => window.location.href = '/api/logout'} className="logout-button">
        Выйти
      </button>
      <div className="container">
        <TasksList />
        <CalendarEvents />
      </div>
    </div>
  );
}

export default App;
