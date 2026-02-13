import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const leaveTypes = ["sick", "casual", "annual", "permission", "other"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export default function LeaveRequests() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), type: "casual" as string, reason: "", submitted_to: "" });

  const fetchApprovers = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "subadmin"]);
    if (!data) return;
    const ids = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids)
      .eq("is_active", true);
    setApprovers(profiles || []);
  };

  const fetchRequests = async () => {
    let query = supabase
      .from("leave_requests")
      .select("*, profiles!leave_requests_user_id_fkey(full_name), approver:profiles!leave_requests_submitted_to_fkey(full_name)")
      .order("created_at", { ascending: false });

    if (role === "employee") {
      query = query.eq("user_id", user?.id);
    } else {
      // Admins see all; subadmins see requests submitted to them
      if (role === "subadmin") {
        query = query.eq("submitted_to", user?.id);
      }
    }

    const { data } = await query;
    setRequests(data || []);
  };

  useEffect(() => { fetchRequests(); fetchApprovers(); }, [user, role]);

  const handleSubmit = async () => {
    if (!form.date || !form.reason.trim()) { toast.error("Date and reason are required"); return; }
    if (!form.submitted_to) { toast.error("Please select who to submit to"); return; }

    const { error } = await supabase.from("leave_requests").insert({
      user_id: user?.id,
      date: form.date,
      type: form.type as any,
      reason: form.reason,
      submitted_to: form.submitted_to,
    });

    if (error) toast.error(error.message);
    else { toast.success("Leave request submitted"); setDialogOpen(false); setForm({ date: format(new Date(), "yyyy-MM-dd"), type: "casual", reason: "", submitted_to: "" }); fetchRequests(); }
  };

  const handleApproval = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("leave_requests")
      .update({ status, approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("id", id);

    if (error) toast.error(error.message);
    else { toast.success(`Request ${status}`); fetchRequests(); }
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
                    <TableHead>Submitted To</TableHead>
                    <TableHead>Status</TableHead>
                    {(role === "admin" || role === "subadmin") && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={role === "admin" ? 7 : role === "employee" ? 5 : 6} className="text-center text-muted-foreground py-8">
                         No leave requests
                       </TableCell>
                     </TableRow>
                   ) : requests.map((r) => (
                     <TableRow key={r.id}>
                       {role !== "employee" && <TableCell className="font-medium">{r.profiles?.full_name || "—"}</TableCell>}
                       <TableCell>{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                       <TableCell className="capitalize">{r.type}</TableCell>
                       <TableCell className="max-w-48 truncate">{r.reason}</TableCell>
                       <TableCell>{r.approver?.full_name || "—"}</TableCell>
                       <TableCell>
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[r.status]}`}>
                           {r.status}
                         </span>
                       </TableCell>
                       {(role === "admin" || role === "subadmin") && (
                         <TableCell>
                           {r.status === "pending" && (
                             <div className="flex gap-1">
                               <Button variant="ghost" size="sm" onClick={() => handleApproval(r.id, "approved")}>
                                 <Check className="w-4 h-4 text-success" />
                               </Button>
                               <Button variant="ghost" size="sm" onClick={() => handleApproval(r.id, "rejected")}>
                                 <X className="w-4 h-4 text-destructive" />
                               </Button>
                             </div>
                           )}
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
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Submit To</Label>
                <Select value={form.submitted_to} onValueChange={(v) => setForm({ ...form, submitted_to: v })}>
                  <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                  <SelectContent>
                    {approvers.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Explain your leave reason..." />
              </div>
              <Button className="w-full" onClick={handleSubmit}>Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
