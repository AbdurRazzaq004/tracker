import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import AddExpense from "@/pages/AddExpense";
import History from "@/pages/History";
import MonthlyAnalytics from "@/pages/MonthlyAnalytics";
import Transactions from "@/pages/Transactions";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminRequests from "@/pages/AdminRequests";
import Income from "@/pages/Income";
import Budgets from "@/pages/Budgets";
import SavingsGoals from "@/pages/SavingsGoals";
import Recurring from "@/pages/Recurring";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import { SettingsProvider } from "@/context/SettingsContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { TransactionProvider } from "@/context/TransactionContext";
import { IncomeProvider } from "@/context/IncomeContext";
import { BudgetProvider } from "@/context/BudgetContext";
import { SavingsProvider } from "@/context/SavingsContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!isSuperAdmin) return <Redirect to="/" />;
  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login"><PublicRoute component={Login} /></Route>
      <Route path="/register"><PublicRoute component={Register} /></Route>

      <Route path="/"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/add"><ProtectedRoute component={AddExpense} /></Route>
      <Route path="/history"><ProtectedRoute component={History} /></Route>
      <Route path="/monthly"><ProtectedRoute component={MonthlyAnalytics} /></Route>
      <Route path="/transactions"><ProtectedRoute component={Transactions} /></Route>
      <Route path="/income"><ProtectedRoute component={Income} /></Route>
      <Route path="/budgets"><ProtectedRoute component={Budgets} /></Route>
      <Route path="/savings"><ProtectedRoute component={SavingsGoals} /></Route>
      <Route path="/recurring"><ProtectedRoute component={Recurring} /></Route>
      <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>

      <Route path="/admin/requests"><AdminRoute component={AdminRequests} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SettingsProvider>
            <ExpenseProvider>
              <IncomeProvider>
                <BudgetProvider>
                  <SavingsProvider>
                    <TransactionProvider>
                      <Toaster />
                      <Router />
                    </TransactionProvider>
                  </SavingsProvider>
                </BudgetProvider>
              </IncomeProvider>
            </ExpenseProvider>
          </SettingsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
