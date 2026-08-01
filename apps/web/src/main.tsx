import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { connectSocket } from './lib/socket';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

connectSocket();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
