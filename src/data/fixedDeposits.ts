export interface FixedDeposit {
  id: string;
  accountNo: string;
  valueDate: string;
  maturityDate: string;
  period: string;
  deposit: number;
  maturityAmount: number;
  roi: number;
  type: "Regular" | "Personal";
  bank: string;
  notes?: string;
}

export const BANKS = [
  "South Indian Bank",
  "SBI",
  "Post Office",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Indian Bank",
  "Other",
] as const;

export const defaultDeposits: FixedDeposit[] = [
  { id: "1", accountNo: "1046101000000055", valueDate: "2025-11-25", maturityDate: "2026-11-25", period: "1 Yr", deposit: 339446, maturityAmount: 362410, roi: 6.6, type: "Regular", bank: "South Indian Bank" },
  { id: "2", accountNo: "1046101000000034", valueDate: "2025-10-12", maturityDate: "2026-10-12", period: "1 Yr", deposit: 70334, maturityAmount: 75092, roi: 6.6, type: "Regular", bank: "South Indian Bank" },
  { id: "3", accountNo: "1046101000000087", valueDate: "2025-04-24", maturityDate: "2026-05-01", period: "1 Yr 7 D", deposit: 237000, maturityAmount: 255009, roi: 7.25, type: "Regular", bank: "South Indian Bank" },
  { id: "4", accountNo: "1046101000000153", valueDate: "2025-11-24", maturityDate: "2026-11-28", period: "1 Yr", deposit: 54167, maturityAmount: 57831, roi: 6.6, type: "Regular", bank: "South Indian Bank" },
  { id: "5", accountNo: "1046101000000009", valueDate: "2025-04-06", maturityDate: "2026-04-13", period: "1 Yr 7 D", deposit: 36842, maturityAmount: 39701, roi: 7.4, type: "Regular", bank: "South Indian Bank" },
  { id: "6", accountNo: "1046101000000028", valueDate: "2025-09-23", maturityDate: "2026-09-23", period: "1 Yr", deposit: 136312, maturityAmount: 145534, roi: 6.6, type: "Regular", bank: "South Indian Bank" },
  { id: "7", accountNo: "1046101000000144", valueDate: "2025-10-16", maturityDate: "2026-10-16", period: "1 Yr", deposit: 11000, maturityAmount: 11744, roi: 6.6, type: "Regular", bank: "South Indian Bank" },
  { id: "8", accountNo: "1046101000000175", valueDate: "2026-02-27", maturityDate: "2028-02-27", period: "2 Yr", deposit: 15000, maturityAmount: 17098, roi: 6.6, type: "Regular", bank: "South Indian Bank" },
  { id: "9", accountNo: "1046101000000172", valueDate: "2026-02-10", maturityDate: "2027-02-10", period: "1 Yr", deposit: 60000, maturityAmount: 63902, roi: 6.35, type: "Personal", bank: "South Indian Bank" },
  { id: "10", accountNo: "1046101000000193", valueDate: "2026-04-10", maturityDate: "2028-04-10", period: "2 Yr", deposit: 116800, maturityAmount: 133663, roi: 6.8, type: "Regular", bank: "South Indian Bank" },
  { id: "11", accountNo: "1046101000000194", valueDate: "2026-04-10", maturityDate: "2028-04-10", period: "2 Yr", deposit: 75400, maturityAmount: 86286, roi: 6.8, type: "Personal", bank: "South Indian Bank" },
];

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
