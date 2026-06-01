import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useExpenses, Category } from "@/context/ExpenseContext";
import {
  format, parseISO, isWithinInterval, startOfDay, endOfDay,
  startOfWeek, endOfWeek, eachWeekOfInterval,
  startOfMonth, endOfMonth, isSameMonth,
  addMonths, subMonths,
} from "date-fns";
import {
  CalendarIcon, Trash2, Filter, X, Edit2, Download,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  List, Calendar, CheckSquare, Square, Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@shared/schema";
import { exportToCSV } from "@/lib/export";
import { useSettings } from "@/context/SettingsContext";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', online: 'Online',
  bank_transfer: 'Bank Transfer', other: 'Other',
};

const WEEK_COLORS = [
  'border-l-blue-400', 'border-l-emerald-400',
  'border-l-violet-400', 'border-l-amber-400', 'border-l-rose-400',
];

const CAT_DOT_COLORS = [
  'bg-blue-400', 'bg-emerald-400', 'bg-violet-400',
  'bg-amber-400', 'bg-rose-400', 'bg-cyan-400',
];

// ── Shared: floating bulk-delete bar ────────────────────────
function BulkActionBar({
  count,
  onDelete,
  onClear,
}: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-foreground text-background rounded-2xl px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="w-px h-4 bg-background/30" />
      <Button
        size="sm"
        variant="destructive"
        className="h-7 gap-1.5"
        onClick={onDelete}
      >
        <Trash className="w-3.5 h-3.5" />
        Delete Selected
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-background hover:text-background hover:bg-background/10"
        onClick={onClear}
      >
        Cancel
      </Button>
    </div>
  );
}

