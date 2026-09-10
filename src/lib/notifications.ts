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

  const { deleteToken, getMessaging, getToken, isSupported } = await import("firebase/messaging");

  if (!(await isSupported())) return { status: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const registration = await navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}firebase-messaging-sw.js`
  );
  await navigator.serviceWorker.ready;
  await registration.update();

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    throw new Error("The Firebase Web Push public key is missing from Vercel.");
  }

  const messaging = getMessaging(app);
  const getCurrentToken = () =>
    getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey,
    });

  let token: string;
  try {
    token = await getCurrentToken();
  } catch (error) {
    // Browsers keep the PushSubscription after a VAPID key is changed. Firebase
    // then attempts to reuse it and PushManager rejects the new key. Clear the
    // stale browser/FCM state once and retry with the configured public key.
    if (!(error instanceof DOMException) || error.name !== "InvalidAccessError") {
      throw error;
    }

    try {
      await deleteToken(messaging);
    } catch {
      // There may be no Firebase token yet even though PushManager has a
      // subscription, so continue with the browser-level cleanup below.
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    await existingSubscription?.unsubscribe();
    token = await getCurrentToken();
  }

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
