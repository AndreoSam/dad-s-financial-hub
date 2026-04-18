import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type FixedDeposit, defaultDeposits } from "@/data/fixedDeposits";
import { toast } from "sonner";

const COLLECTION = "fixedDeposits";

const clean = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

export const useDeposits = () => {
  const [deposits, setDeposits] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleAdd = async (fd: Omit<FixedDeposit, "id"> | FixedDeposit) => {
    try {
      const { id, ...data } = fd as FixedDeposit;
      await addDoc(collection(db, COLLECTION), clean(data));
      toast.success("Fixed deposit added successfully!");
    } catch (error) {
      console.error("Add error:", error);
      toast.error("Failed to add deposit.");
    }
  };

  const handleUpdate = async (fd: FixedDeposit) => {
    try {
      const { id, ...data } = fd;
      await updateDoc(doc(db, COLLECTION, id), clean(data));
      toast.success("Fixed deposit updated.");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update deposit.");
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
        await addDoc(collection(db, COLLECTION), clean(data));
      }
      toast.success("Default deposits loaded!");
    } catch (error) {
      console.error("Seed error:", error);
      toast.error("Failed to seed defaults.");
    }
  };

  return { deposits, loading, handleAdd, handleUpdate, handleDelete, seedDefaults };
};
