import { type FixedDeposit, formatCurrency } from "@/data/fixedDeposits";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, isPast } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const getStatus = (maturityDate: string) => {
  const maturity = new Date(maturityDate);
  const today = new Date();
  if (isPast(maturity)) return { label: "Matured", className: "bg-primary/10 text-primary border-primary/20" };
  const days = differenceInDays(maturity, today);
  if (days <= 90) return { label: `${days}d left`, className: "bg-accent/10 text-accent border-accent/20" };
  return { label: "Active", className: "bg-muted text-muted-foreground border-border" };
};

const BANK_COLORS: Record<string, string> = {
  "South Indian Bank": "bg-primary/10 text-primary border-primary/20",
  "SBI": "bg-blue-100 text-blue-700 border-blue-200",
  "Post Office": "bg-red-100 text-red-700 border-red-200",
  "HDFC Bank": "bg-blue-100 text-blue-800 border-blue-200",
};

interface FDTableProps {
  deposits: FixedDeposit[];
  onDelete: (id: string) => void;
}

const FDTable = ({ deposits, onDelete }: FDTableProps) => (
  <div className="rounded-xl bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden">
    <div className="p-5 border-b border-border">
      <h2 className="text-xl font-display">Fixed Deposits</h2>
      <p className="text-sm text-muted-foreground mt-1">{deposits.length} deposit{deposits.length !== 1 ? "s" : ""} found</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {["Bank", "A/C No.", "Value Date", "Maturity", "Period", "Deposit", "Maturity Amt", "ROI", "Type", "Status", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deposits.length === 0 && (
            <tr><td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">No deposits match your search.</td></tr>
          )}
          {deposits.map((fd) => {
            const status = getStatus(fd.maturityDate);
            const bankColor = BANK_COLORS[fd.bank] || "bg-muted text-muted-foreground border-border";
            return (
              <tr key={fd.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                <td className="px-4 py-3.5">
                  <Badge variant="outline" className={bankColor}>{fd.bank}</Badge>
                </td>
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
                <td className="px-4 py-3.5">
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive" onClick={() => onDelete(fd.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
