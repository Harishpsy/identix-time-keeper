import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Check, X, CalendarDays, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export default function LeaveRequests() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), type: "", reason: "" });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/leaves");
      setRequests(response.data);
    } catch (err) {
      console.error("Failed to fetch leaves", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await apiClient.get("/leaves/balances");
      setLeaveBalance(response.data);
    } catch (err) {
      console.error("Failed to fetch balance", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchBalance();
  }, [user, role]);

  const handleSubmit = async () => {
    if (!form.date || !form.type) { toast.error("Date and type are required"); return; }
    try {
      await apiClient.post("/leaves/apply", form);
      toast.success("Leave request submitted");
      setDialogOpen(false);
      fetchRequests();
    } catch (err) {
      toast.error("Failed to apply leave");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/leaves/${id}/status`, { status });
      toast.success(`Request ${status}`);
      fetchRequests();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leave Requests</h1>
            <p className="text-muted-foreground mt-1">
              {role === "employee" ? "Apply for leave and track your requests" : "Manage employee leave requests"}
            </p>
          </div>
          {role === "employee" && (
            <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Apply Leave</Button>
          )}
        </div>

        {role === "employee" && leaveBalance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["sick", "casual", "annual"].map((type) => {
              const used = leaveBalance[`${type}_used`] || 0;
              const total = leaveBalance[`${type}_total`] || 12;
              return (
                <Card key={type}>
                  <CardContent className="p-4">
                    <p className="capitalize text-sm text-muted-foreground">{type} Leave</p>
                    <p className="text-2xl font-bold">{total - used} / {total}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {role !== "employee" && <TableHead>Employee</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    {(role === "admin" || role === "subadmin") && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : requests.map((r) => (
                    <TableRow key={r.id}>
                      {role !== "employee" && <TableCell>{r.full_name}</TableCell>}
                      <TableCell>{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="capitalize">{r.type}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[r.status]}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      {(role === "admin" || role === "subadmin") && r.status === "pending" && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, "approved")}><Check className="w-4 h-4 text-success" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, "rejected")}><X className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Apply Leave</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <Button className="w-full" onClick={handleSubmit}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
