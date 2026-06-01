import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { UserSettings } from '@shared/schema';

interface SettingsContextType {
  currency: string;
  defaultMonthlyBudget: number;
  settings: UserSettings | null;
  isLoading: boolean;
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: UserSettings = {
  _id: '',
  userId: '',
  currency: 'PKR',
  defaultMonthlyBudget: 30000,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: api.fetchSettings,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const updateSettings = async (data: Partial<UserSettings>) => {
    await updateMutation.mutateAsync(data);
  };

  const effective = settings || DEFAULT_SETTINGS;

  return (
    <SettingsContext.Provider value={{
      currency: effective.currency,
      defaultMonthlyBudget: effective.defaultMonthlyBudget,
      settings: settings || null,
      isLoading,
      updateSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
