import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useExpenses } from "@/context/ExpenseContext";
import { useSettings } from "@/context/SettingsContext";
import { RefreshCw, Plus, Trash2, Pause, Play, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import type { RecurringRule } from "@shared/schema";

const INCOME_SOURCE_LABELS: Record<string, string> = {
  salary: 'Salary', freelance: 'Freelance', business: 'Business',
  rental: 'Rental', investment: 'Investment', other: 'Other',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', online: 'Online', bank_transfer: 'Bank Transfer', other: 'Other',
};

export default function Recurring() {
  const { categories } = useExpenses();
  const { currency } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: api.fetchRecurringRules,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteRecurringRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { isActive: boolean } }) =>
      api.updateRecurringRule(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring'] }),
  });

  const createMutation = useMutation({
    mutationFn: api.createRecurringRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
    },
  });

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    type: 'expense' as 'expense' | 'income',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly',
    amount: '',
    category: '',
    source: 'salary',
    description: '',
    paymentMethod: 'cash',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.amount || !form.description || !form.startDate) {
      toast({ title: "Error", description: "Amount, description, and start date are required.", variant: "destructive" });
      return;
    }
    if (form.type === 'expense' && !form.category) {
      toast({ title: "Error", description: "Category is required for expenses.", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      await createMutation.mutateAsync({
        type: form.type,
        frequency: form.frequency,
        amount: Number(form.amount),
        category: form.type === 'expense' ? form.category : undefined,
        source: form.type === 'income' ? form.source : undefined,
        description: form.description,
        paymentMethod: form.type === 'expense' ? form.paymentMethod : undefined,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        isActive: true,
      });
      toast({ title: "Rule Created", description: `Recurring ${form.type} rule set.` });
      setShowDialog(false);
    } catch {
      toast({ title: "Error", description: "Failed to create rule.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePauseResume = async (rule: RecurringRule) => {
    await updateMutation.mutateAsync({ id: rule._id, updates: { isActive: !rule.isActive } });
    toast({ title: rule.isActive ? 'Paused' : 'Resumed', description: `"${rule.description}" ${rule.isActive ? 'paused' : 'resumed'}.` });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
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
              <RefreshCw className="w-7 h-7 text-primary" />
              Recurring Transactions
            </h2>
            <p className="text-muted-foreground">Automate repeating income and expenses.</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {rules.length > 0 ? (
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/30 text-muted-foreground border-b text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Frequency</th>
                    <th className="px-4 py-3 text-left">Category/Source</th>
                    <th className="px-4 py-3 text-left">Next On</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rules.map((rule) => (
                    <tr key={rule._id} className={`hover:bg-muted/30 transition-colors ${!rule.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <Badge variant={rule.type === 'income' ? 'default' : 'secondary'} className="text-xs">
                          {rule.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{rule.description}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{rule.frequency}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {rule.type === 'expense'
                          ? rule.category || '—'
                          : INCOME_SOURCE_LABELS[rule.source || 'other'] || rule.source}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {format(parseISO(rule.nextOccurrence), 'MMM dd, yyyy')}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${rule.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {rule.type === 'income' ? '+' : '-'}{currency} {rule.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handlePauseResume(rule)}
                            title={rule.isActive ? 'Pause' : 'Resume'}
                          >
                            {rule.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => deleteMutation.mutate(rule._id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-12 text-center space-y-3">
            <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">No recurring rules yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Set up recurring rules for your salary, rent, subscriptions, and other regular transactions.
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Rule
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Recurring Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type *</label>
                <Select value={form.type} onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Frequency *</label>
                <Select value={form.frequency} onValueChange={(v: any) => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount ({currency}) *</label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 50000" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description *</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly Salary, Netflix Subscription" />
            </div>

            {form.type === 'expense' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category *</label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Income Source</label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INCOME_SOURCE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Start Date *</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">End Date (Optional)</label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Rule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
