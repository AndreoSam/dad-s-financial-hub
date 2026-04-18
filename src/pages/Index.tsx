import { useState, useMemo } from "react";
import SummaryCards from "@/components/SummaryCards";
import FDTable from "@/components/FDTable";
import FDDialog from "@/components/FDDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PiggyBank, Search, Database } from "lucide-react";
import { useDeposits } from "@/hooks/useDeposits";

const Index = () => {
  const { deposits, loading, handleAdd, handleUpdate, handleDelete, seedDefaults } = useDeposits();
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = deposits;
    if (bankFilter !== "all") result = result.filter((fd) => fd.bank === bankFilter);
    if (typeFilter !== "all") result = result.filter((fd) => fd.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (fd) =>
          fd.accountNo.toLowerCase().includes(q) ||
          fd.bank.toLowerCase().includes(q) ||
          fd.period.toLowerCase().includes(q) ||
          fd.type.toLowerCase().includes(q) ||
          fd.notes?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [deposits, search, bankFilter, typeFilter]);

  const activeBanks = useMemo(() => [...new Set(deposits.map((fd) => fd.bank))], [deposits]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <PiggyBank className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-display">FD Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            {deposits.length === 0 && !loading && (
              <Button variant="outline" size="sm" onClick={seedDefaults} className="gap-2">
                <Database className="w-4 h-4" /> Load Defaults
              </Button>
            )}
            <FDDialog mode="add" onSubmit={handleAdd} />
          </div>
        </div>
      </header>
      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading deposits from database...</div>
        ) : (
          <>
            <SummaryCards deposits={filtered} />

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by account, bank, type, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={bankFilter} onValueChange={setBankFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  {activeBanks.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FDTable deposits={filtered} onDelete={handleDelete} onUpdate={handleUpdate} />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
