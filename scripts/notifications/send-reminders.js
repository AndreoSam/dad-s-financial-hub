const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { reminderReason } = require("./reminder-logic");

const PROJECT_ID = "fd-tracker-58039";
const TIME_ZONE = "Asia/Kolkata";
const SEND_TEST = process.env.SEND_TEST === "true";

const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!credentialsJson) {
  throw new Error("Add FIREBASE_SERVICE_ACCOUNT to the repository's GitHub Actions secrets.");
}

let credentials;
try {
  credentials = JSON.parse(credentialsJson);
} catch {
  throw new Error("FIREBASE_SERVICE_ACCOUNT must contain the complete service-account JSON.");
}

if (credentials.project_id !== PROJECT_ID) {
  throw new Error(`The service account must belong to Firebase project ${PROJECT_ID}.`);
}

initializeApp({ credential: cert(credentials), projectId: PROJECT_ID });

const todayInIndia = () => {
  const parts = Object.fromEntries(
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
  return `${parts.year}-${parts.month}-${parts.day}`;
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
    body:
      dueDeposits
        .slice(0, 3)
        .map(({ deposit }) => `${deposit.bank} ${maskAccount(deposit.accountNo)} (${deposit.maturityDate})`)
        .join(" • ") + (dueDeposits.length > 3 ? ` • +${dueDeposits.length - 3} more` : ""),
  };
};

const deleteStaleTokens = async (responses, subscriptions, db) => {
  const staleCodes = new Set([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
    "messaging/invalid-argument",
  ]);
  const deletions = responses.flatMap((result, index) =>
    !result.success && staleCodes.has(result.error?.code)
      ? [db.collection("notificationSubscriptions").doc(subscriptions[index].id).delete()]
      : []
  );
  await Promise.all(deletions);
};

const main = async () => {
  const db = getFirestore();
  const subscriptionSnapshot = await db
    .collection("notificationSubscriptions")
    .where("enabled", "==", true)
    .get();

  if (subscriptionSnapshot.empty) {
    throw new Error("No phones or browsers have enabled maturity notifications yet.");
  }

  const subscriptions = subscriptionSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  let title;
  let body;

  if (SEND_TEST) {
    title = "FD reminders are working";
    body = "This test notification was sent free of cost by the GitHub Actions scheduler.";
  } else {
    const today = todayInIndia();
    const depositSnapshot = await db.collection("fixedDeposits").get();
    const dueDeposits = depositSnapshot.docs.flatMap((doc) => {
      const deposit = doc.data();
      const reason = reminderReason(today, deposit.maturityDate);
      return reason ? [{ deposit, reason }] : [];
    });

    if (dueDeposits.length === 0) {
      console.log(`No maturity reminders are due on ${today}.`);
      return;
    }

    ({ title, body } = buildMessage(dueDeposits));
  }

  for (let start = 0; start < subscriptions.length; start += 500) {
    const batch = subscriptions.slice(start, start + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens: batch.map((subscription) => subscription.token),
      data: { title, body, url: "/", tag: `fd-maturity-${todayInIndia()}` },
      webpush: { headers: { Urgency: "high", TTL: "86400" } },
    });
    await deleteStaleTokens(response.responses, batch, db);
    console.log(`Sent ${response.successCount}; failed ${response.failureCount}.`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
