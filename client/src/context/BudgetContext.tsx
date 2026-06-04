import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { Budget, InsertBudget, BudgetStatus } from '@shared/schema';
import { useAuth } from './AuthContext';

interface BudgetContextType {
  budgets: Budget[];
  budgetStatuses: BudgetStatus[];
  isLoading: boolean;
  saveBudget: (budget: InsertBudget) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  getBudgetStatus: (categoryName: string) => BudgetStatus | null;
  totalBudget: number;
  totalSpent: number;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: api.fetchBudgets,
    enabled: isAuthenticated,
  });

  const { data: budgetStatuses = [], isLoading: statusLoading } = useQuery({
    queryKey: ['budgets', 'status'],
    queryFn: api.fetchBudgetStatus,
    enabled: isAuthenticated,
  });

  const upsertMutation = useMutation({
    mutationFn: api.upsertBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const getBudgetStatus = (categoryName: string): BudgetStatus | null =>
    budgetStatuses.find(s => s.categoryName === categoryName) || null;

  const totalBudget = budgetStatuses.reduce((sum, s) => sum + s.limit, 0);
  const totalSpent = budgetStatuses.reduce((sum, s) => sum + s.spent, 0);

  return (
    <BudgetContext.Provider value={{
      budgets,
      budgetStatuses,
      isLoading: budgetsLoading || statusLoading,
      saveBudget: (budget) => upsertMutation.mutateAsync(budget),
      removeBudget: (id) => deleteMutation.mutateAsync(id),
      getBudgetStatus,
      totalBudget,
      totalSpent,
    }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) throw new Error('useBudget must be used within BudgetProvider');
  return context;
}
