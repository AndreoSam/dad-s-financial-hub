export interface FixedDeposit {
  accountNo: string;
  valueDate: string;
  maturityDate: string;
  period: string;
  deposit: number;
  maturityAmount: number;
  roi: number;
  type: "Regular" | "Personal";
}

export const fixedDeposits: FixedDeposit[] = [
  { accountNo: "1046101000000055", valueDate: "2025-11-25", maturityDate: "2026-11-25", period: "1 Yr", deposit: 339446, maturityAmount: 362410, roi: 6.6, type: "Regular" },
  { accountNo: "1046101000000034", valueDate: "2025-10-12", maturityDate: "2026-10-12", period: "1 Yr", deposit: 70334, maturityAmount: 75092, roi: 6.6, type: "Regular" },
  { accountNo: "1046101000000087", valueDate: "2025-04-24", maturityDate: "2026-05-01", period: "1 Yr 7 D", deposit: 237000, maturityAmount: 255009, roi: 7.25, type: "Regular" },
  { accountNo: "1046101000000153", valueDate: "2025-11-24", maturityDate: "2026-11-28", period: "1 Yr", deposit: 54167, maturityAmount: 57831, roi: 6.6, type: "Regular" },
  { accountNo: "1046101000000009", valueDate: "2025-04-06", maturityDate: "2026-04-13", period: "1 Yr 7 D", deposit: 36842, maturityAmount: 39701, roi: 7.4, type: "Regular" },
  { accountNo: "1046101000000028", valueDate: "2025-09-23", maturityDate: "2026-09-23", period: "1 Yr", deposit: 136312, maturityAmount: 145534, roi: 6.6, type: "Regular" },
  { accountNo: "1046101000000144", valueDate: "2025-10-16", maturityDate: "2026-10-16", period: "1 Yr", deposit: 11000, maturityAmount: 11744, roi: 6.6, type: "Regular" },
  { accountNo: "1046101000000175", valueDate: "2026-02-27", maturityDate: "2028-02-27", period: "2 Yr", deposit: 15000, maturityAmount: 17098, roi: 6.6, type: "Regular" },
  { accountNo: "1046101000000172", valueDate: "2026-02-10", maturityDate: "2027-02-10", period: "1 Yr", deposit: 60000, maturityAmount: 63902, roi: 6.35, type: "Personal" },
  { accountNo: "1046101000000193", valueDate: "2026-04-10", maturityDate: "2028-04-10", period: "2 Yr", deposit: 116800, maturityAmount: 133663, roi: 6.8, type: "Regular" },
  { accountNo: "1046101000000194", valueDate: "2026-04-10", maturityDate: "2028-04-10", period: "2 Yr", deposit: 75400, maturityAmount: 86286, roi: 6.8, type: "Personal" },
];

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

export const getTotalDeposit = () => fixedDeposits.reduce((sum, fd) => sum + fd.deposit, 0);
export const getTotalMaturity = () => fixedDeposits.reduce((sum, fd) => sum + fd.maturityAmount, 0);
export const getTotalInterest = () => getTotalMaturity() - getTotalDeposit();
