import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useExpenses } from '@/context/ExpenseContext';
import { useIncome } from '@/context/IncomeContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CashFlowChart() {
  const { getLast6MonthsData: getExpenseData, currency } = useExpenses();
  const { getLast6MonthsData: getIncomeData } = useIncome();

  const expenseData = getExpenseData();
  const incomeData = getIncomeData();

  const data = expenseData.map((e, i) => ({
    month: e.month,
    Expenses: e.expenses,
    Income: incomeData[i]?.income ?? 0,
    Net: (incomeData[i]?.income ?? 0) - e.expenses,
  }));

  return (
    <Card className="h-full min-h-[400px]">
      <CardHeader>
        <CardTitle>Cash Flow — Last 6 Months</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                formatter={(value: number, name: string) => [`${currency} ${value.toLocaleString()}`, name]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Bar dataKey="Income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