// ── Shared: edit expense dialog ──────────────────────────────
function EditDialog({
  expense,
  categories,
  currency,
  onSave,
  onClose,
}: {
  expense: Expense | null;
  categories: string[];
  currency: string;
  onSave: (updates: Partial<Expense>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    amount: String(expense?.amount ?? ''),
    category: expense?.category ?? '',
    description: expense?.description ?? '',
    paymentMethod: expense?.paymentMethod ?? 'cash',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave({
        amount: Number(form.amount),
        category: form.category,
        description: form.description,
        paymentMethod: form.paymentMethod as any,
      });
      toast({ title: "Updated", description: "Expense updated." });
      onClose();
    } catch {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!expense} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount ({currency})</label>
            <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Payment Method</label>
            <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Weekly View ──────────────────────────────────────────────
function WeeklyView() {
  const { expenses, deleteExpense, editExpense, categories, currency } = useExpenses();
  const { toast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 0: true });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const weekStarts = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

  const weeks = weekStarts.map((weekStart, idx) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const from = weekStart < monthStart ? monthStart : weekStart;
    const to = weekEnd > monthEnd ? monthEnd : weekEnd;
    const weekExpenses = expenses
      .filter(e => isWithinInterval(parseISO(e.date), { start: startOfDay(from), end: endOfDay(to) }))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    const total = weekExpenses.reduce((s, e) => s + e.amount, 0);
    const catMap: Record<string, number> = {};
    for (const e of weekExpenses) catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    return { idx, from, to, weekExpenses, total, topCategories };
  });

  const monthTotal = weeks.reduce((s, w) => s + w.total, 0);
  const allMonthIds = weeks.flatMap(w => w.weekExpenses.map(e => e._id));

  // Selection helpers
  const toggleId = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleWeekAll = (ids: string[]) => {
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === allMonthIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allMonthIds));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selectedIds].map(id => deleteExpense(id)));
      toast({ title: "Deleted", description: `${selectedIds.size} expense${selectedIds.size > 1 ? 's' : ''} deleted.` });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Error", description: "Some deletions failed.", variant: "destructive" });
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-4">
      {/* Month nav + select all */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 bg-card border rounded-xl px-2 py-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedMonth(d => subMonths(d, 1)); setSelectedIds(new Set()); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[130px] text-center">{format(selectedMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedMonth(d => addMonths(d, 1)); setSelectedIds(new Set()); }} disabled={isCurrentMonth}>
            <ChevronRight className={cn("w-4 h-4", isCurrentMonth && "opacity-30")} />
          </Button>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" className="h-7 text-xs ml-1" onClick={() => { setSelectedMonth(new Date()); setSelectedIds(new Set()); }}>
              This Month
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {allMonthIds.length > 0 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedIds.size === allMonthIds.length
                ? <CheckSquare className="w-4 h-4 text-primary" />
                : <Square className="w-4 h-4" />}
              {selectedIds.size === allMonthIds.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Month Total</p>
            <p className="text-lg font-bold font-mono">{currency} {monthTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Week cards */}
      {weeks.map(({ idx, from, to, weekExpenses, total, topCategories }) => {
        const isExpanded = expandedWeeks[idx] !== false;
        const weekIds = weekExpenses.map(e => e._id);
        const weekAllSelected = weekIds.length > 0 && weekIds.every(id => selectedIds.has(id));
        const weekSomeSelected = weekIds.some(id => selectedIds.has(id));

        return (
          <div key={idx} className={cn("bg-card border-l-4 border rounded-xl overflow-hidden", WEEK_COLORS[idx % WEEK_COLORS.length])}>
            {/* Week header */}
            <div className="flex items-center px-4 py-3 hover:bg-secondary/30 transition-colors gap-3">
              {weekIds.length > 0 && (
                <Checkbox
                  checked={weekAllSelected}
                  onCheckedChange={() => toggleWeekAll(weekIds)}
                  className="shrink-0"
                  onClick={e => e.stopPropagation()}
                />
              )}
              <button className="flex-1 flex items-center justify-between" onClick={() => setExpandedWeeks(p => ({ ...p, [idx]: !p[idx] }))}>
                <div className="text-left">
                  <p className="font-semibold text-sm">
                    Week {idx + 1}
                    <span className="text-muted-foreground font-normal ml-2 text-xs">
                      {format(from, 'MMM d')} – {format(to, 'MMM d')}
                    </span>
                    {weekSomeSelected && !weekAllSelected && (
                      <span className="ml-2 text-[10px] text-primary font-medium">
                        ({weekIds.filter(id => selectedIds.has(id)).length} selected)
                      </span>
                    )}
                  </p>
                  {topCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {topCategories.slice(0, 3).map(([cat, amt]) => (
                        <span key={cat} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">
                          {cat}: {currency} {amt.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-mono font-bold text-base">{currency} {total.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{weekExpenses.length} expense{weekExpenses.length !== 1 ? 's' : ''}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t">
                {weekExpenses.length > 0 ? (
                  <>
                    {topCategories.length > 1 && (
                      <div className="px-4 py-3 bg-secondary/20 space-y-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Category Breakdown</p>
                        <div className="flex gap-0.5 h-2 rounded-full overflow-hidden w-full">
                          {topCategories.map(([cat, amt], i) => (
                            <div key={cat} className={`h-full ${CAT_DOT_COLORS[i % CAT_DOT_COLORS.length]}`}
                              style={{ width: `${total > 0 ? (amt / total) * 100 : 0}%` }}
                              title={`${cat}: ${currency} ${amt.toLocaleString()}`} />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {topCategories.map(([cat, amt], i) => (
                            <span key={cat} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className={`w-1.5 h-1.5 rounded-full ${CAT_DOT_COLORS[i % CAT_DOT_COLORS.length]}`} />
                              {cat} {total > 0 ? Math.round((amt / total) * 100) : 0}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-border">
                      {weekExpenses.map(expense => (
                        <div
                          key={expense._id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors",
                            selectedIds.has(expense._id) && "bg-primary/5"
                          )}
                        >
                          <Checkbox
                            checked={selectedIds.has(expense._id)}
                            onCheckedChange={() => toggleId(expense._id)}
                            className="shrink-0"
                          />
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-[10px] shrink-0">
                            {expense.category.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{expense.description}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {format(parseISO(expense.date), 'EEE, MMM d')}
                              </span>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5">{expense.category}</Badge>
                              <span className="text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground">
                                {PAYMENT_METHOD_LABELS[expense.paymentMethod || 'cash']}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-sm text-red-500">
                              -{currency} {expense.amount.toLocaleString()}
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setEditingExpense(expense)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => deleteExpense(expense._id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="px-4 py-2 bg-secondary/20 border-t flex justify-end">
                      <p className="text-xs text-muted-foreground font-mono">
                        Week total: <span className="font-bold text-foreground">{currency} {total.toLocaleString()}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No expenses this week.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <EditDialog
        expense={editingExpense}
        categories={categories}
        currency={currency}
        onSave={(updates) => editExpense(editingExpense!._id, updates)}
        onClose={() => setEditingExpense(null)}
      />

      <BulkActionBar
        count={selectedIds.size}
        onDelete={() => setConfirmDelete(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} expense{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected {selectedIds.size} expense{selectedIds.size > 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── List View ────────────────────────────────────────────────
function ListView() {
  const { expenses, deleteExpense, editExpense, currency, categories } = useExpenses();
  const { currency: settingsCurrency } = useSettings();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [paymentFilter, setPaymentFilter] = useState<string>("All");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = parseISO(expense.date);
    if (dateRange.from && dateRange.to) {
      if (!isWithinInterval(expenseDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false;
    } else if (dateRange.from) {
      if (!isWithinInterval(expenseDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) })) return false;
    }
    if (categoryFilter !== "All" && expense.category !== categoryFilter) return false;
    if (paymentFilter !== "All" && (expense.paymentMethod || 'cash') !== paymentFilter) return false;
    return true;
  });

  const allFilteredIds = filteredExpenses.map(e => e._id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
  const someSelected = allFilteredIds.some(id => selectedIds.has(id));

  const toggleId = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => new Set([...prev, ...allFilteredIds]));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selectedIds].map(id => deleteExpense(id)));
      toast({ title: "Deleted", description: `${selectedIds.size} expense${selectedIds.size > 1 ? 's' : ''} deleted.` });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Error", description: "Some deletions failed.", variant: "destructive" });
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={categoryFilter} onValueChange={(val: any) => setCategoryFilter(val)}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {["All", ...categories].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Methods</SelectItem>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-52 justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from
                ? dateRange.to
                  ? <>{format(dateRange.from, "LLL dd")} – {format(dateRange.to, "LLL dd")}</>
                  : format(dateRange.from, "LLL dd, y")
                : <span>Pick date range</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarPicker
              initialFocus mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange as any}
              onSelect={setDateRange as any}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {(dateRange.from || categoryFilter !== "All" || paymentFilter !== "All") && (
          <Button variant="ghost" size="icon" onClick={() => { setDateRange({}); setCategoryFilter("All"); setPaymentFilter("All"); }}>
            <X className="w-4 h-4" />
          </Button>
        )}

        <Button variant="outline" size="icon" title="Export CSV"
          onClick={() => exportToCSV(filteredExpenses, 'expenses.csv', settingsCurrency)}>
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-muted-foreground font-medium border-b">
              <tr>
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map(expense => (
                  <tr
                    key={expense._id}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      selectedIds.has(expense._id) && "bg-primary/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(expense._id)}
                        onCheckedChange={() => toggleId(expense._id)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {format(parseISO(expense.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{expense.description}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[expense.paymentMethod || 'cash']}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-sm">
                      {currency} {expense.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                          onClick={() => setEditingExpense(expense)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteExpense(expense._id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredExpenses.length > 0 && (
          <div className="bg-muted/30 border-t px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {filteredExpenses.length} record{filteredExpenses.length !== 1 ? 's' : ''}
              </p>
              {someSelected && (
                <p className="text-sm text-primary font-medium">
                  {allFilteredIds.filter(id => selectedIds.has(id)).length} selected
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <p className="text-xs text-muted-foreground">
                {categoryFilter !== "All" ? `Total (${categoryFilter})` : "Total"}
              </p>
              <p className="text-2xl font-bold font-mono">
                {currency} {filteredExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      <EditDialog
        expense={editingExpense}
        categories={categories}
        currency={currency}
        onSave={(updates) => editExpense(editingExpense!._id, updates)}
        onClose={() => setEditingExpense(null)}
      />

      <BulkActionBar
        count={allFilteredIds.filter(id => selectedIds.has(id)).length}
        onDelete={() => setConfirmDelete(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {allFilteredIds.filter(id => selectedIds.has(id)).length} expense{allFilteredIds.filter(id => selectedIds.has(id)).length > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected expenses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function History() {
  const { isLoading } = useExpenses();

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight">Expense History</h2>
          <p className="text-muted-foreground">View, filter and manage your spending.</p>
        </div>

        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Weekly View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-1.5">
              <List className="w-3.5 h-3.5" />
              All Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4">
            <WeeklyView />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <ListView />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
