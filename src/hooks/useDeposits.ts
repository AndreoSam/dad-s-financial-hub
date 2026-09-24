import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  orderBy,
  writeBatch,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { type FixedDeposit, type InsurancePolicy, defaultDeposits } from "@/data/fixedDeposits";
import { toast } from "sonner";
import { TEST_COLLECTIONS } from "./useTestingData";

const COLLECTION = "fixedDeposits";
const INSURANCE_COLLECTION = "insurancePolicies";
const BANK_ACCOUNTS_COLLECTION = "bankAccounts";
const INDIAN_BANK_DOC = "indian-bank";
const INITIAL_INDIAN_BANK_BALANCE = 26191.9;
const MONTHLY_PF = 3764;
const ACTIVITY_COLLECTION = "activityLogs";

const monthIndex = (value: string) => { const [year, month] = value.split("-").map(Number); return year * 12 + (month - 1); };
const currentMonth = () => { const now = new Date(); return String(now.getFullYear()) + "-" + String(now.getMonth() + 1).padStart(2, "0"); };

const formatActivityCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const clean = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

export type ActivityType = "add" | "delete" | "update" | "renew";

export interface ActivityLog {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  targetId: string;
  snapshot?: FixedDeposit;
  before?: FixedDeposit;
  after?: FixedDeposit;
  createdAt: string;
  revertedAt?: string;
  bankBalanceDelta?: number;
}

const recordActivity = async (collectionName: string, entry: Omit<ActivityLog, "id">) => {
  try {
    const payload = JSON.parse(JSON.stringify(entry));
    await addDoc(collection(db, collectionName), payload);
  } catch (error) {
    console.error("Activity log write error:", error);
    toast.warning("The FD change was saved, but its notification could not be recorded.");
  }
};

const protect = async (action: string) => {
  try {
    await verifyRecaptcha(action);
  } catch (error) {
    console.error("reCAPTCHA error:", error);
    toast.error("Security check failed. Please try again.");
    throw error;
  }
};

