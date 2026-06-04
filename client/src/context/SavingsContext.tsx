import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { SavingsGoal, InsertSavingsGoal, SavingsContribution } from '@shared/schema';
import { useAuth } from './AuthContext';

interface SavingsContextType {
  goals: SavingsGoal[];
  isLoading: boolean;
  createGoal: (goal: InsertSavingsGoal) => Promise<void>;
  updateGoal: (id: string, updates: Partial<InsertSavingsGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  contribute: (goalId: string, amount: number, note: string, date: string) => Promise<void>;
  removeContribution: (goalId: string, contributionId: string) => Promise<void>;
  fetchContributions: (goalId: string) => Promise<SavingsContribution[]>;
  totalSaved: number;
  totalTarget: number;
  overallProgress: number;
}

const SavingsContext = createContext<SavingsContextType | undefined>(undefined);

export function SavingsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['savings'],
    queryFn: api.fetchSavingsGoals,
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: api.createSavingsGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertSavingsGoal> }) =>
      api.updateSavingsGoal(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteSavingsGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings'] }),
  });

  const contributeMutation = useMutation({
    mutationFn: ({ goalId, amount, note, date }: { goalId: string; amount: number; note: string; date: string }) =>
      api.addContribution(goalId, { amount, note, date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings'] }),
  });

  const deleteContributionMutation = useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) =>
      api.deleteContribution(goalId, contributionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings'] }),
  });

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <SavingsContext.Provider value={{
      goals,
      isLoading,
      createGoal: (goal) => createMutation.mutateAsync(goal),
      updateGoal: (id, updates) => updateMutation.mutateAsync({ id, updates }),
      deleteGoal: (id) => deleteMutation.mutateAsync(id),
      contribute: (goalId, amount, note, date) =>
        contributeMutation.mutateAsync({ goalId, amount, note, date }),
      removeContribution: (goalId, contributionId) =>
        deleteContributionMutation.mutateAsync({ goalId, contributionId }),
      fetchContributions: (goalId) => api.fetchContributions(goalId),
      totalSaved,
      totalTarget,
      overallProgress,
    }}>
      {children}
    </SavingsContext.Provider>
  );
}

export function useSavings() {
  const context = useContext(SavingsContext);
  if (!context) throw new Error('useSavings must be used within SavingsProvider');
  return context;
}
