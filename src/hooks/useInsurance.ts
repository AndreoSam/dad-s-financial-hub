import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { InsurancePolicy, readPolicy } from "@/data/insurance";
import { toast } from "sonner";
import { TEST_COLLECTIONS } from "./useTestingData";

const COLLECTION = "insurancePolicies";
export function useInsurance(testingMode = false) {
  const insuranceCollection = testingMode ? TEST_COLLECTIONS.insurance : COLLECTION;
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => onSnapshot(collection(db, insuranceCollection), (snapshot) => {
    setPolicies(snapshot.docs.map((d) => readPolicy(d.id, d.data()))
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
    await setDoc(doc(db, insuranceCollection, id), {
      ...data, policyNo: data.policyNumber, insuredName: data.policyholder,
      policyType: data.type, renewalDate: data.endDate,
    }, { merge: true });
    toast.success("Insurance policy saved.");
  };
  const remove = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
    toast.success("Insurance policy removed.");
  };
  return { policies, loading, error, save, remove };
}
