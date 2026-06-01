import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useExpenses } from "@/context/ExpenseContext";
import { format, getMonth, getYear, getDaysInMonth, startOfDay, isSameDay, isWithinInterval, startOfMonth, endOfMonth, parseISO, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/StatCard";

export default function MonthlyAnalytics() {
  const { expenses, currency, isLoading } = useExpenses();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = getYear(currentDate);
  const month = getMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = firstDay.getDay();

  // Get expenses for current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthExpenses = expenses.filter(expense => {
    const expenseDate = parseISO(expense.date);
    return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
  });

  // Calculate statistics
  const totalMonthly = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const avgDaily = monthExpenses.length > 0 ? totalMonthly / daysInMonth : 0;
  const highestDay = monthExpenses.reduce((max, e) => {
    const amount = monthExpenses
      .filter(ex => isSameDay(parseISO(ex.date), parseISO(e.date)))
      .reduce((sum, ex) => sum + ex.amount, 0);
    return amount > max ? amount : max;
  }, 0);

  // Group expenses by day
  const expensesByDay: Record<number, typeof expenses> = {};
  for (let i = 1; i <= daysInMonth; i++) {
    const dayDate = new Date(year, month, i);
    expensesByDay[i] = monthExpenses.filter(e => isSameDay(parseISO(e.date), dayDate));
  }

  // Get category breakdown
  const categoryBreakdown: Record<string, number> = {};
  monthExpenses.forEach(expense => {
    categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
  });

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Monthly Analytics</h2>
            <p className="text-muted-foreground">Track your expenses by month and day</p>
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={goToToday} className="min-w-32">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Current Month Header */}
        <div className="flex items-center justify-center gap-2 text-2xl font-bold">
          <Calendar className="w-6 h-6" />
          {format(currentDate, "MMMM yyyy")}
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total This Month"
            amount={totalMonthly}
            currency={currency}
            icon={<TrendingUp className="h-4 w-4" />}
            className="shadow-sm"
          />
          <StatCard
            title="Daily Average"
            amount={avgDaily}
            currency={currency}
            icon={<Calendar className="h-4 w-4" />}
            className="shadow-sm"
          />
          <StatCard
            title="Highest Day"
            amount={highestDay}
            currency={currency}
            icon={<TrendingUp className="h-4 w-4" />}
            className="shadow-sm"
          />
          <StatCard
            title="Days with Expenses"
            amount={Object.keys(expensesByDay).filter(day => expensesByDay[parseInt(day)].length > 0).length}
            currency="#"
            icon={<Calendar className="h-4 w-4" />}
            className="shadow-sm"
          />
        </div>

        {/* Calendar Grid */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells before first day */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}

              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayExpenses = expensesByDay[day] || [];
                const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
                const isToday = isSameDay(new Date(year, month, day), new Date());

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg border p-2 text-xs flex flex-col justify-between ${
                      isToday ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-secondary/50'
                    } transition-colors cursor-default`}
                  >
                    <div className={`font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {day}
                    </div>
                    {dayExpenses.length > 0 && (
                      <div className="space-y-1">
                        <div className="font-mono font-bold text-green-600 dark:text-green-400">
                          -{currency} {dayTotal.toLocaleString()}
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {dayExpenses.length} expense{dayExpenses.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = (amount / totalMonthly) * 100;
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{category}</span>
                          <span className="font-mono font-bold">
                            {currency} {amount.toLocaleString()} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-secondary/30 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Expenses Message */}
        {monthExpenses.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="pt-12 pb-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Expenses This Month</h3>
              <p className="text-muted-foreground">
                Start tracking your spending by adding an expense!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
