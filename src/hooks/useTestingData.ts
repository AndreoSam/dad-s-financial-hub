import { useEffect, useState } from "react";
import { collection, doc, getDocs, getDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

export const TEST_COLLECTIONS = {
  deposits: "fixedDeposits__testing",
  insurance: "insurancePolicies__testing",
  bankAccounts: "bankAccounts__testing",
  activities: "activityLogs__testing",
} as const;

const TEST_META = "testingMeta";
const SNAPSHOT_DOC = "dataSnapshot";

export function useTestingData() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const marker = await getDoc(doc(db, TEST_META, SNAPSHOT_DOC));
        if (!marker.exists()) {
          const [deposits, insurance, bank] = await Promise.all([
            getDocs(collection(db, "fixedDeposits")),
            getDocs(collection(db, "insurancePolicies")),
            getDoc(doc(db, "bankAccounts", "indian-bank")),
          ]);

          const batch = writeBatch(db);
          deposits.forEach((item) => batch.set(doc(db, TEST_COLLECTIONS.deposits, item.id), item.data()));
          insurance.forEach((item) => batch.set(doc(db, TEST_COLLECTIONS.insurance, item.id), item.data()));
          if (bank.exists()) batch.set(doc(db, TEST_COLLECTIONS.bankAccounts, "indian-bank"), bank.data());

          batch.set(doc(db, TEST_META, SNAPSHOT_DOC), {
            createdAt: new Date().toISOString(),
            source: "production snapshot",
            warning: "Testing collections are isolated from production.",
          });
          await batch.commit();
          if (!cancelled) toast.success("Testing Mode initialized from a safe snapshot of your current data.");
        }
      } catch (error) {
        console.error("Testing Mode bootstrap error:", error);
        if (!cancelled) toast.error("Could not initialize isolated Testing Mode.");
      } finally {
        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      }
    };
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  return { ready, loading };
}
