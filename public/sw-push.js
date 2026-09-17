// AgroIntel PWA Web Push Notification Handler
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {
      title: 'AgroIntel — Mandi Alert',
      body: event.data ? event.data.text() : 'A commodity has reached your target price!'
    };
  }

  const title = payload.title || 'AgroIntel — Mandi Alert';
  const options = {
    body: payload.body || 'A commodity has reached your target price!',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    vibrate: [200, 100, 200],
    data: payload.data || { url: '/?tab=mandi' },
    actions: [
      { action: 'view', title: '🌾 View Mandi Prices' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/?tab=mandi';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
