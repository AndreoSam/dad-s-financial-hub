const { createHash } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { reminderReason } = require("./reminder-logic");

initializeApp();

const REGION = "asia-south1";
const TIME_ZONE = "Asia/Kolkata";

const todayInIndia = () =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter(({ type }) => ["year", "month", "day"].includes(type))
      .map(({ type, value }) => [type, value])
  );

const todayDateStringInIndia = () => {
  const { year, month, day } = todayInIndia();
  return `${year}-${month}-${day}`;
};

const maskAccount = (accountNo = "") => {
  const value = String(accountNo);
  return value.length <= 4 ? value : `••••${value.slice(-4)}`;
};

const buildMessage = (dueDeposits) => {
  if (dueDeposits.length === 1) {
    const { deposit, reason } = dueDeposits[0];
    const prefix = reason === "matures-today" ? "Matures today" : "Maturing soon";
    return {
      title: `${prefix}: ${deposit.bank}`,
      body: `FD ${maskAccount(deposit.accountNo)} matures on ${deposit.maturityDate}. Maturity amount: ₹${Number(deposit.maturityAmount || 0).toLocaleString("en-IN")}.`,
    };
  }

  return {
    title: `${dueDeposits.length} FD maturity reminders`,
    body: dueDeposits
      .slice(0, 3)
      .map(({ deposit }) => `${deposit.bank} ${maskAccount(deposit.accountNo)} (${deposit.maturityDate})`)
      .join(" • ") + (dueDeposits.length > 3 ? ` • +${dueDeposits.length - 3} more` : ""),
  };
};

exports.registerNotificationToken = onCall({ region: REGION }, async (request) => {
  const token = request.data?.token;
  const platform = request.data?.platform;
  const userAgent = request.data?.userAgent;

  if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
    throw new HttpsError("invalid-argument", "A valid Firebase notification token is required.");
  }

  const id = createHash("sha256").update(token).digest("hex");
  await getFirestore().collection("notificationSubscriptions").doc(id).set(
    {
      token,
      platform: ["android", "ios", "desktop"].includes(platform) ? platform : "unknown",
      userAgent: typeof userAgent === "string" ? userAgent.slice(0, 500) : "",
      enabled: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { registered: true };
});

exports.sendMaturityReminders = onSchedule(
  { schedule: "0 9 * * *", timeZone: TIME_ZONE, region: REGION },
  async () => {
    const db = getFirestore();
    const today = todayDateStringInIndia();
    const [depositSnapshot, subscriptionSnapshot] = await Promise.all([
      db.collection("fixedDeposits").get(),
      db.collection("notificationSubscriptions").where("enabled", "==", true).get(),
    ]);

    const dueDeposits = depositSnapshot.docs.flatMap((doc) => {
      const deposit = doc.data();
      const reason = reminderReason(today, deposit.maturityDate);
      return reason ? [{ deposit, reason }] : [];
    });

    if (dueDeposits.length === 0 || subscriptionSnapshot.empty) return;

    const { title, body } = buildMessage(dueDeposits);
    const subscriptions = subscriptionSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    for (let start = 0; start < subscriptions.length; start += 500) {
      const batch = subscriptions.slice(start, start + 500);
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch.map((subscription) => subscription.token),
        data: {
          title,
          body,
          url: "/",
          tag: `fd-maturity-${today}`,
        },
        webpush: {
          headers: { Urgency: "high", TTL: "86400" },
        },
      });

      const staleCodes = new Set([
        "messaging/registration-token-not-registered",
        "messaging/invalid-registration-token",
        "messaging/invalid-argument",
      ]);
      const staleWrites = response.responses.flatMap((result, index) =>
        !result.success && staleCodes.has(result.error?.code)
          ? [db.collection("notificationSubscriptions").doc(batch[index].id).delete()]
          : []
      );
      await Promise.all(staleWrites);
    }
  }
);
