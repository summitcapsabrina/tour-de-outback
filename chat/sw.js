/* Service worker for the Tour de Outback admin chat PWA.
 * Standard Web Push (VAPID) — no Firebase Cloud Messaging. Shows a notification
 * when a push arrives (even when the installed app is fully closed) and makes the
 * app installable. */

self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'Tour de Outback chat', body: (event.data && event.data.text()) || '' }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Tour de Outback chat', {
      body: data.body || '',
      icon: '/images/logo-square-black.png',
      badge: '/favicon-32x32.png',
      tag: data.cid || 'tdo-chat',        // collapse repeats for the same chat
      renotify: true,
      requireInteraction: true,           // stays until the operator acts
      data: { link: data.link || '/chat/' },
    })
  );
});

// Tapping the notification focuses the open app (and jumps to the chat) or opens it.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var link = (event.notification.data && event.notification.data.link) || '/chat/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.url.indexOf('/chat') !== -1 && 'focus' in c) { c.postMessage({ type: 'open', link: link }); return c.focus(); }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });
