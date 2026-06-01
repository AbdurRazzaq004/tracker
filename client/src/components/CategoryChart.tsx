import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useExpenses } from '@/context/ExpenseContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSameMonth, parseISO, format } from 'date-fns';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#FF8042',
  '#00C49F',
  '#FFBB28',
];

interface CategoryChartProps {
  selectedMonth?: Date;
}

export function CategoryChart({ selectedMonth }: CategoryChartProps) {
  const { expenses, currency } = useExpenses();

  const filtered = selectedMonth
    ? expenses.filter(e => isSameMonth(parseISO(e.date), selectedMonth))
    : expenses;

  const data = filtered.reduce((acc, expense) => {
    const existing = acc.find(item => item.name === expense.category);
    if (existing) {
      existing.value += expense.amount;
    } else {
      acc.push({ name: expense.category, value: expense.amount });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const title = selectedMonth
    ? `${format(selectedMonth, 'MMMM')} — Spending by Category`
    : 'Spending by Category';

  return (
    <Card className="h-full min-h-[400px]">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, 'Spent']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No expenses for this month.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
