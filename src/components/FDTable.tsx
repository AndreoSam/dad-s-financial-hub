import { useState, useMemo } from "react";
import { type FixedDeposit, formatCurrency } from "@/data/fixedDeposits";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, isPast } from "date-fns";
import { Trash2, Pencil, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import FDDialog from "./FDDialog";
import DeleteConfirmation from "./DeleteConfirmation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getStatus = (maturityDate: string) => {
  const maturity = new Date(maturityDate);
  const today = new Date();
  if (isPast(maturity)) return { label: "Matured", className: "bg-primary/10 text-primary border-primary/20" };
  const days = differenceInDays(maturity, today);
  if (days <= 90) return { label: `${days}d left`, className: "bg-accent/10 text-accent border-accent/20" };
  return { label: "Active", className: "bg-muted text-muted-foreground border-border" };
};

const isYearlyPaid = (fd: FixedDeposit) => fd.interestPayout === "yearly";

const BANK_COLORS: Record<string, string> = {
  "South Indian Bank": "bg-primary/10 text-primary border-primary/20",
  "SBI": "bg-blue-100 text-blue-700 border-blue-200",
  "Post Office": "bg-red-100 text-red-700 border-red-200",
  "HDFC Bank": "bg-blue-100 text-blue-800 border-blue-200",
};

type SortKey = "bank" | "accountNo" | "valueDate" | "maturityDate" | "period" | "deposit" | "maturityAmount" | "roi" | "type" | "status";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: null, label: "Sl No." },
  { key: "bank", label: "Bank" },
  { key: "accountNo", label: "A/C No." },
  { key: "valueDate", label: "Value Date" },
  { key: "maturityDate", label: "Maturity" },
  { key: "period", label: "Period" },
  { key: "deposit", label: "Deposit" },
  { key: "maturityAmount", label: "Maturity Amt" },
  { key: "roi", label: "ROI" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: null, label: "" },
];

interface FDTableProps {
  deposits: FixedDeposit[];
  onDelete: (id: string) => void | Promise<void>;
  onUpdate: (fd: FixedDeposit) => void | Promise<void>;
  onRenew: (fd: FixedDeposit) => void | Promise<void>;
  existingAccountNos?: string[];
}

const statusOrder = (m: string) => {
  const d = differenceInDays(new Date(m), new Date());
  if (d < 0) return 0;
  if (d <= 90) return 1;
  return 2;
};

