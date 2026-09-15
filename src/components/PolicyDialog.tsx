import { useRef, useState } from "react";
import { InsurancePolicy, policyTypes, premiumFrequencies, policySummary, validatePolicy } from "@/data/insurance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import RecordSummary from "./RecordSummary";

export default function PolicyDialog({ initial, policies, onClose, onSave }: {
  initial?: InsurancePolicy;
  policies: InsurancePolicy[];
  onClose: () => void;
  onSave: (policy: InsurancePolicy) => Promise<void>;
}) {
  const [form, setForm] = useState(() => ({
    id: initial?.id ?? crypto.randomUUID(),
    policyNumber: initial?.policyNumber ?? "", insurer: initial?.insurer ?? "",
    policyName: initial?.policyName ?? "", policyholder: initial?.policyholder ?? "",
    type: initial?.type ?? "Life", sumAssured: initial ? String(initial.sumAssured) : "",
    premium: initial ? String(initial.premium) : "", premiumFrequency: initial?.premiumFrequency ?? "Yearly",
    startDate: initial?.startDate ?? "", endDate: initial?.endDate ?? "",
    nextPremiumDate: initial?.nextPremiumDate ?? "", nominee: initial?.nominee ?? "", notes: initial?.notes ?? "",
  }));
  const [review, setReview] = useState<InsurancePolicy | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const update = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const policy: InsurancePolicy = {
      ...form, policyNumber: form.policyNumber.trim(), insurer: form.insurer.trim(),
      policyholder: form.policyholder.trim(), policyName: form.policyName.trim(),
      nominee: form.nominee.trim(), notes: form.notes.trim(),
      sumAssured: Number(form.sumAssured), premium: Number(form.premium),
      nextPremiumDate: form.premiumFrequency === "Single payment" ? "" : form.nextPremiumDate,
    };
    const message = validatePolicy(policy, policies);
    setError(message ?? "");
    if (!message) setReview(policy);
  };
  const save = async () => {
    if (!review || lock.current) return;
    const message = validatePolicy(review, policies);
    if (message) { setError(message); return; }
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave(review);
      onClose();
    } catch {
      setError("Could not save this policy. Your entries are preserved; check your connection and database access, then try again.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const fields: { key: keyof typeof form; label: string; type?: string; required?: boolean }[] = [
    { key: "policyNumber", label: "Policy number", required: true },
    { key: "insurer", label: "Insurer", required: true },
    { key: "policyholder", label: "Policyholder", required: true },
    { key: "policyName", label: "Policy name (optional)" },
    { key: "sumAssured", label: "Sum assured (₹)", type: "number", required: true },
    { key: "premium", label: "Premium per payment (₹)", type: "number", required: true },
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End / maturity date (optional)", type: "date" },
    ...(form.premiumFrequency !== "Single payment" ? [{ key: "nextPremiumDate" as const, label: "Next premium due (optional)", type: "date" }] : []),
    { key: "nominee", label: "Nominee (optional)" },
  ];
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{review ? "Review Insurance Policy" : initial ? "Edit Insurance Policy" : "Add Insurance Policy"}</DialogTitle>
          <DialogDescription>{review ? "Check the details, then confirm to save." : "Keep your policy and premium details together. Required fields are marked *."}</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {review ? <div className="space-y-4">
          <RecordSummary rows={policySummary(review)} />
          <div className="flex gap-2">
            <Button variant="outline" disabled={saving} onClick={() => { setReview(null); setError(""); }}>Back to edit</Button>
            <Button disabled={saving} onClick={save}>{saving ? "Saving…" : "Confirm and save"}</Button>
          </div>
        </div> : <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label htmlFor="policy-type">Policy type</Label>
              <select id="policy-type" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => update("type", e.target.value)}>
                {policyTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div><Label htmlFor="policy-frequency">Payment frequency</Label>
              <select id="policy-frequency" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.premiumFrequency} onChange={(e) => update("premiumFrequency", e.target.value)}>
                {premiumFrequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
              </select>
            </div>
            {fields.map(({ key, label, type = "text", required }) => <div key={key}>
              <Label htmlFor={`policy-${key}`}>{label}{required ? " *" : ""}</Label>
              <Input id={`policy-${key}`} type={type} required={required} value={form[key]}
                min={type === "number" ? "0.01" : undefined} step={type === "number" ? "0.01" : undefined}
                onChange={(e) => update(key, e.target.value)} />
            </div>)}
          </div>
          <div><Label htmlFor="policy-notes">Notes (optional)</Label>
            <Textarea id="policy-notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
          <Button type="submit" className="w-full">Review details</Button>
        </form>}
      </DialogContent>
    </Dialog>
  );
}
