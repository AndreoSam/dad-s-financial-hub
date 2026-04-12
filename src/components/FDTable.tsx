import { fixedDeposits, formatCurrency } from "@/data/fixedDeposits";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, isPast } from "date-fns";

const getStatus = (maturityDate: string) => {
  const maturity = new Date(maturityDate);
  const today = new Date();
  if (isPast(maturity)) return { label: "Matured", className: "bg-primary/10 text-primary border-primary/20" };
  const days = differenceInDays(maturity, today);
  if (days <= 90) return { label: `${days}d left`, className: "bg-accent/10 text-accent border-accent/20" };
  return { label: "Active", className: "bg-muted text-muted-foreground border-border" };
};

const FDTable = () => (
  <div className="rounded-xl bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden">
    <div className="p-5 border-b border-border">
      <h2 className="text-xl font-display">Fixed Deposits</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {["A/C No.", "Value Date", "Maturity Date", "Period", "Deposit", "Maturity Amt", "ROI", "Type", "Status"].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fixedDeposits.map((fd) => {
            const status = getStatus(fd.maturityDate);
            return (
              <tr key={fd.accountNo} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3.5 font-mono text-xs">{fd.accountNo}</td>
                <td className="px-4 py-3.5 whitespace-nowrap">{format(new Date(fd.valueDate), "dd MMM yyyy")}</td>
                <td className="px-4 py-3.5 whitespace-nowrap">{format(new Date(fd.maturityDate), "dd MMM yyyy")}</td>
                <td className="px-4 py-3.5">{fd.period}</td>
                <td className="px-4 py-3.5 font-medium whitespace-nowrap">{formatCurrency(fd.deposit)}</td>
                <td className="px-4 py-3.5 font-medium whitespace-nowrap">{formatCurrency(fd.maturityAmount)}</td>
                <td className="px-4 py-3.5">{fd.roi}%</td>
                <td className="px-4 py-3.5">
                  <Badge variant="outline" className={fd.type === "Personal" ? "bg-accent/10 text-accent border-accent/20" : "bg-muted text-muted-foreground"}>
                    {fd.type}
                  </Badge>
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant="outline" className={status.className}>{status.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default FDTable;
