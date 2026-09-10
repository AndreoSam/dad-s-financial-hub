import { app } from "@/lib/firebase";

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
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { status: "unsupported" };
  }

  const [{ getMessaging, getToken, isSupported }, { getFunctions, httpsCallable }] =
    await Promise.all([import("firebase/messaging"), import("firebase/functions")]);

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

  const registerToken = httpsCallable(
    getFunctions(app, "asia-south1"),
    "registerNotificationToken"
  );
  try {
    await registerToken({
      token,
      platform: getPlatform(),
      userAgent: navigator.userAgent.slice(0, 500),
    });
  } catch (error) {
    throw new Error("The notification server is not deployed or cannot be reached.", {
      cause: error,
    });
  }

  localStorage.setItem("maturity-notifications-enabled", "true");
  return { status: "enabled" };
};

export const maturityNotificationsAreEnabled = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  window.Notification.permission === "granted" &&
  localStorage.getItem("maturity-notifications-enabled") === "true";
