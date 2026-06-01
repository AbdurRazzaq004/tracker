import { Layout } from "@/components/Layout";
import { ExpenseForm } from "@/components/ExpenseForm";

export default function AddExpense() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Add New Expense</h2>
          <p className="text-muted-foreground">Enter your daily spending details below.</p>
        </div>
        
        <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm">
          <ExpenseForm />
        </div>
      </div>
    </Layout>
  );
}
