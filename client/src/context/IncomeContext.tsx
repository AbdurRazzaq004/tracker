import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isSameMonth, isSameWeek, isSameYear, parseISO } from 'date-fns';
import * as api from '@/lib/api';
import type { Income, InsertIncome } from '@shared/schema';
import { useSettings } from './SettingsContext';

interface IncomeContextType {
  income: Income[];
  isLoading: boolean;
  currency: string;
  addIncome: (income: InsertIncome) => Promise<void>;
  editIncome: (id: string, updates: Partial<InsertIncome>) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
  getMonthlyIncome: (date?: Date) => number;
  getWeeklyIncome: () => number;
  getYearlyIncome: (year?: number) => number;
  getIncomeBySource: () => Record<string, number>;
  getLast6MonthsData: () => { month: string; income: number }[];
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export function IncomeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { currency } = useSettings();

  const { data: income = [], isLoading } = useQuery({
    queryKey: ['income'],
    queryFn: api.fetchIncome,
  });

  const createMutation = useMutation({
    mutationFn: api.createIncome,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertIncome> }) =>
      api.updateIncome(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteIncome,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income'] }),
  });

  const getMonthlyIncome = (date: Date = new Date()) =>
    income
      .filter(inc => isSameMonth(parseISO(inc.date), date))
      .reduce((sum, inc) => sum + inc.amount, 0);

  const getWeeklyIncome = () => {
    const today = new Date();
    return income
      .filter(inc => isSameWeek(parseISO(inc.date), today))
      .reduce((sum, inc) => sum + inc.amount, 0);
  };

  const getYearlyIncome = (year: number = new Date().getFullYear()) =>
    income
      .filter(inc => parseISO(inc.date).getFullYear() === year)
      .reduce((sum, inc) => sum + inc.amount, 0);

  const getIncomeBySource = () => {
    const result: Record<string, number> = {};
    for (const inc of income) {
      result[inc.source] = (result[inc.source] || 0) + inc.amount;
    }
    return result;
  };

  const getLast6MonthsData = () => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIncome = income
        .filter(inc => {
          const date = parseISO(inc.date);
          return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
        })
        .reduce((sum, inc) => sum + inc.amount, 0);
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        income: monthIncome,
      });
    }
    return months;
  };

  return (
    <IncomeContext.Provider value={{
      income,
      isLoading,
      currency,
      addIncome: (data) => createMutation.mutateAsync(data),
      editIncome: (id, updates) => updateMutation.mutateAsync({ id, updates }),
      removeIncome: (id) => deleteMutation.mutateAsync(id),
      getMonthlyIncome,
      getWeeklyIncome,
      getYearlyIncome,
      getIncomeBySource,
      getLast6MonthsData,
    }}>
      {children}
    </IncomeContext.Provider>
  );
}

export function useIncome() {
  const context = useContext(IncomeContext);
  if (!context) throw new Error('useIncome must be used within IncomeProvider');
  return context;
}
