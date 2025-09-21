// Firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyCLbtvFnFTvm7_d1obz5KDgx9Ifck4uOf4",
  authDomain: "rent-it-forward.firebaseapp.com",
  projectId: "rent-it-forward",
  storageBucket: "rent-it-forward.appspot.com",
  messagingSenderId: "793254315983",
  appId: "1:793254315983:android:ca7bede09f9387f4b2f4ba"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const { notification, data } = payload;
  
  if (!notification?.title) return;

  const notificationTitle = notification.title;
  const notificationOptions = {
    body: notification.body,
    icon: notification.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    image: notification.image,
    data: {
      ...data,
      click_action: data?.click_action || data?.url || '/admin',
    },
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Report',
        icon: '/icons/view-icon.png',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png',
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  // Default action or 'view' action
  const urlToOpen = data?.click_action || data?.url || '/admin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If no existing window/tab, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification dismissal if needed
  const data = event.notification.data;
  if (data?.reportId) {
    // Could send analytics event here
    console.log('Issue report notification dismissed:', data.reportId);
  }
});