export type SummaryRow = readonly [string, string | number];

export default function RecordSummary({ rows }: { rows: readonly SummaryRow[] }) {
  return (
    <dl className="divide-y rounded-lg border px-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-2 gap-3 py-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="whitespace-pre-wrap break-words font-medium">{value === "" ? "Not provided" : value}</dd>
        </div>
      ))}
    </dl>
  );
}
