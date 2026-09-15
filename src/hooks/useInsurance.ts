import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { InsurancePolicy } from "@/data/insurance";
import { toast } from "sonner";

const COLLECTION = "insurancePolicies";
export function useInsurance() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => onSnapshot(collection(db, COLLECTION), (snapshot) => {
    setPolicies(snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as InsurancePolicy)
      .sort((a, b) => a.policyholder.localeCompare(b.policyholder)));
    setLoading(false);
    setError("");
  }, () => {
    setLoading(false);
    setError("Could not load insurance policies. Check your connection and database access, then reload.");
  }), []);

  const save = async (policy: InsurancePolicy) => {
    const { id, ...data } = policy;
    // A stable document ID also makes retrying a save safe.
    await setDoc(doc(db, COLLECTION, id), data);
    toast.success("Insurance policy saved.");
  };
  const remove = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
    toast.success("Insurance policy removed.");
  };
  return { policies, loading, error, save, remove };
}
