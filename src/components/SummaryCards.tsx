import { IndianRupee, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { formatCurrency, getTotalDeposit, getTotalMaturity, getTotalInterest, fixedDeposits } from "@/data/fixedDeposits";

const cards = [
  {
    label: "Total Deposited",
    value: getTotalDeposit(),
    icon: Wallet,
    accent: "bg-primary/10 text-primary",
  },
  {
    label: "Maturity Value",
    value: getTotalMaturity(),
    icon: IndianRupee,
    accent: "bg-accent/10 text-accent",
  },
  {
    label: "Interest Earned",
    value: getTotalInterest(),
    icon: TrendingUp,
    accent: "bg-primary/10 text-primary",
  },
  {
    label: "Active FDs",
    value: fixedDeposits.length,
    icon: PiggyBank,
    accent: "bg-accent/10 text-accent",
    isCurrency: false,
  },
];

const SummaryCards = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    {cards.map((card) => (
      <div
        key={card.label}
        className="rounded-xl bg-card p-5 border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`rounded-lg p-2 ${card.accent}`}>
            <card.icon className="w-5 h-5" />
          </div>
          <span className="text-sm text-muted-foreground font-medium">{card.label}</span>
        </div>
        <p className="text-2xl font-bold font-display tracking-tight">
          {card.isCurrency === false ? card.value : formatCurrency(card.value)}
        </p>
      </div>
    ))}
  </div>
);

export default SummaryCards;
