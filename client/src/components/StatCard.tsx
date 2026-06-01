import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  amount: number;
  currency: string;
  icon: React.ReactNode;
  trend?: string;
  subtitle?: string;
  variant?: 'default' | 'positive' | 'negative' | 'neutral';
  className?: string;
}

export function StatCard({ title, amount, currency, icon, trend, subtitle, variant = 'default', className }: StatCardProps) {
  const isPositive = variant === 'positive';
  const isNegative = variant === 'negative';

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center",
          isPositive ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" :
          isNegative ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400" :
          "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-2xl font-bold font-mono tracking-tight",
          isPositive ? "text-emerald-600 dark:text-emerald-400" :
          isNegative ? "text-red-600 dark:text-red-400" :
          ""
        )}>
          {isNegative && amount > 0 ? '-' : isPositive && amount > 0 ? '+' : ''}
          {currency} {Math.abs(amount).toLocaleString()}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
        {trend && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend.startsWith('+') ? <TrendingUp className="w-3 h-3 text-emerald-500" /> :
             trend.startsWith('-') ? <TrendingDown className="w-3 h-3 text-red-500" /> : null}
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
