import { IndianRupee, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { formatCurrency, type FixedDeposit } from "@/data/fixedDeposits";

interface SummaryCardsProps {
  deposits: FixedDeposit[];
}

const SummaryCards = ({ deposits }: SummaryCardsProps) => {
  const totalDeposit = deposits.reduce((s, fd) => s + fd.deposit, 0);
  const totalMaturity = deposits.reduce((s, fd) => s + fd.maturityAmount, 0);
  const totalInterest = totalMaturity - totalDeposit;

  const cards = [
    { label: "Total Deposited", value: formatCurrency(totalDeposit), icon: Wallet, accent: "bg-primary/10 text-primary" },
    { label: "Maturity Value", value: formatCurrency(totalMaturity), icon: IndianRupee, accent: "bg-accent/10 text-accent" },
    { label: "Interest Earned", value: formatCurrency(totalInterest), icon: TrendingUp, accent: "bg-primary/10 text-primary" },
    { label: "Active FDs", value: String(deposits.length), icon: PiggyBank, accent: "bg-accent/10 text-accent" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl bg-card p-5 border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className={`rounded-lg p-2 ${card.accent}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">{card.label}</span>
          </div>
          <p className="text-2xl font-bold font-display tracking-tight">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
