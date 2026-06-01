import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, PlusCircle, History, Wallet, Users, LogOut, Calendar,
  Gift, TrendingUp, Target, PiggyBank, RefreshCw, BarChart2, Settings,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { useIncome } from '@/context/IncomeContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useBudget } from '@/context/BudgetContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { getMonthlyTotal } = useExpenses();
  const { getMonthlyIncome } = useIncome();
  const { user, isSuperAdmin, logout } = useAuth();
  const { currency, defaultMonthlyBudget } = useSettings();
  const { totalBudget, totalSpent } = useBudget();
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const isActive = (path: string) => location === path;

  const monthlyIncome = getMonthlyIncome();
  const monthlyExpenses = getMonthlyTotal();
  const remaining = monthlyIncome - monthlyExpenses;
  const isDeficit = remaining < 0;

  const effectiveBudget = totalBudget > 0 ? totalBudget : defaultMonthlyBudget;
  const currentSpending = totalBudget > 0 ? totalSpent : monthlyExpenses;
  const percentage = monthlyIncome > 0
    ? Math.min(Math.round((monthlyExpenses / monthlyIncome) * 100), 100)
    : Math.min(Math.round((currentSpending / effectiveBudget) * 100), 100);
  const isOverBudget = isDeficit || currentSpending > effectiveBudget;

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navLink = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
        isActive(href)
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <nav className="md:w-64 bg-card border-r border-border flex flex-col md:h-screen sticky top-0 z-50">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight">MyWallet</h1>
            <p className="text-[10px] text-muted-foreground">Money Management</p>
          </div>
        </div>

        <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navLink('/', <LayoutDashboard className="w-4 h-4" />, 'Dashboard')}
          {navLink('/add', <PlusCircle className="w-4 h-4" />, 'Add Expense')}
          {navLink('/history', <History className="w-4 h-4" />, 'History')}
          {navLink('/income', <TrendingUp className="w-4 h-4" />, 'Income')}
          {navLink('/transactions', <Gift className="w-4 h-4" />, 'Lend & Borrow')}

          {/* Money Management group */}
          <div className="pt-1">
            <button
              onClick={() => setMoneyOpen(!moneyOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              <span className="flex items-center gap-3">
                <Target className="w-4 h-4" />
                Money Goals
              </span>
              {moneyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {moneyOpen && (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-3">
                {navLink('/budgets', <Target className="w-4 h-4" />, 'Budgets')}
                {navLink('/savings', <PiggyBank className="w-4 h-4" />, 'Savings Goals')}
                {navLink('/recurring', <RefreshCw className="w-4 h-4" />, 'Recurring')}
              </div>
            )}
          </div>

          {/* Analytics group */}
          <div className="pt-0.5">
            <button
              onClick={() => setAnalyticsOpen(!analyticsOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              <span className="flex items-center gap-3">
                <BarChart2 className="w-4 h-4" />
                Analytics
              </span>
              {analyticsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {analyticsOpen && (
              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-3">
                {navLink('/monthly', <Calendar className="w-4 h-4" />, 'Monthly View')}
                {navLink('/analytics', <BarChart2 className="w-4 h-4" />, 'Full Analytics')}
              </div>
            )}
          </div>

          {navLink('/settings', <Settings className="w-4 h-4" />, 'Settings')}

          {isSuperAdmin && (
            <>
              <div className="pt-2 pb-1">
                <p className="px-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Admin</p>
              </div>
              {navLink('/admin/requests', <Users className="w-4 h-4" />, 'Requests')}
            </>
          )}
        </div>

        <div className="p-3 border-t border-border space-y-3">
          {/* Remaining Balance */}
          <div className={`rounded-xl p-3 ${isDeficit ? 'bg-red-500/10 border border-red-500/20' : percentage >= 80 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
            <p className="text-[10px] text-muted-foreground mb-1">
              {isDeficit ? 'Deficit this month' : 'Remaining Balance'}
            </p>
            <div className="flex items-end justify-between">
              <span className={`font-mono font-bold text-base ${isDeficit ? 'text-red-500' : percentage >= 80 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {isDeficit ? '-' : ''}{currency} {Math.abs(remaining).toLocaleString()}
              </span>
            </div>
            {monthlyIncome > 0 && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${isDeficit ? 'bg-red-500 w-full' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={!isDeficit ? { width: `${percentage}%` } : {}}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {currency} {monthlyExpenses.toLocaleString()} spent · {percentage}% of income
                </p>
              </>
            )}
            {monthlyIncome === 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                <a href="/income" className="underline">Add income</a> to track balance
              </p>
            )}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 h-auto">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {user?.displayName?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user?.displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-60px)] md:h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-2 z-50 pb-safe overflow-x-auto">
        <Link href="/" className={`flex flex-col items-center gap-0.5 p-2 rounded-lg whitespace-nowrap ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px]">Home</span>
        </Link>
        <Link href="/add" className={`flex flex-col items-center gap-0.5 p-2 rounded-lg whitespace-nowrap ${isActive('/add') ? 'text-primary' : 'text-muted-foreground'}`}>
          <PlusCircle className="w-5 h-5" />
          <span className="text-[9px]">Add</span>
        </Link>
        <Link href="/income" className={`flex flex-col items-center gap-0.5 p-2 rounded-lg whitespace-nowrap ${isActive('/income') ? 'text-primary' : 'text-muted-foreground'}`}>
          <TrendingUp className="w-5 h-5" />
          <span className="text-[9px]">Income</span>
        </Link>
        <Link href="/savings" className={`flex flex-col items-center gap-0.5 p-2 rounded-lg whitespace-nowrap ${isActive('/savings') ? 'text-primary' : 'text-muted-foreground'}`}>
          <PiggyBank className="w-5 h-5" />
          <span className="text-[9px]">Savings</span>
        </Link>
        <Link href="/analytics" className={`flex flex-col items-center gap-0.5 p-2 rounded-lg whitespace-nowrap ${isActive('/analytics') ? 'text-primary' : 'text-muted-foreground'}`}>
          <BarChart2 className="w-5 h-5" />
          <span className="text-[9px]">Analytics</span>
        </Link>
      </div>
    </div>
  );
}
