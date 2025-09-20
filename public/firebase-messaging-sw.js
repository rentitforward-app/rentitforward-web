/**
 * Firebase Cloud Messaging Service Worker
 * 
 * Handles background notifications when the web app is not in focus
 * This file must be in the public directory and accessible at /firebase-messaging-sw.js
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (same as client config)
const firebaseConfig = {
  apiKey: "AIzaSyDhvS1ehe17M4n9tLRglTOdilNFoeHoAhk",
  authDomain: "rent-it-forward.firebaseapp.com",
  projectId: "rent-it-forward",
  storageBucket: "rent-it-forward.firebasestorage.app",
  messagingSenderId: "793254315983",
  appId: "1:793254315983:web:0ebecd3361ddb687b2f4ba",
  measurementId: "G-QDDX5CQFHJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const { notification, data } = payload;
  
  if (!notification) return;

  // Customize notification
  const notificationTitle = notification.title || 'Rent It Forward';
  const notificationOptions = {
    body: notification.body || 'You have a new notification',
    icon: notification.icon || '/icons/notification-icon-192.png',
    image: notification.image,
    badge: '/icons/notification-badge-72.png',
    tag: data?.type || 'general',
    requireInteraction: data?.priority === 'high',
    data: {
      ...data,
      click_action: data?.action_url || '/',
      fcm_message_id: data?.fcm_message_id,
    },
    actions: getNotificationActions(data?.type),
    timestamp: Date.now(),
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  const { notification, action } = event;
  const data = notification.data || {};
  
  event.notification.close();

  // Handle action buttons
  if (action) {
    handleNotificationAction(action, data);
    return;
  }

  // Handle main notification click
  const clickAction = data.click_action || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url.includes(new URL(clickAction, self.location.origin).pathname) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(clickAction);
        }
      })
      .then(() => {
        // Track notification click
        trackNotificationClick(data.fcm_message_id);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  const data = event.notification.data || {};
  
  // Track notification dismissal (optional)
  trackNotificationDismissal(data.fcm_message_id);
});

/**
 * Get notification actions based on type
 */
function getNotificationActions(type) {
  switch (type) {
    case 'booking_request':
      return [
        { action: 'approve', title: 'Approve', icon: '/icons/check-24.png' },
        { action: 'reject', title: 'Reject', icon: '/icons/x-24.png' },
      ];
    case 'message_received':
      return [
        { action: 'reply', title: 'Reply', icon: '/icons/reply-24.png' },
        { action: 'view', title: 'View', icon: '/icons/eye-24.png' },
      ];
    case 'booking_confirmed':
    case 'booking_cancelled':
    case 'payment_received':
      return [
        { action: 'view', title: 'View Details', icon: '/icons/eye-24.png' },
      ];
    default:
      return [
        { action: 'view', title: 'View', icon: '/icons/eye-24.png' },
      ];
  }
}

/**
 * Handle notification action button clicks
 */
function handleNotificationAction(action, data) {
  let actionUrl = '/';
  
  switch (action) {
    case 'approve':
      actionUrl = `/dashboard/bookings/${data.booking_id}?action=approve`;
      break;
    case 'reject':
      actionUrl = `/dashboard/bookings/${data.booking_id}?action=reject`;
      break;
    case 'reply':
      actionUrl = `/messages/${data.conversation_id || data.booking_id}`;
      break;
    case 'view':
      actionUrl = data.click_action || '/notifications';
      break;
    default:
      actionUrl = data.click_action || '/';
  }
  
  // Open the appropriate page
  clients.openWindow(actionUrl);
  
  // Track action
  trackNotificationAction(data.fcm_message_id, action);
}

/**
 * Track notification click for analytics
 */
function trackNotificationClick(messageId) {
  if (!messageId) return;
  
  fetch('/api/notifications/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fcm_message_id: messageId,
      delivery_status: 'clicked',
      clicked_at: new Date().toISOString(),
    }),
  }).catch((error) => {
    console.error('Error tracking notification click:', error);
  });
}

/**
 * Track notification action for analytics
 */
function trackNotificationAction(messageId, action) {
  if (!messageId) return;
  
  fetch('/api/notifications/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fcm_message_id: messageId,
      delivery_status: 'clicked',
      clicked_at: new Date().toISOString(),
      notification_data: { action_taken: action },
    }),
  }).catch((error) => {
    console.error('Error tracking notification action:', error);
  });
}

/**
 * Track notification dismissal for analytics
 */
function trackNotificationDismissal(messageId) {
  if (!messageId) return;
  
  fetch('/api/notifications/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fcm_message_id: messageId,
      delivery_status: 'dismissed',
      clicked_at: new Date().toISOString(),
    }),
  }).catch((error) => {
    console.error('Error tracking notification dismissal:', error);
  });
}

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('FCM Service Worker installing...');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('FCM Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle push events (backup for FCM)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (!event.data) return;
  
  try {
    const payload = event.data.json();
    const { notification, data } = payload;
    
    if (notification) {
      const notificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icons/notification-icon-192.png',
        image: notification.image,
        badge: '/icons/notification-badge-72.png',
        tag: data?.type || 'general',
        data: data || {},
      };
      
      event.waitUntil(
        self.registration.showNotification(
          notification.title || 'Rent It Forward',
          notificationOptions
        )
      );
    }
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});
