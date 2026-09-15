import { useRef, useState } from "react";
import { Database } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { defaultDeposits, formatCurrency } from "@/data/fixedDeposits";
import RecordSummary from "./RecordSummary";

export default function LoadDefaultsDialog({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const lock = useRef(false);
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try { await onConfirm(); setOpen(false); } catch { setError(true); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline" size="sm" aria-label="Load defaults" className="gap-2"><Database className="w-4 h-4" /><span className="hidden sm:inline">Load Defaults</span></Button></DialogTrigger>
    <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Review default deposits</DialogTitle><DialogDescription>Check all {defaultDeposits.length} records before adding them.</DialogDescription></DialogHeader>
      {defaultDeposits.map((fd) => <RecordSummary key={fd.id} rows={[
        ["Account", fd.accountNo], ["Bank", fd.bank], ["Type", fd.type], ["Value date", fd.valueDate],
        ["Maturity date", fd.maturityDate], ["Period", fd.period], ["Deposit", formatCurrency(fd.deposit)],
        ["Maturity amount", formatCurrency(fd.maturityAmount)], ["ROI", `${fd.roi}%`], ["Notes", fd.notes ?? ""],
      ]} />)}
      {error && <p role="alert" className="text-destructive">Could not load defaults. Please try again.</p>}
      <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Confirm and add defaults"}</Button></div>
    </DialogContent>
  </Dialog>;
}
