/* global firebase */
importScripts("https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAz6DBBiz_Pyv_CZ6M5a7q_9VPOUP46Hdk",
  authDomain: "fd-tracker-58039.firebaseapp.com",
  projectId: "fd-tracker-58039",
  storageBucket: "fd-tracker-58039.firebasestorage.app",
  messagingSenderId: "930496453382",
  appId: "1:930496453382:web:35892e847454f660821c87",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || "FD maturity reminder";
  const options = {
    body: payload.data?.body || "A fixed deposit is approaching maturity.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.data?.tag || "fd-maturity-reminder",
    data: { url: payload.data?.url || "/" },
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
