import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import axios from 'axios';

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && window.location.pathname !== '/') {
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')!).render(
  <App />
);