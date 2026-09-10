import { app, db } from "@/lib/firebase";

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

const tokenDocumentId = async (token: string) => {
  const bytes = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export const enableMaturityNotifications = async (): Promise<NotificationSetupResult> => {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { status: "unsupported" };
  }

  const [{ getMessaging, getToken, isSupported }, { doc, serverTimestamp, setDoc }] =
    await Promise.all([import("firebase/messaging"), import("firebase/firestore")]);

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

  try {
    const subscriptionId = await tokenDocumentId(token);
    await setDoc(
      doc(db, "notificationSubscriptions", subscriptionId),
      {
        token,
        platform: getPlatform(),
        userAgent: navigator.userAgent.slice(0, 500),
        enabled: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    throw new Error(
      "Firestore blocked notification registration. Publish the included Firestore rules, then try again.",
      { cause: error }
    );
  }

  localStorage.setItem("maturity-notifications-enabled", "true");
  return { status: "enabled" };
};

export const maturityNotificationsAreEnabled = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  window.Notification.permission === "granted" &&
  localStorage.getItem("maturity-notifications-enabled") === "true";
