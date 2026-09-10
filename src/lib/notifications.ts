import { httpsCallable, getFunctions } from "firebase/functions";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app } from "@/lib/firebase";

const functions = getFunctions(app, "asia-south1");

export type NotificationSetupResult =
  | { status: "enabled" }
  | { status: "denied" }
  | { status: "unsupported" };

const getPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
  return "desktop";
};

export const enableMaturityNotifications = async (): Promise<NotificationSetupResult> => {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported())) {
    return { status: "unsupported" };
  }

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

  const registerToken = httpsCallable(functions, "registerNotificationToken");
  await registerToken({
    token,
    platform: getPlatform(),
    userAgent: navigator.userAgent.slice(0, 500),
  });

  localStorage.setItem("maturity-notifications-enabled", "true");
  return { status: "enabled" };
};

export const maturityNotificationsAreEnabled = () =>
  typeof window !== "undefined" &&
  Notification.permission === "granted" &&
  localStorage.getItem("maturity-notifications-enabled") === "true";
