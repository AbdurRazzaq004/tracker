import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { CategoryChart } from "@/components/CategoryChart";
import { CashFlowChart } from "@/components/CashFlowChart";
import { useExpenses } from "@/context/ExpenseContext";
import { useIncome } from "@/context/IncomeContext";
import { useBudget } from "@/context/BudgetContext";
import { useSavings } from "@/context/SavingsContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import {
  DollarSign, Calendar, TrendingDown, CreditCard,
  TrendingUp, PiggyBank, AlertTriangle, Wallet,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  format, parseISO, isSameMonth, isSameDay, isSameWeek,
  addMonths, subMonths, startOfMonth, endOfMonth,
} from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { getMonthlyTotal, getExpensesByDate, expenses, currency, isLoading: expLoading } = useExpenses();
  const { getMonthlyIncome, income, isLoading: incLoading } = useIncome();
  const { budgetStatuses } = useBudget();
  const { overallProgress, totalSaved, totalTarget } = useSavings();

  const queryClient = useQueryClient();
  const processRecurring = useMutation({
    mutationFn: api.processRecurringRules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
    },
  });
  useEffect(() => { processRecurring.mutate(); }, []);

  // ── Month navigation ──
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const today = new Date();
  const isCurrentMonth = isSameMonth(selectedMonth, today);

  const prevMonth = () => setSelectedMonth(d => subMonths(d, 1));
  const nextMonth = () => setSelectedMonth(d => addMonths(d, 1));
  const goToToday = () => setSelectedMonth(new Date());

  // ── Filtered data for selected month ──
  const monthlyExpenses = getMonthlyTotal(selectedMonth);
  const monthlyIncome = getMonthlyIncome(selectedMonth);
  const remaining = monthlyIncome - monthlyExpenses;
  const isDeficit = remaining < 0;
  const spentPercent = monthlyIncome > 0
    ? Math.min(Math.round((monthlyExpenses / monthlyIncome) * 100), 100)
    : 0;
  const isWarning = !isDeficit && spentPercent >= 80;

  // Expenses within selected month
  const monthExpenses = expenses.filter(e => isSameMonth(parseISO(e.date), selectedMonth));
  const recentTransactions = monthExpenses.slice(0, 5);

  // Daily/weekly only meaningful for current month
  const todayTotal = isCurrentMonth
    ? getExpensesByDate(today).reduce((s, e) => s + e.amount, 0)
    : 0;

  const weekTotal = isCurrentMonth
    ? expenses.filter(e => isSameWeek(parseISO(e.date), today)).reduce((s, e) => s + e.amount, 0)
    : 0;

  // For past months: average daily and peak day spending
  const avgDaily = monthExpenses.length > 0
    ? Math.round(monthlyExpenses / new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate())
    : 0;

  const peakDay = (() => {
    const dayMap: Record<string, number> = {};
    for (const e of monthExpenses) {
      const d = e.date.split('T')[0];
      dayMap[d] = (dayMap[d] || 0) + e.amount;
    }
    return Math.max(0, ...Object.values(dayMap));
  })();

  const alertBudgets = budgetStatuses.filter(b => b.isOver || b.isNearLimit);
  const isLoading = expLoading || incLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Header + Month Picker ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isCurrentMonth ? 'Current month financial overview' : 'Viewing a past month'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-card border rounded-xl px-2 py-1.5 w-fit">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[120px] text-center">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={nextMonth}
              disabled={isCurrentMonth}
            >
              <ChevronRight className={cn("w-4 h-4", isCurrentMonth && "opacity-30")} />
            </Button>
            {!isCurrentMonth && (
              <Button variant="outline" size="sm" className="h-7 text-xs ml-1" onClick={goToToday}>
                Today
              </Button>
            )}
          </div>
        </div>

        {/* ── REMAINING BALANCE HERO ── */}
        <div className={cn(
          "rounded-2xl p-6 text-white relative overflow-hidden",
          isDeficit
            ? "bg-gradient-to-br from-red-600 to-red-800"
            : isWarning
            ? "bg-gradient-to-br from-amber-500 to-orange-600"
            : "bg-gradient-to-br from-emerald-500 to-emerald-700"
        )}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 opacity-80" />
                <p className="text-sm font-medium opacity-80">
                  {isDeficit ? 'Deficit — ' : 'Remaining Balance — '}
                  {format(selectedMonth, 'MMMM yyyy')}
                </p>
              </div>
              {!isCurrentMonth && (
                <span className="text-xs bg-white/20 rounded-full px-2.5 py-0.5 font-medium">
                  Past Month
                </span>
              )}
            </div>

            <p className="text-5xl font-bold font-mono tracking-tight mt-1">
              {isDeficit ? '-' : ''}{currency} {Math.abs(remaining).toLocaleString()}
            </p>

            <p className="text-sm opacity-75 mt-1">
              {monthlyIncome > 0
                ? `${currency} ${monthlyExpenses.toLocaleString()} spent out of ${currency} ${monthlyIncome.toLocaleString()} earned`
                : isCurrentMonth
                ? 'No income recorded this month'
                : 'No income was recorded this month'}
            </p>

            {/* Depletion bar */}
            {monthlyIncome > 0 && (
              <div className="mt-5 space-y-1.5">
                <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-white transition-all duration-700"
                    style={{ width: `${isDeficit ? 100 : spentPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs opacity-75">
                  <span>{spentPercent}% of income spent</span>
                  <span>
                    {isDeficit
                      ? `${currency} ${Math.abs(remaining).toLocaleString()} over!`
                      : `${currency} ${remaining.toLocaleString()} left`}
                  </span>
                </div>
              </div>
            )}

            {monthlyIncome === 0 && isCurrentMonth && (
              <div className="mt-4 text-sm opacity-80 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <a href="/income" className="underline font-medium">Add income to track balance →</a>
              </div>
            )}
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <StatCard
            title={`${format(selectedMonth, 'MMM')} Income`}
            amount={monthlyIncome}
            currency={currency}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="positive"
            subtitle="Total earned"
          />
          <StatCard
            title={`${format(selectedMonth, 'MMM')} Expenses`}
            amount={monthlyExpenses}
            currency={currency}
            icon={<TrendingDown className="h-4 w-4" />}
            subtitle="Total spent"
          />
          {isCurrentMonth ? (
            <StatCard
              title="Today's Spending"
              amount={todayTotal}
              currency={currency}
              icon={<DollarSign className="h-4 w-4" />}
              subtitle={format(today, 'EEEE, MMM dd')}
            />
          ) : (
            <StatCard
              title="Avg Daily Spending"
              amount={avgDaily}
              currency={currency}
              icon={<DollarSign className="h-4 w-4" />}
              subtitle="Per day this month"
            />
          )}
          {isCurrentMonth ? (
            <StatCard
              title="This Week"
              amount={weekTotal}
              currency={currency}
              icon={<Calendar className="h-4 w-4" />}
              subtitle="Current week total"
            />
          ) : (
            <StatCard
              title="Peak Day Spending"
              amount={peakDay}
              currency={currency}
              icon={<Calendar className="h-4 w-4" />}
              subtitle="Highest single day"
            />
          )}
          <StatCard
            title="Transactions"
            amount={monthExpenses.length}
            currency="#"
            icon={<CreditCard className="h-4 w-4" />}
            subtitle={`Expenses in ${format(selectedMonth, 'MMM')}`}
          />
          <StatCard
            title="Savings Progress"
            amount={overallProgress}
            currency="%"
            icon={<PiggyBank className="h-4 w-4" />}
            subtitle={totalTarget > 0
              ? `${currency} ${totalSaved.toLocaleString()} saved`
              : 'No active goals'}
          />
        </div>

        {/* ── CHARTS ── */}
        <div className="grid gap-4 md:grid-cols-2">
          <CategoryChart selectedMonth={selectedMonth} />
          <CashFlowChart />
        </div>

        {/* ── BOTTOM ROW ── */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4" />
                {isCurrentMonth ? 'Recent Expenses' : `${format(selectedMonth, 'MMMM')} Expenses`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((expense) => (
                  <div key={expense._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-xs shrink-0">
                        {expense.category.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{expense.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {expense.category} · {format(parseISO(expense.date), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-sm text-red-500 shrink-0">
                      -{currency} {expense.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No expenses in {format(selectedMonth, 'MMMM yyyy')}.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget Alerts — only for current month */}
          {isCurrentMonth ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Budget Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertBudgets.length > 0 ? (
                  <div className="space-y-3">
                    {alertBudgets.slice(0, 5).map((b) => (
                      <div key={b.categoryName} className="space-y-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">{b.categoryName}</span>
                          <span className={cn(
                            "text-xs font-mono font-bold",
                            b.isOver ? "text-red-500" : "text-amber-500"
                          )}>
                            {b.percentage}% {b.isOver ? '⚠ Over!' : 'Near limit'}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                          <div
                            className={cn("h-1.5 rounded-full", b.isOver ? "bg-red-500" : "bg-amber-500")}
                            style={{ width: `${Math.min(b.percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {currency} {b.spent.toLocaleString()} / {currency} {b.limit.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : budgetStatuses.length > 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-2">
                      <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All budgets on track!</p>
                    <p className="text-xs text-muted-foreground mt-1">No categories near their limit.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <p className="text-sm text-muted-foreground">No budgets set yet.</p>
                    <a href="/budgets" className="text-xs text-primary mt-1 hover:underline">Set category budgets →</a>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Past month: category breakdown instead of budget alerts */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="w-4 h-4" />
                  {format(selectedMonth, 'MMMM')} — Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthExpenses.length > 0 ? (() => {
                  const catMap: Record<string, number> = {};
                  for (const e of monthExpenses) catMap[e.category] = (catMap[e.category] || 0) + e.amount;
                  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
                  return (
                    <div className="space-y-3">
                      {sorted.slice(0, 5).map(([cat, amt]) => {
                        const pct = Math.round((amt / monthlyExpenses) * 100);
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{cat}</span>
                              <span className="font-mono text-muted-foreground">
                                {currency} {amt.toLocaleString()} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    No expense data for this month.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </Layout>
  );
}
