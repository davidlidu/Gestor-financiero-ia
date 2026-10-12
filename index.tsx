import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Mantiene al día la app instalada (PWA). Sin esto el service worker nuevo se instala pero la página abierta
// sigue con el JavaScript viejo: en iPhone la app se suspende y reanuda, y podía quedarse días en una versión anterior.
// En modo autoUpdate, al activarse una versión nueva la página se recarga sola.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => { registration.update().catch(() => { /* sin conexión: se reintenta luego */ }); };
    // Al volver a abrir/reanudar la app y cada hora
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    setInterval(checkForUpdate, 60 * 60 * 1000);
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);