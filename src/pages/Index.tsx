import { useState, useMemo } from "react";
import SummaryCards from "@/components/SummaryCards";
import FDTable from "@/components/FDTable";
import FDDialog from "@/components/FDDialog";
import NotificationButton from "@/components/NotificationButton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PiggyBank, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import InsuranceSection from "@/components/InsuranceSection";
import LoadDefaultsDialog from "@/components/LoadDefaultsDialog";
import { useDeposits } from "@/hooks/useDeposits";

const Index = () => {
  const { deposits, loading, handleAdd, handleUpdate, handleDelete, seedDefaults } = useDeposits();
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [section, setSection] = useState("deposits");

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
          fd.nominee?.toLowerCase().includes(q) ||
          fd.notes?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [deposits, search, bankFilter, typeFilter]);

  const activeBanks = useMemo(
    () => [...new Set(deposits.map((fd) => fd.bank).filter((b) => b && b.trim()))],
    [deposits]
  );
  const existingAccountNos = useMemo(() => deposits.map((d) => d.accountNo), [deposits]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="rounded-md sm:rounded-lg bg-primary p-1.5 sm:p-2 shrink-0">
              <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <h1 className="text-base sm:text-xl font-display truncate">Financial Hub</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationButton />
            {section === "deposits" && deposits.length === 0 && !loading && <LoadDefaultsDialog onConfirm={seedDefaults} />}
            {section === "deposits" && <FDDialog mode="add" onSubmit={handleAdd} existingAccountNos={existingAccountNos} />}
          </div>
        </div>
      </header>
      <main className="container max-w-6xl mx-auto px-2.5 sm:px-4 py-3 sm:py-8 space-y-3 sm:space-y-8">
        <Tabs value={section} onValueChange={setSection}>
          <TabsList className="w-full sm:w-auto"><TabsTrigger value="deposits" className="flex-1">Fixed deposits</TabsTrigger><TabsTrigger value="insurance" className="flex-1">Insurance</TabsTrigger></TabsList>
          <TabsContent value="deposits" className="space-y-4 sm:space-y-8">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading deposits from database...</div>
        ) : (
          <>
            <SummaryCards deposits={filtered} />

            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
              <div className="relative col-span-2 sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by account, bank, type, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 text-sm sm:h-10 sm:pl-10"
                />
              </div>
              <Select value={bankFilter} onValueChange={setBankFilter}>
                <SelectTrigger className="w-full h-9 text-xs sm:h-10 sm:w-[180px] sm:text-sm">
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
                <SelectTrigger className="w-full h-9 text-xs sm:h-10 sm:w-[160px] sm:text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FDTable deposits={filtered} onDelete={handleDelete} onUpdate={handleUpdate} onRenew={handleAdd} existingAccountNos={existingAccountNos} />
          </>
        )}
          </TabsContent>
          <TabsContent value="insurance"><InsuranceSection /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
