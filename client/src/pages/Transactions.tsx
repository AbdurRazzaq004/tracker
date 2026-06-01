import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useTransactions, type InsertTransaction } from "@/context/TransactionContext";
import { format, parseISO } from "date-fns";
import { Trash2, Edit2, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Transactions() {
  const { transactions, isLoading, currency, createTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InsertTransaction>({
    personName: "",
    amount: 0,
    type: "lent",
    status: "unpaid",
    date: new Date().toISOString().split("T")[0],
    purpose: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.personName.trim() || formData.amount <= 0 || !formData.purpose.trim()) {
      return;
    }

    try {
      if (editingId) {
        await updateTransaction(editingId, formData);
        setEditingId(null);
      } else {
        await createTransaction(formData);
      }
      
      setFormData({
        personName: "",
        amount: 0,
        type: "lent",
        status: "unpaid",
        date: new Date().toISOString().split("T")[0],
        purpose: "",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleEdit = (transaction: any) => {
    setEditingId(transaction._id);
    setFormData({
      personName: transaction.personName,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      purpose: transaction.purpose,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteTransaction(id);
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
    const transaction = transactions.find(t => t._id === id);
    if (transaction) {
      await updateTransaction(id, { ...transaction, status: newStatus });
    }
  };

  // Calculate totals
  const lentTotal = transactions
    .filter(t => t.type === "lent")
    .reduce((sum, t) => sum + t.amount, 0);

  const borrowedTotal = transactions
    .filter(t => t.type === "borrowed")
    .reduce((sum, t) => sum + t.amount, 0);

  const unpaidLent = transactions
    .filter(t => t.type === "lent" && t.status === "unpaid")
    .reduce((sum, t) => sum + t.amount, 0);

  const unpaidBorrowed = transactions
    .filter(t => t.type === "borrowed" && t.status === "unpaid")
    .reduce((sum, t) => sum + t.amount, 0);

  const outstandingBalance = unpaidLent - unpaidBorrowed;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  const lentTransactions = transactions.filter(t => t.type === "lent");
  const borrowedTransactions = transactions.filter(t => t.type === "borrowed");

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Lending & Borrowing</h2>
            <p className="text-muted-foreground">Track money you lent and borrowed.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit" : "New"} Transaction</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData({...formData, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lent">Lent</SelectItem>
                        <SelectItem value="borrowed">Borrowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Person's Name</Label>
                  <Input
                    placeholder="e.g., John Doe"
                    value={formData.personName}
                    onChange={(e) => setFormData({...formData, personName: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    min="1"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Purpose/Notes</Label>
                  <Input
                    placeholder="e.g., Dinner, Loan for car..."
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  {editingId ? "Update" : "Create"} Transaction
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Lent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{currency} {lentTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {lentTransactions.length} transaction{lentTransactions.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{currency} {borrowedTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {borrowedTransactions.length} transaction{borrowedTransactions.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Outstanding (Unpaid)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${outstandingBalance > 0 ? "text-green-600" : outstandingBalance < 0 ? "text-orange-600" : ""}`}>
                {currency} {Math.abs(outstandingBalance).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {outstandingBalance > 0 ? "You are owed" : outstandingBalance < 0 ? "You owe" : "All settled"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${lentTotal > borrowedTotal ? "text-green-600" : lentTotal < borrowedTotal ? "text-red-600" : ""}`}>
                {currency} {(lentTotal - borrowedTotal).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {lentTotal > borrowedTotal ? "Net positive" : lentTotal < borrowedTotal ? "Net negative" : "Balanced"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <div className="space-y-6">
          <Tabs defaultValue="lent" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lent">Lent ({lentTransactions.length})</TabsTrigger>
              <TabsTrigger value="borrowed">Borrowed ({borrowedTransactions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="lent" className="space-y-4">
              {lentTransactions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No lending records yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {lentTransactions.map((trans) => (
                    <Card key={trans._id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">{trans.personName}</h3>
                              <Badge variant={trans.status === "paid" ? "secondary" : "default"}>
                                {trans.status === "paid" ? (
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                )}
                                {trans.status === "paid" ? "Paid" : "Unpaid"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{trans.purpose}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(trans.date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-mono font-bold">{currency} {trans.amount.toLocaleString()}</p>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleStatusToggle(trans._id, trans.status)}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(trans)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                onClick={() => handleDelete(trans._id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="borrowed" className="space-y-4">
              {borrowedTransactions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No borrowing records yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {borrowedTransactions.map((trans) => (
                    <Card key={trans._id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">{trans.personName}</h3>
                              <Badge variant={trans.status === "paid" ? "secondary" : "default"}>
                                {trans.status === "paid" ? (
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                )}
                                {trans.status === "paid" ? "Paid" : "Unpaid"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{trans.purpose}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(trans.date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-mono font-bold">{currency} {trans.amount.toLocaleString()}</p>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleStatusToggle(trans._id, trans.status)}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(trans)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                onClick={() => handleDelete(trans._id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
