import { formatCurrency } from "./fixedDeposits";

export const policyTypes = ["Life", "Health", "Term", "Vehicle", "Home", "Travel", "Other"] as const;
export const premiumFrequencies = ["Monthly", "Quarterly", "Half-yearly", "Yearly", "Single payment"] as const;
export interface InsurancePolicy {
  id: string;
  policyNumber: string;
  insurer: string;
  policyName: string;
  policyholder: string;
  type: typeof policyTypes[number];
  sumAssured: number;
  premium: number;
  premiumFrequency: typeof premiumFrequencies[number];
  startDate: string;
  endDate: string;
  nextPremiumDate: string;
  nominee: string;
  notes: string;
}

export const policySummary = (p: InsurancePolicy): [string, string][] => [
  ["Policy number", p.policyNumber], ["Insurer", p.insurer], ["Policy name", p.policyName],
  ["Policyholder", p.policyholder], ["Type", p.type], ["Sum assured", formatCurrency(p.sumAssured)],
  ["Premium", formatCurrency(p.premium)], ["Payment frequency", p.premiumFrequency],
  ["Start date", p.startDate], ["End / maturity date", p.endDate], ["Next premium due", p.nextPremiumDate],
  ["Nominee", p.nominee], ["Notes", p.notes],
];

export function validatePolicy(p: InsurancePolicy, existing: InsurancePolicy[]): string | null {
  if (!p.policyNumber.trim() || !p.insurer.trim() || !p.policyholder.trim()) return "Policy number, insurer and policyholder are required.";
  if (existing.some((other) => other.id !== p.id && other.policyNumber.toLowerCase() === p.policyNumber.toLowerCase() && other.insurer.toLowerCase() === p.insurer.toLowerCase())) return "This policy number already exists for this insurer.";
  if (!policyTypes.includes(p.type) || !premiumFrequencies.includes(p.premiumFrequency)) return "Select a valid policy type and payment frequency.";
  if (!Number.isFinite(p.sumAssured) || p.sumAssured <= 0 || !Number.isFinite(p.premium) || p.premium <= 0) return "Sum assured and premium must be greater than zero.";
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(p.startDate)) return "Enter a valid start date.";
  if (p.endDate && (!validDate(p.endDate) || p.endDate <= p.startDate)) return "End / maturity date must be after the start date.";
  if (p.nextPremiumDate && (!validDate(p.nextPremiumDate) || p.nextPremiumDate < p.startDate || (p.endDate && p.nextPremiumDate > p.endDate))) return "Next premium date must be within the policy dates.";
  return null;
}
