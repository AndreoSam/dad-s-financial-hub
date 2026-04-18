import { useState, useEffect } from "react";
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
  period: "",
  deposit: "",
  maturityAmount: "",
  roi: "",
  type: "Regular" as "Regular" | "Personal",
  bank: "",
  notes: "",
};

const FDDialog = ({ mode, initial, open: controlledOpen, onOpenChange, onSubmit, trigger }: FDDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open && initial) {
      setForm({
        accountNo: initial.accountNo,
        valueDate: initial.valueDate,
        maturityDate: initial.maturityDate,
        period: initial.period,
        deposit: String(initial.deposit),
        maturityAmount: String(initial.maturityAmount),
        roi: String(initial.roi),
        type: initial.type,
        bank: initial.bank,
        notes: initial.notes ?? "",
      });
    } else if (open && !initial) {
      setForm(emptyForm);
    }
  }, [open, initial]);

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd: FixedDeposit = {
      id: initial?.id ?? crypto.randomUUID(),
      accountNo: form.accountNo,
      valueDate: form.valueDate,
      maturityDate: form.maturityDate,
      period: form.period,
      deposit: Number(form.deposit),
      maturityAmount: Number(form.maturityAmount),
      roi: Number(form.roi),
      type: form.type,
      bank: form.bank,
      notes: form.notes || undefined,
    };
    onSubmit(fd);
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
              <Label htmlFor="maturityDate">Maturity Date</Label>
              <Input id="maturityDate" type="date" value={form.maturityDate} onChange={(e) => update("maturityDate", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="period">Period</Label>
              <Input id="period" value={form.period} onChange={(e) => update("period", e.target.value)} placeholder="e.g. 1 Yr" required />
            </div>
            <div>
              <Label htmlFor="roi">ROI (%)</Label>
              <Input id="roi" type="number" step="0.01" value={form.roi} onChange={(e) => update("roi", e.target.value)} placeholder="6.6" required />
            </div>
            <div>
              <Label htmlFor="deposit">Deposit Amount (₹)</Label>
              <Input id="deposit" type="number" value={form.deposit} onChange={(e) => update("deposit", e.target.value)} placeholder="100000" required />
            </div>
            <div>
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
