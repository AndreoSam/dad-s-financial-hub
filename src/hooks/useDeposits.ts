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
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type FixedDeposit, type InsurancePolicy, defaultDeposits } from "@/data/fixedDeposits";
import { toast } from "sonner";

const COLLECTION = "fixedDeposits";
const INSURANCE_COLLECTION = "insurancePolicies";

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
      throw error;
    }
  };

  const handleUpdate = async (fd: FixedDeposit) => {
    try {
      const { id, ...data } = fd;
      await updateDoc(doc(db, COLLECTION, id), clean({ ...data, notes: data.notes ?? "" }));
      toast.success("Fixed deposit updated.");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update deposit.");
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
      toast.success("Fixed deposit removed.");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete deposit.");
      throw error;
    }
  };

  const seedDefaults = async () => {
    try {
      const batch = writeBatch(db);
      for (const fd of defaultDeposits) {
        const { id, ...data } = fd;
        batch.set(doc(db, COLLECTION, `default-${id}`), clean(data));
      }
      await batch.commit();
      toast.success("Default deposits loaded!");
    } catch (error) {
      console.error("Seed error:", error);
      toast.error("Failed to seed defaults.");
      throw error;
    }
  };

  return { deposits, loading, handleAdd, handleUpdate, handleDelete, seedDefaults };
};

export const useInsurancePolicies = () => {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, INSURANCE_COLLECTION), orderBy("renewalDate", "asc"));
    return onSnapshot(q, (snapshot) => {
      setPolicies(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as InsurancePolicy[]);
      setLoading(false);
    }, (error) => {
      console.error("Insurance load error:", error);
      toast.error("Failed to load insurance policies.");
      setLoading(false);
    });
  }, []);

  const addPolicy = async (policy: InsurancePolicy) => {
    try {
      const { id, ...data } = policy;
      await addDoc(collection(db, INSURANCE_COLLECTION), clean(data));
      toast.success("Insurance policy added successfully!");
    } catch (error) { console.error("Insurance add error:", error); toast.error("Failed to add insurance policy."); }
  };
  const updatePolicy = async (policy: InsurancePolicy) => {
    try {
      const { id, ...data } = policy;
      await updateDoc(doc(db, INSURANCE_COLLECTION, id), clean(data));
      toast.success("Insurance policy updated.");
    } catch (error) { console.error("Insurance update error:", error); toast.error("Failed to update insurance policy."); }
  };
  const deletePolicy = async (id: string) => {
    try { await deleteDoc(doc(db, INSURANCE_COLLECTION, id)); toast.success("Insurance policy removed."); }
    catch (error) { console.error("Insurance delete error:", error); toast.error("Failed to delete insurance policy."); }
  };
  return { policies, loading, addPolicy, updatePolicy, deletePolicy };
};
