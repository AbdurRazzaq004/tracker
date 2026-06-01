import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useIncome } from "@/context/IncomeContext";
import { IncomeForm } from "@/components/IncomeForm";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Edit2, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Income as IncomeType } from "@shared/schema";
import { exportIncomeToCSV } from "@/lib/export";
import { useSettings } from "@/context/SettingsContext";

const SOURCE_COLORS: Record<string, string> = {
  salary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  freelance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  business: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  rental: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  investment: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
};

const SOURCE_LABELS: Record<string, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  business: 'Business',
  rental: 'Rental',
  investment: 'Investment',
  other: 'Other',
};

export default function Income() {
  const { income, isLoading, addIncome, editIncome, removeIncome, getMonthlyIncome, currency } = useIncome();
  const { toast } = useToast();
  const { currency: settingsCurrency } = useSettings();

  const [showAdd, setShowAdd] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const monthlyIncome = getMonthlyIncome();
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);

  const handleAdd = async (values: { amount: number; source: string; description: string; date: string }) => {
    try {
      setIsSubmitting(true);
      await addIncome({
        amount: values.amount,
        source: values.source as any,
        description: values.description,
        date: values.date,
        isRecurring: false,
      });
      toast({ title: "Income Added", description: `${currency} ${values.amount.toLocaleString()} added.` });
      setShowAdd(false);
    } catch {
      toast({ title: "Error", description: "Failed to add income.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (values: { amount: number; source: string; description: string; date: string }) => {
    if (!editingIncome) return;
    try {
      setIsSubmitting(true);
      await editIncome(editingIncome._id, {
        amount: values.amount,
        source: values.source as any,
        description: values.description,
        date: values.date,
      });
      toast({ title: "Updated", description: "Income updated successfully." });
      setEditingIncome(null);
    } catch {
      toast({ title: "Error", description: "Failed to update income.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-emerald-500" />
              Income
            </h2>
            <p className="text-muted-foreground">Track all your income sources.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportIncomeToCSV(income, 'income.csv', settingsCurrency)}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Income
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {currency} {monthlyIncome.toLocaleString()}
            </p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Income</p>
            <p className="text-2xl font-bold font-mono">{currency} {totalIncome.toLocaleString()}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Records</p>
            <p className="text-2xl font-bold font-mono">{income.length}</p>
          </div>
        </div>

        {/* Income Table */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/30 text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {income.length > 0 ? (
                  income.map((inc) => (
                    <tr key={inc._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {format(parseISO(inc.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[inc.source] || SOURCE_COLORS.other}`}>
                          {SOURCE_LABELS[inc.source] || inc.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{inc.description}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{currency} {inc.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingIncome(inc)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={() => removeIncome(inc._id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No income records yet. Add your first income entry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {income.length > 0 && (
            <div className="bg-muted/30 border-t px-6 py-4 flex justify-end">
              <div className="flex flex-col items-end gap-0.5">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{currency} {totalIncome.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
          </DialogHeader>
          <IncomeForm onSubmit={handleAdd} isSubmitting={isSubmitting} submitLabel="Add Income" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingIncome} onOpenChange={(open) => !open && setEditingIncome(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Income</DialogTitle>
          </DialogHeader>
          {editingIncome && (
            <IncomeForm
              onSubmit={handleEdit}
              isSubmitting={isSubmitting}
              submitLabel="Save Changes"
              defaultValues={{
                amount: editingIncome.amount,
                source: editingIncome.source,
                description: editingIncome.description,
                date: parseISO(editingIncome.date),
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
