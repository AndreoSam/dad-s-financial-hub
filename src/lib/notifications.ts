import { app } from "@/lib/firebase";

export type NotificationSetupResult =
  | { status: "enabled"; token: string }
  | { status: "denied" }
  | { status: "unsupported" };

const TOKEN_STORAGE_KEY = "maturity-notification-token";

export const enableMaturityNotifications = async (): Promise<NotificationSetupResult> => {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { status: "unsupported" };
  }

  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");

  if (!(await isSupported())) return { status: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const registration = await navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}firebase-messaging-sw.js`
  );
  await navigator.serviceWorker.ready;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
  const token = await getToken(getMessaging(app), {
    serviceWorkerRegistration: registration,
    ...(vapidKey ? { vapidKey } : {}),
  });

  if (!token) throw new Error("Firebase did not return a notification token.");

  localStorage.setItem("maturity-notifications-enabled", "true");
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  return { status: "enabled", token };
};

export const getStoredNotificationToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_STORAGE_KEY);

export const maturityNotificationsAreEnabled = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  window.Notification.permission === "granted" &&
  localStorage.getItem("maturity-notifications-enabled") === "true";
