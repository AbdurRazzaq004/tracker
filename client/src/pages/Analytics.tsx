import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useExpenses } from "@/context/ExpenseContext";
import { useIncome } from "@/context/IncomeContext";
import { useBudget } from "@/context/BudgetContext";
import { useSettings } from "@/context/SettingsContext";
import { BarChart2, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCSV, exportIncomeToCSV } from "@/lib/export";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { parseISO, isSameMonth, format } from "date-fns";

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#FF8042', '#00C49F', '#FFBB28',
];

export default function Analytics() {
  const { expenses, isLoading: expLoading, getLast6MonthsData } = useExpenses();
  const { income, isLoading: incLoading, getLast6MonthsData: getIncomeLast6, getIncomeBySource } = useIncome();
  const { budgetStatuses } = useBudget();
  const { currency } = useSettings();

  const [trendDays, setTrendDays] = useState<30 | 90 | 180>(30);

  const isLoading = expLoading || incLoading;

  // YTD computations
  const now = new Date();
  const thisYear = now.getFullYear();
  const ytdExpenses = expenses.filter(e => parseISO(e.date).getFullYear() === thisYear).reduce((s, e) => s + e.amount, 0);
  const ytdIncome = income.filter(i => parseISO(i.date).getFullYear() === thisYear).reduce((s, i) => s + i.amount, 0);
  const ytdNet = ytdIncome - ytdExpenses;
  const savingsRate = ytdIncome > 0 ? Math.round((ytdNet / ytdIncome) * 100) : 0;

  // 12-month bar chart
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const monthExp = expenses.filter(e => isSameMonth(parseISO(e.date), d)).reduce((s, e) => s + e.amount, 0);
    const monthInc = income.filter(inc => isSameMonth(parseISO(inc.date), d)).reduce((s, inc) => s + inc.amount, 0);
    return {
      month: format(d, 'MMM yy'),
      Income: monthInc,
      Expenses: monthExp,
    };
  });

  // Spending trend (daily, past N days)
  const cutoff = new Date(now.getTime() - trendDays * 24 * 60 * 60 * 1000);
  const trendData: { date: string; amount: number }[] = [];
  const filtered = expenses.filter(e => parseISO(e.date) >= cutoff);
  const dayMap: Record<string, number> = {};
  for (const e of filtered) {
    const day = e.date.split('T')[0];
    dayMap[day] = (dayMap[day] || 0) + e.amount;
  }
  for (const [date, amount] of Object.entries(dayMap).sort()) {
    trendData.push({ date: format(parseISO(date), 'MMM dd'), amount });
  }

  // Category breakdown
  const categoryData = expenses.reduce((acc, e) => {
    const ex = acc.find(x => x.name === e.category);
    if (ex) ex.value += e.amount;
    else acc.push({ name: e.category, value: e.amount });
    return acc;
  }, [] as { name: string; value: number }[]).sort((a, b) => b.value - a.value);

  // Income sources
  const sourceData = Object.entries(getIncomeBySource()).map(([name, value]) => ({ name, value }));

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    borderRadius: 'var(--radius)',
    fontSize: '12px',
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
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
              <BarChart2 className="w-7 h-7 text-primary" />
              Analytics
            </h2>
            <p className="text-muted-foreground">Deep insights into your financial data.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCSV(expenses, 'expenses.csv', currency)}>
              <Download className="w-4 h-4 mr-2" />
              Export Expenses
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportIncomeToCSV(income, 'income.csv', currency)}>
              <Download className="w-4 h-4 mr-2" />
              Export Income
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
            <TabsTrigger value="income">Income Sources</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'YTD Income', value: ytdIncome, color: 'text-emerald-600 dark:text-emerald-400', icon: <TrendingUp className="w-4 h-4" /> },
                { label: 'YTD Expenses', value: ytdExpenses, color: 'text-red-500', icon: <TrendingDown className="w-4 h-4" /> },
                { label: 'YTD Net', value: Math.abs(ytdNet), color: ytdNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500', icon: <BarChart2 className="w-4 h-4" /> },
                { label: 'Savings Rate', value: savingsRate, color: savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500', icon: <TrendingUp className="w-4 h-4" />, suffix: '%' },
              ].map(card => (
                <Card key={card.label}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs text-muted-foreground font-medium">{card.label}</CardTitle>
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">{card.icon}</div>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold font-mono ${card.color}`}>
                      {card.suffix ? `${Math.abs(card.value)}${card.suffix}` : `${currency} ${card.value.toLocaleString()}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Year {thisYear} to date</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">12-Month Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last12Months} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <Tooltip formatter={(v: number, n: string) => [`${currency} ${v.toLocaleString()}`, n]} contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="Income" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Expenses" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CASH FLOW */}
          <TabsContent value="cashflow" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Cash Flow (All Time)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last12Months} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <Tooltip formatter={(v: number, n: string) => [`${currency} ${v.toLocaleString()}`, n]} contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="Income" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Expenses" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRENDS */}
          <TabsContent value="trends" className="mt-4 space-y-4">
            <div className="flex gap-2">
              {([30, 90, 180] as const).map(d => (
                <Button
                  key={d}
                  variant={trendDays === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendDays(d)}
                >
                  {d} days
                </Button>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Daily Spending Trend</CardTitle></CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                        <Tooltip formatter={(v: number) => [`${currency} ${v.toLocaleString()}`, 'Spent']} contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    No expense data for the selected period.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BY CATEGORY */}
          <TabsContent value="categories" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Spending Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${currency} ${v.toLocaleString()}`, 'Spent']} contentStyle={tooltipStyle} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryData.slice(0, 8).map((cat, i) => {
                      const total = categoryData.reduce((s, c) => s + c.value, 0);
                      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                      const budget = budgetStatuses.find(b => b.categoryName === cat.name);
                      return (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{cat.name}</span>
                            <span className="font-mono text-muted-foreground">{currency} {cat.value.toLocaleString()} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                          {budget && (
                            <p className="text-[10px] text-muted-foreground">
                              Budget: {currency} {budget.limit.toLocaleString()} — {budget.percentage}% used
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* INCOME SOURCES */}
          <TabsContent value="income" className="mt-4">
            {sourceData.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Income by Source</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => [`${currency} ${v.toLocaleString()}`, 'Income']} contentStyle={tooltipStyle} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Source Details</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sourceData.sort((a, b) => b.value - a.value).map((src, i) => {
                        const total = sourceData.reduce((s, x) => s + x.value, 0);
                        const pct = total > 0 ? Math.round((src.value / total) * 100) : 0;
                        return (
                          <div key={src.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium capitalize">{src.name}</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400">+{currency} {src.value.toLocaleString()} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3" />
                <p>No income data yet. Add income entries to see source breakdown.</p>
                <a href="/income" className="text-primary text-sm hover:underline mt-1 block">Add income →</a>
              </div>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </Layout>
  );
}
