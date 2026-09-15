import { useState, useEffect, useMemo, useRef } from "react";
import RecordSummary from "./RecordSummary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { BANKS, formatCurrency, type FixedDeposit } from "@/data/fixedDeposits";
import { toast } from "sonner";

interface FDDialogProps {
  mode: "add" | "edit";
  initial?: FixedDeposit;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (fd: FixedDeposit) => void | Promise<void>;
  trigger?: React.ReactNode;
  existingAccountNos?: string[];
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
  interestMode: "roi" as "roi" | "yearly",
  yearlyInterest: "",
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

const periodInYears = (years: string, months: string, days: string): number =>
  (Number(years) || 0) + (Number(months) || 0) / 12 + (Number(days) || 0) / 365;

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

const FDDialog = ({ mode, initial, open: controlledOpen, onOpenChange, onSubmit, trigger, existingAccountNos = [] }: FDDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [review, setReview] = useState<FixedDeposit | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);

  // Load initial data on open (edit) or restore draft (add)
  useEffect(() => {
    if (!open) return;
    setReview(null);
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
        interestMode: "roi",
        yearlyInterest: "",
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

  // When in "yearly interest" mode, auto-calculate maturity amount and ROI
  useEffect(() => {
    if (form.interestMode !== "yearly") return;
    const deposit = Number(form.deposit);
    const yearly = Number(form.yearlyInterest);
    const t = periodInYears(form.years, form.months, form.days);
    if (deposit > 0 && yearly > 0 && t > 0) {
      const maturity = Math.round(deposit + yearly * t);
      const roi = ((yearly / deposit) * 100).toFixed(2);
      setForm((p) =>
        p.maturityAmount === String(maturity) && p.roi === roi
          ? p
          : { ...p, maturityAmount: String(maturity), roi }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.interestMode, form.deposit, form.yearlyInterest, form.years, form.months, form.days]);

  // When in "roi" mode, auto-calculate ROI from deposit + maturity amount + period
  useEffect(() => {
    if (form.interestMode !== "roi") return;
    const deposit = Number(form.deposit);
    const maturity = Number(form.maturityAmount);
    const t = periodInYears(form.years, form.months, form.days);
    if (deposit > 0 && maturity > 0 && t > 0) {
      const roi = (((maturity - deposit) / deposit) / t * 100).toFixed(2);
      setForm((p) => (p.roi === roi ? p : { ...p, roi }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.interestMode, form.deposit, form.maturityAmount, form.years, form.months, form.days]);

  const update = (key: keyof FormState, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ---- Validation ----
    const accountNo = form.accountNo.trim();
    if (!accountNo) return toast.error("Account number is required.");
    if (!/^[A-Za-z0-9-]{4,30}$/.test(accountNo))
      return toast.error("Account number must be 4-30 alphanumeric characters.");
    const dupe = existingAccountNos
      .filter((a) => a && a !== initial?.accountNo)
      .some((a) => a.toLowerCase() === accountNo.toLowerCase());
    if (dupe) return toast.error("An FD with this account number already exists.");
    if (!form.bank) return toast.error("Please select a bank.");
    if (!form.valueDate) return toast.error("Value date is required.");
    if (!form.maturityDate) return toast.error("Maturity date is required.");
    if (new Date(form.maturityDate) <= new Date(form.valueDate))
      return toast.error("Maturity date must be after value date.");
    const period = buildPeriod(form.years, form.months, form.days);
    if (!period) return toast.error("Period must be at least 1 day.");
    if (form.interestMode === "yearly") {
      const yearly = Number(form.yearlyInterest);
      if (!form.yearlyInterest || isNaN(yearly) || yearly <= 0)
        return toast.error("Yearly interest must be greater than 0.");
    }
    const roi = Number(form.roi);
    if (!form.roi || isNaN(roi) || roi <= 0 || roi > 30)
      return toast.error("ROI must be between 0 and 30%.");
    const deposit = Number(form.deposit);
    if (!form.deposit || isNaN(deposit) || deposit <= 0)
      return toast.error("Deposit amount must be greater than 0.");
    const maturityAmount = Number(form.maturityAmount);
    if (!form.maturityAmount || isNaN(maturityAmount) || maturityAmount <= 0)
      return toast.error("Maturity amount must be greater than 0.");
    if (maturityAmount < deposit)
      return toast.error("Maturity amount cannot be less than deposit.");

    const fd: FixedDeposit = {
      id: initial?.id ?? crypto.randomUUID(),
      accountNo,
      valueDate: form.valueDate,
      maturityDate: form.maturityDate,
      period,
      deposit,
      maturityAmount,
      roi,
      type: form.type,
      bank: form.bank,
      notes: form.notes.trim() || undefined,
    };
    setReview(fd);
  };

  const confirmSave = async () => {
    if (!review || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try {
      await onSubmit(review);
      if (mode === "add") {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
        setForm(emptyForm);
      }
      setOpen(false);
      setReview(null);
    } catch {
      toast.error("Save failed. Your entries are preserved; please try again.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!saving) setOpen(value); }}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : mode === "add" ? (
        <DialogTrigger asChild>
          <Button size="sm" className="h-8 px-2 sm:h-10 sm:px-4 gap-1.5" aria-label="Add fixed deposit">
            <Plus className="w-4 h-4" /> <span className="hidden min-[380px]:inline">Add FD</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-lg w-[calc(100vw-1rem)] max-h-[94vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-lg sm:text-xl">
            {review ? "Review Fixed Deposit" : mode === "add" ? "Add New Fixed Deposit" : "Edit Fixed Deposit"}
          </DialogTitle>
          <DialogDescription>{review ? "Confirm the details below to save this deposit." : "Enter the deposit details, then review them before saving."}</DialogDescription>
        </DialogHeader>
        {review ? <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Check these details before saving.</p>
          <RecordSummary rows={[
            ["Account number", review.accountNo], ["Bank", review.bank], ["Type", review.type],
            ["Value date", review.valueDate], ["Maturity date", review.maturityDate], ["Period", review.period],
            ["Deposit", formatCurrency(review.deposit)], ["Maturity amount", formatCurrency(review.maturityAmount)],
            ["ROI", `${review.roi}%`], ["Interest entry", form.interestMode === "yearly" ? "Yearly interest" : "Deposit and maturity amount"],
            ...(form.interestMode === "yearly" ? [["Yearly interest", formatCurrency(Number(form.yearlyInterest))] as const] : []),
            ["Notes", review.notes ?? ""],
          ]} />
          <div className="flex gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setReview(null)}>Back to edit</Button>
            <Button disabled={saving} onClick={confirmSave}>{saving ? "Saving…" : "Confirm and save"}</Button>
          </div>
        </div> : <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pt-1 sm:pt-2">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="accountNo">Account Number</Label>
              <Input id="accountNo" value={form.accountNo} onChange={(e) => update("accountNo", e.target.value)} placeholder="e.g. 1046101000000055" required />
            </div>
             <div className="col-span-2 sm:col-span-1">
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
             <div className="col-span-2 sm:col-span-1">
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
            <div className="sm:col-span-2">
              <Label>Period</Label>
               <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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
            <div className="sm:col-span-2">
              <Label>Interest Calculation</Label>
              <Select value={form.interestMode} onValueChange={(v) => update("interestMode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="roi">Enter ROI (%)</SelectItem>
                  <SelectItem value="yearly">Enter Yearly Interest (₹/year)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deposit">Deposit Amount (₹)</Label>
              <Input id="deposit" type="number" value={form.deposit} onChange={(e) => update("deposit", e.target.value)} placeholder="100000" required />
            </div>
            {form.interestMode === "roi" ? (
              <div>
                <Label htmlFor="roi">ROI (%) (auto)</Label>
                <Input
                  id="roi"
                  type="number"
                  step="0.01"
                  value={form.roi}
                  onChange={(e) => update("roi", e.target.value)}
                  placeholder="6.6"
                  readOnly
                  required
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="yearlyInterest">Yearly Interest (₹)</Label>
                <Input id="yearlyInterest" type="number" value={form.yearlyInterest} onChange={(e) => update("yearlyInterest", e.target.value)} placeholder="6600" required />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="maturityAmount">
                Maturity Amount (₹){form.interestMode === "yearly" ? " (auto)" : ""}
              </Label>
              <Input
                id="maturityAmount"
                type="number"
                value={form.maturityAmount}
                onChange={(e) => update("maturityAmount", e.target.value)}
                placeholder="106600"
                readOnly={form.interestMode === "yearly"}
                required
              />
              {form.interestMode === "yearly" && form.roi && (
                <p className="text-xs text-muted-foreground mt-1">
                  = Deposit + ₹{Number(form.yearlyInterest).toLocaleString("en-IN")}/yr × period · effective ROI {form.roi}%
                </p>
              )}
              {form.interestMode === "roi" && form.roi && (
                <p className="text-xs text-muted-foreground mt-1">
                  = (Maturity − Deposit) ÷ Deposit ÷ period · effective ROI {form.roi}%
                </p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
             <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Any additional notes..." rows={2} className="min-h-16" />
          </div>
          <Button type="submit" className="w-full">
            Review details
          </Button>
        </form>}
      </DialogContent>
    </Dialog>
  );
};

export default FDDialog;