export const useDeposits = (testingMode = false) => {
  const depositsCollection = testingMode ? TEST_COLLECTIONS.deposits : COLLECTION;
  const activityCollection = testingMode ? TEST_COLLECTIONS.activities : ACTIVITY_COLLECTION;
  const bankAccountsCollection = testingMode ? TEST_COLLECTIONS.bankAccounts : BANK_ACCOUNTS_COLLECTION;
  const [deposits, setDeposits] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, depositsCollection), orderBy("valueDate", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FixedDeposit[];
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
      await protect("add_deposit");
      const { id, ...data } = fd as FixedDeposit;
      const isRenewal = data.recordType === "renewed";
      const isNewSouthIndianBankFd = data.bank === "South Indian Bank" && !isRenewal;
      const createdRef = doc(collection(db, depositsCollection));

      if (!isNewSouthIndianBankFd) {
        await setDoc(createdRef, clean(data));
        await recordActivity(activityCollection, {
          type: isRenewal ? "renew" : "add",
          title: isRenewal ? "FD renewed" : "FD added",
          description: isRenewal ? `Renewed FD ${data.accountNo} was created.` : `Added ${data.bank} FD ${data.accountNo}.`,
          targetId: createdRef.id,
          snapshot: { ...data, id: createdRef.id } as FixedDeposit,
          createdAt: new Date().toISOString(),
        });
        toast.success(isRenewal ? "Fixed deposit renewed successfully!" : "Fixed deposit added successfully!");
        return;
      }

      const balanceRef = doc(db, bankAccountsCollection, INDIAN_BANK_DOC);
      await runTransaction(db, async (transaction) => {
        const balanceSnap = await transaction.get(balanceRef);
        const nowMonth = currentMonth();
        let balance = INITIAL_INDIAN_BANK_BALANCE;
        let lastPfMonth = nowMonth;
        if (balanceSnap.exists()) {
          const account = balanceSnap.data();
          balance = Number(account.balance ?? INITIAL_INDIAN_BANK_BALANCE);
          lastPfMonth = String(account.lastPfCreditMonth ?? nowMonth);
          const missedMonths = Math.max(0, monthIndex(nowMonth) - monthIndex(lastPfMonth));
          if (missedMonths > 0) {
            balance += missedMonths * MONTHLY_PF;
            lastPfMonth = nowMonth;
          }
        }
        const depositAmount = Number(data.deposit);
        if (depositAmount > balance) throw new Error("INSUFFICIENT_INDIAN_BANK_BALANCE:" + balance);
        transaction.set(balanceRef, { balance: Number((balance - depositAmount).toFixed(2)), monthlyPf: MONTHLY_PF, lastPfCreditMonth: lastPfMonth, updatedAt: new Date().toISOString() }, { merge: true });
        transaction.set(createdRef, clean(data));
      });
      await recordActivity(activityCollection, {
        type: "add",
        title: "FD added",
        description: `Added South Indian Bank FD ${data.accountNo} and deducted ${formatActivityCurrency(data.deposit)} from Indian Bank balance.`,
        targetId: createdRef.id,
        snapshot: { ...data, id: createdRef.id } as FixedDeposit,
        bankBalanceDelta: -Number(data.deposit),
        createdAt: new Date().toISOString(),
      });
      toast.success("Fixed deposit added and Indian Bank balance updated.");
    } catch (error) {
      console.error("Add error:", error);
      if (error instanceof Error && error.message.startsWith("INSUFFICIENT_INDIAN_BANK_BALANCE:")) { toast.error(`Insufficient Indian Bank balance. Available: ₹${Number(error.message.split(":")[1]).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`); } else if (!(error instanceof Error && error.message.includes("reCAPTCHA"))) toast.error("Failed to add deposit.");
      throw error;
    }
  };

  const handleUpdate = async (fd: FixedDeposit) => {
    try {
      await protect("update_deposit");
      const existing = await getDoc(doc(db, depositsCollection, fd.id));
      const before = existing.exists() ? ({ id: existing.id, ...existing.data() } as FixedDeposit) : undefined;
      const { id, ...data } = fd;
      await updateDoc(doc(db, depositsCollection, id), clean({ ...data, notes: data.notes ?? "" }));
      await recordActivity(activityCollection, {
        type: "update",
        title: "FD updated",
        description: `Updated FD ${fd.accountNo}.`,
        targetId: id,
        before,
        after: fd,
        createdAt: new Date().toISOString(),
      });
      toast.success("Fixed deposit updated.");
    } catch (error) {
      console.error("Update error:", error);
      if (!(error instanceof Error && error.message.includes("reCAPTCHA"))) toast.error("Failed to update deposit.");
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await protect("delete_deposit");
      const fdSnap = await getDoc(doc(db, depositsCollection, id));
      if (!fdSnap.exists()) throw new Error("FD_NOT_FOUND");
      const fd = { id: fdSnap.id, ...fdSnap.data() } as FixedDeposit;
      await deleteDoc(doc(db, depositsCollection, id));
      await recordActivity(activityCollection, {
        type: "delete",
        title: "FD deleted",
        description: `Deleted ${fd.bank} FD ${fd.accountNo}.`,
        targetId: id,
        snapshot: fd,
        createdAt: new Date().toISOString(),
      });
      toast.success("Fixed deposit removed. You can restore it from Notifications.");
    } catch (error) {
      console.error("Delete error:", error);
      if (!(error instanceof Error && error.message.includes("reCAPTCHA"))) toast.error("Failed to delete deposit.");
      throw error;
    }
  };

  const seedDefaults = async () => {
    try {
      await protect("seed_deposits");
      const batch = writeBatch(db);
      for (const fd of defaultDeposits) {
        const { id, ...data } = fd;
        batch.set(doc(db, depositsCollection, `default-${id}`), clean(data));
      }
      await batch.commit();
      toast.success("Default deposits loaded!");
    } catch (error) {
      console.error("Seed error:", error);
      if (!(error instanceof Error && error.message.includes("reCAPTCHA"))) toast.error("Failed to seed defaults.");
      throw error;
    }
  };

  return { deposits, loading, handleAdd, handleUpdate, handleDelete, seedDefaults };
};

