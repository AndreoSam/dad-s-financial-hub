import { IndianRupee, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { formatCurrency, type FixedDeposit } from "@/data/fixedDeposits";

interface SummaryCardsProps {
  deposits: FixedDeposit[];
}

const SummaryCards = ({ deposits }: SummaryCardsProps) => {
  const totalDeposit = deposits.reduce((s, fd) => s + fd.deposit, 0);
  const maturityPaidDeposits = deposits.filter((fd) => fd.interestPayout !== "yearly");
  const totalMaturity = maturityPaidDeposits.reduce((s, fd) => s + fd.maturityAmount, 0);
  const totalInterest = maturityPaidDeposits.reduce((s, fd) => s + fd.maturityAmount - fd.deposit, 0);
  const yearlyInterest = deposits
    .filter((fd) => fd.interestPayout === "yearly")
    .reduce((s, fd) => s + (fd.yearlyInterest ?? 0), 0);

  const cards = [
    { label: "Total Deposited", value: formatCurrency(totalDeposit), icon: Wallet, accent: "bg-primary/10 text-primary" },
    { label: "Maturity Value", value: formatCurrency(totalMaturity), icon: IndianRupee, accent: "bg-accent/10 text-accent" },
    { label: "Interest at Maturity", value: formatCurrency(totalInterest), icon: TrendingUp, accent: "bg-primary/10 text-primary" },
    { label: "Annual Interest", value: formatCurrency(yearlyInterest), icon: TrendingUp, accent: "bg-accent/10 text-accent" },
    { label: "Active FDs", value: String(deposits.length), icon: PiggyBank, accent: "bg-accent/10 text-accent" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-md sm:rounded-xl bg-card p-3 sm:p-5 border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3 min-w-0">
            <div className={`rounded-md sm:rounded-lg p-1.5 sm:p-2 shrink-0 ${card.accent}`}>
              <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] leading-tight sm:text-sm text-muted-foreground font-medium">{card.label}</span>
          </div>
          <p className="text-base sm:text-2xl font-bold font-display break-words">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
