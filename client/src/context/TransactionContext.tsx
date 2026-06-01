import { createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "./SettingsContext";

export type Transaction = {
  _id: string;
  personName: string;
  amount: number;
  type: "lent" | "borrowed";
  status: "paid" | "unpaid";
  date: string;
  purpose: string;
  createdAt: string;
  userId: string;
};

export type InsertTransaction = Omit<Transaction, "_id" | "createdAt" | "userId">;

interface TransactionContextType {
  transactions: Transaction[];
  isLoading: boolean;
  currency: string;
  createTransaction: (transaction: InsertTransaction) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<InsertTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currency } = useSettings();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json() as Promise<Transaction[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (transaction: InsertTransaction) => {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(transaction),
      });
      if (!response.ok) throw new Error("Failed to create transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Success", description: "Transaction created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create transaction", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertTransaction> }) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Success", description: "Transaction updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update transaction", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete transaction");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Success", description: "Transaction deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete transaction", variant: "destructive" });
    },
  });

  return (
    <TransactionContext.Provider value={{
      transactions,
      isLoading,
      currency,
      createTransaction: (transaction) => createMutation.mutateAsync(transaction),
      updateTransaction: (id, updates) => updateMutation.mutateAsync({ id, updates }),
      deleteTransaction: (id) => deleteMutation.mutateAsync(id),
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) throw new Error("useTransactions must be used within TransactionProvider");
  return context;
}
