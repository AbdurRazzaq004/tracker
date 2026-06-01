import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useBudget } from "@/context/BudgetContext";
import { useExpenses } from "@/context/ExpenseContext";
import { useSettings } from "@/context/SettingsContext";
import { Target, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Budgets() {
  const { budgets, budgetStatuses, isLoading, saveBudget, removeBudget } = useBudget();
  const { categories } = useExpenses();
  const { currency } = useSettings();
  const { toast } = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    categoryName: '',
    monthlyLimit: '',
    alertThreshold: '80',
    isStanding: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const now = new Date();

  const handleSave = async () => {
    if (!form.categoryName || !form.monthlyLimit) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      await saveBudget({
        categoryName: form.categoryName,
        monthlyLimit: Number(form.monthlyLimit),
        alertThreshold: Number(form.alertThreshold),
        month: form.isStanding ? -1 : now.getMonth(),
        year: form.isStanding ? -1 : now.getFullYear(),
      });
      toast({ title: "Budget Saved", description: `Budget set for ${form.categoryName}.` });
      setShowDialog(false);
      setForm({ categoryName: '', monthlyLimit: '', alertThreshold: '80', isStanding: true });
    } catch {
      toast({ title: "Error", description: "Failed to save budget.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await removeBudget(id);
    toast({ title: "Deleted", description: "Budget removed." });
  };

  // All categories — merge with existing budgets so we show ALL categories
  const allCategoryNames = Array.from(new Set([
    ...categories,
    ...budgets.map(b => b.categoryName),
  ]));

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
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
              <Target className="w-7 h-7 text-primary" />
              Budgets
            </h2>
            <p className="text-muted-foreground">Set spending limits per category and track your progress.</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Set Budget
          </Button>
        </div>

        {/* Overview */}
        {budgetStatuses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
              <p className="text-2xl font-bold font-mono">{currency} {budgetStatuses.reduce((s, b) => s + b.limit, 0).toLocaleString()}</p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
              <p className="text-2xl font-bold font-mono">{currency} {budgetStatuses.reduce((s, b) => s + b.spent, 0).toLocaleString()}</p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p className={cn("text-2xl font-bold font-mono", budgetStatuses.reduce((s, b) => s + b.limit - b.spent, 0) < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400")}>
                {currency} {Math.abs(budgetStatuses.reduce((s, b) => s + b.limit - b.spent, 0)).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Budget Cards */}
        {budgetStatuses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {budgetStatuses.map((status) => {
              const budget = budgets.find(b => b.categoryName === status.categoryName);
              return (
                <div key={status.categoryName} className={cn(
                  "bg-card border rounded-xl p-5 space-y-3",
                  status.isOver ? "border-red-300 dark:border-red-800" :
                  status.isNearLimit ? "border-amber-300 dark:border-amber-800" : ""
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {status.isOver ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : status.isNearLimit ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      <span className="font-medium">{status.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-mono font-bold", status.isOver ? "text-red-500" : status.isNearLimit ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400")}>
                        {status.percentage}%
                      </span>
                      {budget && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(budget._id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all duration-500",
                        status.isOver ? "bg-red-500" :
                        status.isNearLimit ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(status.percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Spent: <span className="font-mono font-medium text-foreground">{currency} {status.spent.toLocaleString()}</span></span>
                    <span>Limit: <span className="font-mono font-medium text-foreground">{currency} {status.limit.toLocaleString()}</span></span>
                  </div>

                  {status.isOver && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Over budget by {currency} {(status.spent - status.limit).toLocaleString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-12 text-center space-y-3">
            <Target className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">No budgets set yet</h3>
            <p className="text-sm text-muted-foreground">Set category budgets to track your spending limits.</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Set First Budget
            </Button>
          </div>
        )}

        {/* All budgets table (standing) */}
        {budgets.length > 0 && (
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b bg-secondary/30">
              <h3 className="font-medium text-sm">All Budget Rules</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Monthly Limit</th>
                  <th className="px-4 py-2 text-left">Alert At</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {budgets.map(b => (
                  <tr key={b._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{b.categoryName}</td>
                    <td className="px-4 py-3 font-mono">{currency} {b.monthlyLimit.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.alertThreshold}%</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                        {b.month === -1 ? 'Standing' : `${now.toLocaleString('default', { month: 'short' })} ${b.year}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(b._id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Set Budget Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Category Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category *</label>
              <Select value={form.categoryName} onValueChange={v => setForm(f => ({ ...f, categoryName: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {allCategoryNames.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Monthly Limit ({currency}) *</label>
              <Input
                type="number"
                value={form.monthlyLimit}
                onChange={e => setForm(f => ({ ...f, monthlyLimit: e.target.value }))}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Alert Threshold (%)</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={form.alertThreshold}
                onChange={e => setForm(f => ({ ...f, alertThreshold: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Show alert when spending reaches this % of limit</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Budget Type</label>
              <Select
                value={form.isStanding ? 'standing' : 'monthly'}
                onValueChange={v => setForm(f => ({ ...f, isStanding: v === 'standing' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standing">Standing (every month)</SelectItem>
                  <SelectItem value="monthly">This month only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
