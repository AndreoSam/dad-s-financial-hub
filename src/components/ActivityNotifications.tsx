import { useState } from "react";
import { Bell, RotateCcw, Trash2, PlusCircle, Pencil, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { formatCurrency } from "@/data/fixedDeposits";
import { useActivityLog } from "@/hooks/useActivityLog";
import type { ActivityLog } from "@/hooks/useDeposits";

const iconFor = (type: ActivityLog["type"]) => {
  if (type === "delete") return Trash2;
  if (type === "renew") return RefreshCw;
  if (type === "update") return Pencil;
  return PlusCircle;
};

const ActivityNotifications = ({ testingMode = false }: { testingMode?: boolean }) => {
  const { activities, loading, revertingId, revertActivity } = useActivityLog(testingMode);
  const [selected, setSelected] = useState<ActivityLog | null>(null);

  const requestRevert = (activity: ActivityLog) => setSelected(activity);
  const confirmRevert = async () => {
    if (!selected) return;
    const item = selected;
    setSelected(null);
    await revertActivity(item);
  };

  return (
    <section className="rounded-md sm:rounded-xl bg-card border border-border shadow-[var(--shadow-card)] overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 text-primary p-2"><Bell className="w-5 h-5" /></div>
          <div>
            <h2 className="text-base sm:text-xl font-display">Notifications & Activity</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Last 10 FD actions. Revert an accidental change from here.</p>
          </div>
        </div>
        <Badge variant="secondary">{activities.length}/10</Badge>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading activity…</div>
      ) : activities.length === 0 ? (
        <div className="py-10 px-4 text-center text-sm text-muted-foreground">
          No FD activity has been recorded yet. New adds, edits, deletions and renewals will appear here.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {activities.map((activity) => {
            const Icon = iconFor(activity.type);
            const snapshot = activity.snapshot ?? activity.after;
            const accountNo = snapshot?.accountNo ?? activity.before?.accountNo ?? activity.targetId;
            return (
              <div key={activity.id} className="p-3 sm:p-4 flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-muted p-2 shrink-0"><Icon className="w-4 h-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">{activity.title}</p>
                    {activity.revertedAt && <Badge variant="outline" className="text-[10px]">Reverted</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1.5">
                    <span>A/C {accountNo}</span>
                    {snapshot?.deposit != null && <span>{formatCurrency(snapshot.deposit)}</span>}
                    <span>{format(new Date(activity.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                  </div>
                </div>
                {!activity.revertedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-8 gap-1.5"
                    disabled={revertingId === activity.id}
                    onClick={() => requestRevert(activity)}
                    title="Revert this action"
                  >
                    {revertingId === activity.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Revert</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert this activity?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected?.type === "delete"
                ? "The deleted FD will be restored with its saved details."
                : selected?.type === "renew"
                  ? "The renewed FD record will be removed."
                  : selected?.type === "update"
                    ? "The FD will be restored to the details it had before the edit."
                    : "The added FD will be removed."}
              {" "}This action itself will not be reversible from this notification. All changes here are isolated to Testing Mode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevert}>Revert action</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default ActivityNotifications;
