import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useSavings } from "@/context/SavingsContext";
import { useSettings } from "@/context/SettingsContext";
import { PiggyBank, Plus, Trash2, Edit2, PlusCircle, ChevronDown, ChevronUp, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SavingsGoal, SavingsContribution } from "@shared/schema";
import { format, parseISO, differenceInDays } from "date-fns";

function GoalCard({
  goal,
  currency,
  onContribute,
  onEdit,
  onDelete,
  onPauseResume,
}: {
  goal: SavingsGoal;
  currency: string;
  onContribute: (goal: SavingsGoal) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (id: string) => void;
  onPauseResume: (goal: SavingsGoal) => void;
}) {
  const [showContributions, setShowContributions] = useState(false);
  const [contributions, setContributions] = useState<SavingsContribution[]>([]);
  const [loadingContribs, setLoadingContribs] = useState(false);
  const { fetchContributions, removeContribution } = useSavings();
  const { toast } = useToast();

  const progress = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const daysLeft = goal.targetDate ? differenceInDays(parseISO(goal.targetDate), new Date()) : null;

  const toggleContributions = async () => {
    if (!showContributions && contributions.length === 0) {
      setLoadingContribs(true);
      const data = await fetchContributions(goal._id);
      setContributions(data);
      setLoadingContribs(false);
    }
    setShowContributions(!showContributions);
  };

  const handleDeleteContrib = async (contributionId: string) => {
    await removeContribution(goal._id, contributionId);
    setContributions(prev => prev.filter(c => c._id !== contributionId));
    toast({ title: "Removed", description: "Contribution removed." });
  };

  return (
    <div className={cn(
      "bg-card border rounded-xl p-5 space-y-4",
      goal.status === 'completed' ? "border-emerald-300 dark:border-emerald-800" :
      goal.status === 'paused' ? "opacity-70" : ""
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-base">{goal.name}</h3>
          {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            goal.status === 'completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
            goal.status === 'paused' ? "bg-secondary text-muted-foreground" :
            "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
          )}>
            {goal.status}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPauseResume(goal)}>
            {goal.status === 'paused' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(goal._id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-mono font-bold">{currency} {goal.currentAmount.toLocaleString()}</span>
          <span className="text-muted-foreground font-mono">/ {currency} {goal.targetAmount.toLocaleString()}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
          <div
            className={cn("h-2.5 rounded-full transition-all duration-700", goal.status === 'completed' ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}% achieved</span>
          <span>{currency} {remaining > 0 ? remaining.toLocaleString() : 0} remaining</span>
        </div>
      </div>

      {goal.targetDate && (
        <p className="text-xs text-muted-foreground">
          Target: {format(parseISO(goal.targetDate), 'MMM dd, yyyy')}
          {daysLeft !== null && daysLeft > 0 && <span className="ml-1 text-primary">({daysLeft} days left)</span>}
          {daysLeft !== null && daysLeft < 0 && <span className="ml-1 text-red-500">(overdue)</span>}
        </p>
      )}

      <div className="flex gap-2">
        {goal.status !== 'completed' && (
          <Button size="sm" className="flex-1" onClick={() => onContribute(goal)}>
            <PlusCircle className="w-4 h-4 mr-1" />
            Add Money
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={toggleContributions} className="flex items-center gap-1">
          History
          {showContributions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {showContributions && (
        <div className="border-t pt-3 space-y-2">
          {loadingContribs ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : contributions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No contributions yet.</p>
          ) : (
            contributions.map(c => (
              <div key={c._id} className="flex items-center justify-between text-sm bg-secondary/30 rounded-lg px-3 py-2">
                <div>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">+{currency} {c.amount.toLocaleString()}</span>
                  {c.note && <span className="text-xs text-muted-foreground ml-2">— {c.note}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{format(parseISO(c.date), 'MMM dd')}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive"
                    onClick={() => handleDeleteContrib(c._id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function SavingsGoals() {
  const { goals, isLoading, createGoal, updateGoal, deleteGoal, contribute, totalSaved, totalTarget, overallProgress } = useSavings();
  const { currency } = useSettings();
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', targetDate: '', description: '' });
  const [contribForm, setContribForm] = useState({ amount: '', note: '' });
  const [isSaving, setIsSaving] = useState(false);

  const activeGoals = goals.filter(g => g.status === 'active');
  const pausedGoals = goals.filter(g => g.status === 'paused');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const handleCreate = async () => {
    if (!goalForm.name || !goalForm.targetAmount) {
      toast({ title: "Error", description: "Name and target amount are required.", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      await createGoal({
        name: goalForm.name,
        targetAmount: Number(goalForm.targetAmount),
        targetDate: goalForm.targetDate || undefined,
        description: goalForm.description || undefined,
        status: 'active',
      });
      toast({ title: "Goal Created", description: `"${goalForm.name}" savings goal created.` });
      setShowCreateDialog(false);
      setGoalForm({ name: '', targetAmount: '', targetDate: '', description: '' });
    } catch {
      toast({ title: "Error", description: "Failed to create goal.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingGoal) return;
    try {
      setIsSaving(true);
      await updateGoal(editingGoal._id, {
        name: goalForm.name,
        targetAmount: Number(goalForm.targetAmount),
        targetDate: goalForm.targetDate || undefined,
        description: goalForm.description || undefined,
      });
      toast({ title: "Updated", description: "Goal updated successfully." });
      setEditingGoal(null);
    } catch {
      toast({ title: "Error", description: "Failed to update goal.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (goal: SavingsGoal) => {
    setGoalForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '',
      description: goal.description || '',
    });
    setEditingGoal(goal);
  };

  const handleContribute = async () => {
    if (!contributingGoal || !contribForm.amount) return;
    try {
      setIsSaving(true);
      await contribute(contributingGoal._id, Number(contribForm.amount), contribForm.note, new Date().toISOString());
      toast({ title: "Added!", description: `${currency} ${contribForm.amount} added to "${contributingGoal.name}".` });
      setContributingGoal(null);
      setContribForm({ amount: '', note: '' });
    } catch {
      toast({ title: "Error", description: "Failed to add contribution.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePauseResume = async (goal: SavingsGoal) => {
    const newStatus = goal.status === 'paused' ? 'active' : 'paused';
    await updateGoal(goal._id, { status: newStatus });
    toast({ title: newStatus === 'paused' ? 'Paused' : 'Resumed', description: `"${goal.name}" is now ${newStatus}.` });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const GoalFormFields = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Goal Name *</label>
        <Input value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Buy a Car, Emergency Fund" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Target Amount ({currency}) *</label>
        <Input type="number" value={goalForm.targetAmount} onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="e.g. 500000" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Target Date (Optional)</label>
        <Input type="date" value={goalForm.targetDate} onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description (Optional)</label>
        <Input value={goalForm.description} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} placeholder="Why are you saving for this?" />
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <PiggyBank className="w-7 h-7 text-primary" />
              Savings Goals
            </h2>
            <p className="text-muted-foreground">Track your financial goals and savings progress.</p>
          </div>
          <Button onClick={() => { setGoalForm({ name: '', targetAmount: '', targetDate: '', description: '' }); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </div>

        {/* Overall Progress */}
        {goals.length > 0 && (
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Overall Savings Progress</h3>
              <span className="text-sm font-bold text-primary">{overallProgress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full bg-primary transition-all duration-700" style={{ width: `${overallProgress}%` }} />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Saved: <span className="font-mono font-semibold text-foreground">{currency} {totalSaved.toLocaleString()}</span></span>
              <span>Target: <span className="font-mono font-semibold text-foreground">{currency} {totalTarget.toLocaleString()}</span></span>
            </div>
          </div>
        )}

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({activeGoals.length})</TabsTrigger>
            <TabsTrigger value="paused">Paused ({pausedGoals.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedGoals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {activeGoals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeGoals.map(goal => (
                  <GoalCard key={goal._id} goal={goal} currency={currency} onContribute={setContributingGoal} onEdit={openEdit} onDelete={deleteGoal} onPauseResume={handlePauseResume} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <PiggyBank className="w-10 h-10 mx-auto mb-3" />
                <p>No active goals. Create your first savings goal!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="paused" className="mt-4">
            {pausedGoals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {pausedGoals.map(goal => (
                  <GoalCard key={goal._id} goal={goal} currency={currency} onContribute={setContributingGoal} onEdit={openEdit} onDelete={deleteGoal} onPauseResume={handlePauseResume} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground"><p>No paused goals.</p></div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedGoals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {completedGoals.map(goal => (
                  <GoalCard key={goal._id} goal={goal} currency={currency} onContribute={setContributingGoal} onEdit={openEdit} onDelete={deleteGoal} onPauseResume={handlePauseResume} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground"><p>No completed goals yet. Keep saving!</p></div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Goal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Savings Goal</DialogTitle></DialogHeader>
          <GoalFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Goal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
          <GoalFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGoal(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={!!contributingGoal} onOpenChange={(open) => !open && setContributingGoal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Money to "{contributingGoal?.name}"</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount ({currency}) *</label>
              <Input
                type="number"
                value={contribForm.amount}
                onChange={e => setContribForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 10000"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Note (Optional)</label>
              <Input
                value={contribForm.note}
                onChange={e => setContribForm(f => ({ ...f, note: e.target.value }))}
                placeholder="e.g. Salary savings"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributingGoal(null)}>Cancel</Button>
            <Button onClick={handleContribute} disabled={isSaving}>{isSaving ? 'Adding...' : 'Add Money'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
