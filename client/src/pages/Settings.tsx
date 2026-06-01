import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, DollarSign, User } from "lucide-react";

const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee (PKR)' },
  { code: 'USD', name: 'US Dollar (USD)' },
  { code: 'EUR', name: 'Euro (EUR)' },
  { code: 'GBP', name: 'British Pound (GBP)' },
  { code: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'SAR', name: 'Saudi Riyal (SAR)' },
  { code: 'CAD', name: 'Canadian Dollar (CAD)' },
  { code: 'AUD', name: 'Australian Dollar (AUD)' },
];

export default function Settings() {
  const { currency, defaultMonthlyBudget, updateSettings, isLoading } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [monthlyBudget, setMonthlyBudget] = useState(String(defaultMonthlyBudget));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedCurrency(currency);
    setMonthlyBudget(String(defaultMonthlyBudget));
  }, [currency, defaultMonthlyBudget]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings({
        currency: selectedCurrency,
        defaultMonthlyBudget: Number(monthlyBudget),
      });
      toast({ title: "Settings Saved", description: "Your preferences have been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">

        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-7 h-7" />
            Settings
          </h2>
          <p className="text-muted-foreground">Manage your app preferences and account settings.</p>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Account
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{user?.displayName}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className="text-sm font-medium capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4" />
              Financial Preferences
            </CardTitle>
            <CardDescription>Set your default currency and monthly budget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                All amounts will be displayed in {selectedCurrency}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Default Monthly Budget ({selectedCurrency})</label>
              <Input
                type="number"
                value={monthlyBudget}
                onChange={e => setMonthlyBudget(e.target.value)}
                placeholder="e.g. 30000"
              />
              <p className="text-xs text-muted-foreground">
                Used as the overall monthly spending target in the sidebar. Individual category budgets can be set in the Budgets page.
              </p>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