const FDTable = ({ deposits, onDelete, onUpdate, onRenew, existingAccountNos = [] }: FDTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>("valueDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editing, setEditing] = useState<FixedDeposit | null>(null);
  const [deleting, setDeleting] = useState<FixedDeposit | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...deposits];
    arr.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "status") {
        av = statusOrder(a.maturityDate);
        bv = statusOrder(b.maturityDate);
      } else if (sortKey === "valueDate" || sortKey === "maturityDate") {
        av = new Date(a[sortKey]).getTime();
        bv = new Date(b[sortKey]).getTime();
      } else {
        av = a[sortKey] as number | string;
        bv = b[sortKey] as number | string;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [deposits, sortKey, sortDir]);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 inline ml-1" /> : <ArrowDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div className="rounded-md sm:rounded-xl bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden">
      <div className="p-3 sm:p-5 border-b border-border flex items-end justify-between gap-2 sm:gap-3">
        <div>
          <h2 className="text-base sm:text-xl font-display">Fixed Deposits</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{deposits.length} deposit{deposits.length !== 1 ? "s" : ""} found</p>
        </div>
        {/* Mobile sort selector */}
        <div className="md:hidden flex gap-1.5 min-w-0">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-[116px] text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLUMNS.filter((c) => c.key).map((c) => (
                <SelectItem key={c.key!} value={c.key!}>Sort: {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 w-8 px-0" aria-label="Reverse sort order" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
            {sortDir === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden divide-y divide-border">
        {sorted.length === 0 && (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm">No deposits match your search.</div>
        )}
        {sorted.map((fd, idx) => {
          const status = getStatus(fd.maturityDate);
          const bankColor = BANK_COLORS[fd.bank] || "bg-muted text-muted-foreground border-border";
          return (
            <div key={fd.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                     <Badge variant="outline" className={`${bankColor} px-1.5 py-0 text-[10px]`}>{fd.bank}</Badge>
                     <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${fd.type === "Personal" ? "bg-accent/10 text-accent border-accent/20" : "bg-muted text-muted-foreground"}`}>
                      {fd.type}
                    </Badge>
                     {isYearlyPaid(fd) && <Badge variant="outline" className="px-1.5 py-0 text-[10px] bg-primary/10 text-primary border-primary/20">Paid yearly</Badge>}
                     <Badge variant="outline" className={`${status.className} px-1.5 py-0 text-[10px]`}>{status.label}</Badge>
                  </div>
                   <p className="font-mono text-[11px] text-muted-foreground mt-1 break-all">A/C {fd.accountNo}</p>
                </div>
                <div className="flex items-center shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(fd)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete FD ${fd.accountNo}`} className="h-8 w-8 text-destructive" onClick={() => setDeleting(fd)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
               <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-xs pt-0.5">
                <div>
                   <p className="text-[9px] uppercase text-muted-foreground">Deposit</p>
                   <p className="font-medium leading-tight">{formatCurrency(fd.deposit)}</p>
                </div>
                <div>
                    <p className="text-[9px] uppercase text-muted-foreground">{isYearlyPaid(fd) ? "Principal at maturity" : "Maturity"}</p>
                    <p className="font-medium leading-tight">{formatCurrency(fd.maturityAmount)}</p>
                </div>
                <div>
                   <p className="text-[9px] uppercase text-muted-foreground">Value Date</p>
                   <p>{format(new Date(fd.valueDate), "dd MMM yy")}</p>
                </div>
                <div>
                   <p className="text-[9px] uppercase text-muted-foreground">Matures</p>
                   <p>{format(new Date(fd.maturityDate), "dd MMM yy")}</p>
                </div>
                <div>
                   <p className="text-[9px] uppercase text-muted-foreground">Period</p>
                  <p>{fd.period}</p>
                </div>
                <div>
                   <p className="text-[9px] uppercase text-muted-foreground">ROI</p>
                  <p>{fd.roi}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-10" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[6%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[70px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {COLUMNS.map((col, i) => (
                <th key={col.label ? `${col.label}-${i}` : "actions"} className="px-2 py-3 text-left font-medium text-muted-foreground text-xs">
                  {col.key ? (
                    <button
                      onClick={() => toggleSort(col.key!)}
                      className="inline-flex items-center hover:text-foreground transition-colors"
                    >
                      {col.label}
                      <SortIcon k={col.key} />
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-muted-foreground">No deposits match your search.</td></tr>
            )}
            {sorted.map((fd, idx) => {
              const status = getStatus(fd.maturityDate);
              const bankColor = BANK_COLORS[fd.bank] || "bg-muted text-muted-foreground border-border";
              return (
                <tr key={fd.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group align-top">
                  <td className="px-2 py-3 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                  <td className="px-2 py-3">
                    <Badge variant="outline" className={`${bankColor} text-[10px] whitespace-normal leading-tight`}>{fd.bank}</Badge>
                  </td>
                  <td className="px-2 py-3 font-mono text-[11px] break-all">{fd.accountNo}</td>
                  <td className="px-2 py-3 text-xs">{format(new Date(fd.valueDate), "dd MMM yy")}</td>
                  <td className="px-2 py-3 text-xs">{format(new Date(fd.maturityDate), "dd MMM yy")}</td>
                  <td className="px-2 py-3 text-xs">{fd.period}</td>
                  <td className="px-2 py-3 font-medium text-xs">{formatCurrency(fd.deposit)}</td>
                  <td className="px-2 py-3 font-medium text-xs">{formatCurrency(fd.maturityAmount)}</td>
                  <td className="px-2 py-3 text-xs">{fd.roi}%</td>
                   <td className="px-2 py-3">
                    <Badge variant="outline" className={`text-[10px] ${fd.type === "Personal" ? "bg-accent/10 text-accent border-accent/20" : "bg-muted text-muted-foreground"}`}>
                      {fd.type}
                    </Badge>
                     {isYearlyPaid(fd) && <span className="block text-[10px] text-primary mt-1">Paid yearly</span>}
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant="outline" className={`${status.className} text-[10px] whitespace-nowrap`}>{status.label}</Badge>
                  </td>
                  <td className="px-1 py-3">
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(fd)} title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete FD ${fd.accountNo}`} className="h-7 w-7 text-destructive" onClick={() => setDeleting(fd)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DeleteConfirmation open={!!deleting} onOpenChange={(value) => { if (!value) setDeleting(null); }}
        description={deleting ? `Remove ${deleting.bank} FD ${deleting.accountNo}, deposit ${formatCurrency(deleting.deposit)}?` : ""}
        onConfirm={() => deleting && onDelete(deleting.id)} />
      {editing && (
        <FDDialog
          mode="edit"
          initial={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          existingAccountNos={existingAccountNos}
          onSubmit={onUpdate}
          onRenew={onRenew}
        />
      )}
    </div>
  );
};

export default FDTable;