export const useIndianBankBalance = (testingMode = false) => {
  const bankAccountsCollection = testingMode ? TEST_COLLECTIONS.bankAccounts : BANK_ACCOUNTS_COLLECTION;
  const [balance, setBalance] = useState(INITIAL_INDIAN_BANK_BALANCE);
  const [monthlyPf, setMonthlyPf] = useState(MONTHLY_PF);
  useEffect(() => {
    const balanceRef = doc(db, bankAccountsCollection, INDIAN_BANK_DOC);
    const unsubscribe = onSnapshot(balanceRef, async (snapshot) => {
      if (!snapshot.exists()) {
        try {
          await setDoc(balanceRef, { balance: INITIAL_INDIAN_BANK_BALANCE, monthlyPf: MONTHLY_PF, lastPfCreditMonth: currentMonth(), updatedAt: new Date().toISOString() }, { merge: true });
        } catch (error) { console.error("Indian Bank balance initialization error:", error); }
        return;
      }
      const data = snapshot.data();
      const nowMonth = currentMonth();
      const lastPfMonth = String(data.lastPfCreditMonth ?? nowMonth);
      const missedMonths = Math.max(0, monthIndex(nowMonth) - monthIndex(lastPfMonth));
      const storedBalance = Number(data.balance ?? INITIAL_INDIAN_BANK_BALANCE);
      const pf = Number(data.monthlyPf ?? MONTHLY_PF);
      const updatedBalance = storedBalance + missedMonths * pf;
      if (missedMonths > 0) {
        try { await setDoc(balanceRef, { balance: Number(updatedBalance.toFixed(2)), monthlyPf: pf, lastPfCreditMonth: nowMonth, updatedAt: new Date().toISOString() }, { merge: true }); } catch (error) { console.error("PF credit update error:", error); }
      }
      setBalance(Number(updatedBalance.toFixed(2)));
      setMonthlyPf(pf);
    }, (error) => console.error("Indian Bank balance error:", error));
    return unsubscribe;
  }, []);
  return { balance, monthlyPf };
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
      await protect("add_insurance_policy");
      const { id, ...data } = policy;
      await addDoc(collection(db, INSURANCE_COLLECTION), clean(data));
      toast.success("Insurance policy added successfully!");
    } catch (error) { console.error("Insurance add error:", error); if (!(error instanceof Error && error.message.includes("reCAPTCHA"))) toast.error("Failed to add insurance policy."); throw error; }
  };

  const updatePolicy = async (policy: InsurancePolicy) => {
    try {
      await protect("update_insurance_policy");
      const { id, ...data } = policy;
      await updateDoc(doc(db, INSURANCE_COLLECTION, id), clean(data));
      toast.success("Insurance policy updated.");
    } catch (error) { console.error("Insurance update error:", error); if (!(error instanceof Error && error.message.includes("reCAPTCHA"))) toast.error("Failed to update insurance policy."); throw error; }
  };

  const deletePolicy = async (id: string) => {
    try {
      await protect("delete_insurance_policy");
      await deleteDoc(doc(db, INSURANCE_COLLECTION, id));
      toast.success("Insurance policy removed.");
    } catch (error) { console.error("Insurance delete error:", error); if (!(error instanceof Error && error.message.includes("reCAPTCHA"))) toast.error("Failed to delete insurance policy."); throw error; }
  };

  return { policies, loading, addPolicy, updatePolicy, deletePolicy };
};
