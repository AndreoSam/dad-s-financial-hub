import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { BANKS, type FixedDeposit } from "@/data/fixedDeposits";

interface FDDialogProps {
  mode: "add" | "edit";
  initial?: FixedDeposit;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (fd: FixedDeposit) => void;
  trigger?: React.ReactNode;
}

const emptyForm = {
  accountNo: "",
  valueDate: "",
  maturityDate: "",
  years: "",
  months: "",
  days: "",
  deposit: "",
  maturityAmount: "",
  roi: "",
  type: "Regular" as "Regular" | "Personal",
  bank: "",
  notes: "",
};

type FormState = typeof emptyForm;

// Parse strings like "1 Yr", "1 Yr 7 D", "2 Yr 6 M", "6 M"
const parsePeriod = (period: string): { years: string; months: string; days: string } => {
  if (!period) return { years: "", months: "", days: "" };
  const y = period.match(/(\d+)\s*Yr/i);
  const m = period.match(/(\d+)\s*M(?!r)/i);
  const d = period.match(/(\d+)\s*D/i);
  return {
    years: y ? y[1] : "",
    months: m ? m[1] : "",
    days: d ? d[1] : "",
  };
};

const buildPeriod = (years: string, months: string, days: string): string => {
  const parts: string[] = [];
  if (years && Number(years) > 0) parts.push(`${Number(years)} Yr`);
  if (months && Number(months) > 0) parts.push(`${Number(months)} M`);
  if (days && Number(days) > 0) parts.push(`${Number(days)} D`);
  return parts.join(" ");
};

const computeMaturityDate = (valueDate: string, years: string, months: string, days: string): string => {
  if (!valueDate) return "";
  const y = Number(years) || 0;
  const m = Number(months) || 0;
  const d = Number(days) || 0;
  if (y === 0 && m === 0 && d === 0) return "";
  const date = new Date(valueDate);
  if (isNaN(date.getTime())) return "";
  date.setFullYear(date.getFullYear() + y);
  date.setMonth(date.getMonth() + m);
  date.setDate(date.getDate() + d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const DRAFT_KEY = "fd-dialog-draft-add";

const FDDialog = ({ mode, initial, open: controlledOpen, onOpenChange, onSubmit, trigger }: FDDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [form, setForm] = useState<FormState>(emptyForm);

  // Load initial data on open (edit) or restore draft (add)
  useEffect(() => {
    if (!open) return;
    if (initial) {
      const p = parsePeriod(initial.period);
      setForm({
        accountNo: initial.accountNo,
        valueDate: initial.valueDate,
        maturityDate: initial.maturityDate,
        years: p.years,
        months: p.months,
        days: p.days,
        deposit: String(initial.deposit),
        maturityAmount: String(initial.maturityAmount),
        roi: String(initial.roi),
        type: initial.type,
        bank: initial.bank,
        notes: initial.notes ?? "",
      });
    } else if (mode === "add") {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          setForm({ ...emptyForm, ...JSON.parse(draft) });
          return;
        }
      } catch {
        /* ignore */
      }
      setForm(emptyForm);
    }
  }, [open, initial, mode]);

  // Persist draft for add mode while typing
  useEffect(() => {
    if (mode !== "add" || !open) return;
    const isEmpty = Object.entries(form).every(([k, v]) => v === emptyForm[k as keyof FormState]);
    try {
      if (isEmpty) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form, mode, open]);

  // Auto-calculate maturity date whenever value date or period changes
  const autoMaturity = useMemo(
    () => computeMaturityDate(form.valueDate, form.years, form.months, form.days),
    [form.valueDate, form.years, form.months, form.days]
  );

  useEffect(() => {
    if (autoMaturity && autoMaturity !== form.maturityDate) {
      setForm((p) => ({ ...p, maturityDate: autoMaturity }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMaturity]);

  const update = (key: keyof FormState, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const period = buildPeriod(form.years, form.months, form.days);
    const fd: FixedDeposit = {
      id: initial?.id ?? crypto.randomUUID(),
      accountNo: form.accountNo,
      valueDate: form.valueDate,
      maturityDate: form.maturityDate,
      period,
      deposit: Number(form.deposit),
      maturityAmount: Number(form.maturityAmount),
      roi: Number(form.roi),
      type: form.type,
      bank: form.bank,
      notes: form.notes || undefined,
    };
    onSubmit(fd);
    if (mode === "add") {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setForm(emptyForm);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : mode === "add" ? (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add FD
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "add" ? "Add New Fixed Deposit" : "Edit Fixed Deposit"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="accountNo">Account Number</Label>
              <Input id="accountNo" value={form.accountNo} onChange={(e) => update("accountNo", e.target.value)} placeholder="e.g. 1046101000000055" required />
            </div>
            <div>
              <Label htmlFor="bank">Bank / Institution</Label>
              <Select value={form.bank} onValueChange={(v) => update("bank", v)} required>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="valueDate">Value Date</Label>
              <Input id="valueDate" type="date" value={form.valueDate} onChange={(e) => update("valueDate", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="maturityDate">Maturity Date (auto)</Label>
              <Input id="maturityDate" type="date" value={form.maturityDate} onChange={(e) => update("maturityDate", e.target.value)} required />
            </div>
            <div className="col-span-2">
              <Label>Period</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input
                    id="years"
                    type="number"
                    min="0"
                    value={form.years}
                    onChange={(e) => update("years", e.target.value)}
                    placeholder="Years"
                  />
                </div>
                <div>
                  <Input
                    id="months"
                    type="number"
                    min="0"
                    max="11"
                    value={form.months}
                    onChange={(e) => update("months", e.target.value)}
                    placeholder="Months"
                  />
                </div>
                <div>
                  <Input
                    id="days"
                    type="number"
                    min="0"
                    value={form.days}
                    onChange={(e) => update("days", e.target.value)}
                    placeholder="Days"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Maturity date auto-calculates from value date + period.
              </p>
            </div>
            <div>
              <Label htmlFor="roi">ROI (%)</Label>
              <Input id="roi" type="number" step="0.01" value={form.roi} onChange={(e) => update("roi", e.target.value)} placeholder="6.6" required />
            </div>
            <div>
              <Label htmlFor="deposit">Deposit Amount (₹)</Label>
              <Input id="deposit" type="number" value={form.deposit} onChange={(e) => update("deposit", e.target.value)} placeholder="100000" required />
            </div>
            <div className="col-span-2">
              <Label htmlFor="maturityAmount">Maturity Amount (₹)</Label>
              <Input id="maturityAmount" type="number" value={form.maturityAmount} onChange={(e) => update("maturityAmount", e.target.value)} placeholder="106600" required />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Any additional notes..." rows={2} />
          </div>
          <Button type="submit" className="w-full">
            {mode === "add" ? "Add Fixed Deposit" : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FDDialog;
