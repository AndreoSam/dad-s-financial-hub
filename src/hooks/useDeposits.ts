import { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type FixedDeposit, defaultDeposits } from "@/data/fixedDeposits";
import { toast } from "sonner";

const COLLECTION = "fixedDeposits";

export const useDeposits = () => {
  const [deposits, setDeposits] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener
  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy("valueDate", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as FixedDeposit[];
        setDeposits(data);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        toast.error("Failed to load deposits from database.");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const handleAdd = async (fd: Omit<FixedDeposit, "id">) => {
    try {
      const { id, ...data } = fd as FixedDeposit;
      await addDoc(collection(db, COLLECTION), data);
      toast.success("Fixed deposit added successfully!");
    } catch (error) {
      console.error("Add error:", error);
      toast.error("Failed to add deposit.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
      toast.success("Fixed deposit removed.");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete deposit.");
    }
  };

  const seedDefaults = async () => {
    try {
      for (const fd of defaultDeposits) {
        const { id, ...data } = fd;
        await addDoc(collection(db, COLLECTION), data);
      }
      toast.success("Default deposits loaded!");
    } catch (error) {
      console.error("Seed error:", error);
      toast.error("Failed to seed defaults.");
    }
  };

  return { deposits, loading, handleAdd, handleDelete, seedDefaults };
};
