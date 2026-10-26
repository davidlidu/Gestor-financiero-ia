// Manejo de notificaciones push. El service worker generado por vite-plugin-pwa lo importa (workbox.importScripts).
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'DeerSystems Finanzas';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    })
  );
});

// Al tocar la notificación: abrir (o enfocar) la app en la vista indicada
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin)) {
          return client.focus().then((c) => (c && 'navigate' in c ? c.navigate(url) : c)).catch(() => {});
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
