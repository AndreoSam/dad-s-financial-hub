import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { toast } from "sonner";
import type { ActivityLog } from "./useDeposits";
import { TEST_COLLECTIONS } from "./useTestingData";

const ACTIVITY_COLLECTION = "activityLogs";
const FD_COLLECTION = "fixedDeposits";
const BANK_ACCOUNTS_COLLECTION = "bankAccounts";
const INDIAN_BANK_DOC = "indian-bank";

export const useActivityLog = (testingMode = false) => {
  const activityCollection = testingMode ? TEST_COLLECTIONS.activities : ACTIVITY_COLLECTION;
  const fdCollection = testingMode ? TEST_COLLECTIONS.deposits : FD_COLLECTION;
  const bankAccountsCollection = testingMode ? TEST_COLLECTIONS.bankAccounts : BANK_ACCOUNTS_COLLECTION;
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, activityCollection),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        setActivities(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ActivityLog[]);
        setLoading(false);
      },
      (error) => {
        console.error("Activity log error:", error);
        toast.error("Failed to load Notifications.");
        setLoading(false);
      }
    );
  }, []);

  const revertActivity = async (activity: ActivityLog) => {
    if (activity.revertedAt) return;
    setRevertingId(activity.id);
    try {
      await verifyRecaptcha("revert_activity");
      const targetRef = doc(db, fdCollection, activity.targetId);

      if (activity.type === "delete" && activity.snapshot) {
        const { id: _ignoredId, ...snapshotData } = activity.snapshot;
        await setDoc(targetRef, snapshotData);
        toast.success("Deleted FD restored.");
      } else if (activity.type === "add" || activity.type === "renew") {
        if (activity.type === "add" && activity.bankBalanceDelta && activity.snapshot?.bank === "South Indian Bank" && activity.snapshot.recordType !== "renewed") {
          const balanceRef = doc(db, bankAccountsCollection, INDIAN_BANK_DOC);
          await runTransaction(db, async (transaction) => {
            const fdSnap = await transaction.get(targetRef);
            if (!fdSnap.exists()) throw new Error("The FD has already been removed, so this notification cannot be reverted safely.");
            const balanceSnap = await transaction.get(balanceRef);
            const currentBalance = Number(balanceSnap.data()?.balance ?? 0);
            transaction.delete(targetRef);
            transaction.set(balanceRef, {
              balance: Number((currentBalance - activity.bankBalanceDelta).toFixed(2)),
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          });
          toast.success("FD removed and the Indian Bank balance was restored.");
        } else {
          await deleteDoc(targetRef);
          toast.success(activity.type === "renew" ? "Renewal reverted." : "Added FD removed.");
        }
      } else if (activity.type === "update" && activity.before) {
        const { id: _ignoredId, ...beforeData } = activity.before;
        await setDoc(targetRef, beforeData);
        toast.success("FD changes reverted.");
      } else {
        throw new Error("This notification cannot be reverted because its original data is unavailable.");
      }

      await updateDoc(doc(db, activityCollection, activity.id), {
        revertedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Revert error:", error);
      toast.error(error instanceof Error ? error.message : "Could not revert this action.");
    } finally {
      setRevertingId(null);
    }
  };

  return { activities, loading, revertingId, revertActivity };
};
