import SummaryCards from "@/components/SummaryCards";
import FDTable from "@/components/FDTable";
import { PiggyBank } from "lucide-react";

const Index = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary p-2">
          <PiggyBank className="w-5 h-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-display">FD Tracker</h1>
      </div>
    </header>
    <main className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
      <SummaryCards />
      <FDTable />
    </main>
  </div>
);

export default Index;
