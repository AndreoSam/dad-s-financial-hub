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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { toast } from "sonner";
import type { ActivityLog } from "./useDeposits";

const ACTIVITY_COLLECTION = "activityLogs";
const FD_COLLECTION = "fixedDeposits";

export const useActivityLog = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, ACTIVITY_COLLECTION),
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
      const targetRef = doc(db, FD_COLLECTION, activity.targetId);

      if (activity.type === "delete" && activity.snapshot) {
        await setDoc(targetRef, { ...activity.snapshot, id: undefined });
        toast.success("Deleted FD restored.");
      } else if (activity.type === "add" || activity.type === "renew") {
        await deleteDoc(targetRef);
        toast.success(activity.type === "renew" ? "Renewal reverted." : "Added FD removed.");
      } else if (activity.type === "update" && activity.before) {
        const { id, ...beforeData } = activity.before;
        await setDoc(targetRef, beforeData);
        toast.success("FD changes reverted.");
      } else {
        throw new Error("This notification cannot be reverted because its original data is unavailable.");
      }

      await updateDoc(doc(db, ACTIVITY_COLLECTION, activity.id), {
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
