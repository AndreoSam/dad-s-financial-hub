import { useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { useInsurance } from "@/hooks/useInsurance";
import { InsurancePolicy, policySummary } from "@/data/insurance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PolicyDialog from "./PolicyDialog";
import DeleteConfirmation from "./DeleteConfirmation";
import RecordSummary from "./RecordSummary";

export default function InsuranceSection({ testingMode = false }: { testingMode?: boolean }) {
  const { policies, loading, error, save, remove } = useInsurance(testingMode);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InsurancePolicy | "new" | null>(null);
  const [deleting, setDeleting] = useState<InsurancePolicy | null>(null);
  const filtered = policies.filter((p) => [p.policyNumber, p.policyholder, p.insurer, p.policyName, p.type, p.nominee, p.notes]
    .some((value) => value?.toLowerCase().includes(search.trim().toLowerCase())));
  return <section className="space-y-4" aria-label="Insurance policies">
    <div className="flex items-center justify-between gap-2">
      <div><h2 className="text-xl font-display flex items-center gap-2"><ShieldCheck className="w-5 h-5" />Insurance Policies</h2>
        <p className="text-sm text-muted-foreground">{policies.length} policies · cover, premiums and key dates</p></div>
      <Button size="sm" onClick={() => setEditing("new")} disabled={loading || !!error} className="gap-1"><Plus className="w-4 h-4" />Add policy</Button>
    </div>
    <Input aria-label="Search policies" placeholder="Search policy number, holder, insurer, type…" value={search} onChange={(e) => setSearch(e.target.value)} />
    {loading ? <p role="status">Loading insurance policies…</p> : error ? <p role="alert" className="text-destructive">{error}</p> : filtered.length === 0 ?
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">{policies.length ? "No policies match your search." : "No insurance policies yet. Add your first policy to get started."}</div> :
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((policy) => <article key={policy.id} className="rounded-lg border bg-card p-3 sm:p-4 space-y-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><h3 className="font-semibold break-words">{policy.insurer} · {policy.type}</h3><p className="text-sm text-muted-foreground break-words">{policy.policyholder} · {policy.policyNumber}</p></div>
          <div className="flex shrink-0">
            <Button variant="ghost" size="icon" aria-label={`Edit policy ${policy.policyNumber}`} onClick={() => setEditing(policy)}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Delete policy ${policy.policyNumber}`} onClick={() => setDeleting(policy)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
        <RecordSummary rows={policySummary(policy).filter(([key]) => !["Insurer", "Policyholder", "Policy number", "Type"].includes(key))} />
      </article>)}</div>}
    {editing && <PolicyDialog initial={editing === "new" ? undefined : editing} policies={policies} onClose={() => setEditing(null)} onSave={save} />}
    <DeleteConfirmation open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}
      description={deleting ? `Remove ${deleting.insurer} policy ${deleting.policyNumber} for ${deleting.policyholder}?` : ""}
      onConfirm={() => deleting && remove(deleting.id)} />
  </section>;
}
