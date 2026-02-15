import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Check, X, CalendarDays, Settings, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const leaveColorMap: Record<string, string> = {
  sick: "text-destructive",
  casual: "text-warning",
  annual: "text-primary",
};

function DebouncedNumberInput({ value, onSave }: { value: number; onSave: (val: number) => void }) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setLocal(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(val), 800);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <Input type="number" min={0} className="w-20 h-8 text-sm" value={local} onChange={handleChange} />
  );
}

export default function LeaveRequests() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [leaveSettings, setLeaveSettings] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), to_date: format(new Date(), "yyyy-MM-dd"), type: "" as string, reason: "", submitted_to: "", permission_hours: "" });

  const fetchLeaveSettings = async () => {
    const { data } = await supabase.from("leave_settings").select("*").order("leave_type");
    setLeaveSettings(data || []);
  };

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
    setLoading(true);
    let query = supabase
      .from("leave_requests")
      .select("*, profiles!leave_requests_user_id_fkey(full_name), approver:profiles!leave_requests_submitted_to_fkey(full_name)")
      .order("created_at", { ascending: false });

    if (role === "employee") {
      query = query.eq("user_id", user?.id);
    } else if (role === "subadmin") {
      query = query.eq("submitted_to", user?.id);
    }

    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  };

  const fetchLeaveBalance = async () => {
    if (!user) return;
    const currentYear = new Date().getFullYear();
    const { data } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("user_id", user.id)
      .eq("year", currentYear)
      .maybeSingle();
    setLeaveBalance(data);
  };

  useEffect(() => {
    fetchLeaveSettings();
    fetchRequests();
    fetchApprovers();
    fetchLeaveBalance();
  }, [user, role]);

  // Enabled leave types for the apply dialog
  const enabledTypes = leaveSettings.filter((s) => s.is_enabled);
  // All types including permission/other
  const allApplyTypes = [
    ...enabledTypes.map((s) => s.leave_type),
    "permission",
    "other",
  ];

  const handleSubmit = async () => {
    if (!form.date || !form.reason.trim()) { toast.error("Date and reason are required"); return; }
    if (!form.type) { toast.error("Please select a leave type"); return; }
    if (form.type !== "permission" && form.to_date < form.date) { toast.error("To date must be on or after from date"); return; }
    if (form.type === "permission" && (!form.permission_hours || parseFloat(form.permission_hours) <= 0)) { toast.error("Please enter permission duration in hours"); return; }

    if (editingId) {
      const { error } = await supabase.from("leave_requests").update({
        date: form.date,
        to_date: form.type === "permission" ? form.date : form.to_date,
        type: form.type as any,
        reason: form.reason,
        permission_hours: form.type === "permission" ? parseFloat(form.permission_hours) : 0,
        ...(form.submitted_to ? { submitted_to: form.submitted_to } : { submitted_to: null }),
      }).eq("id", editingId).eq("user_id", user?.id).eq("status", "pending");

      if (error) toast.error(error.message);
      else {
        toast.success("Leave request updated");
        closeDialog();
        fetchRequests();
      }
    } else {
      const { error } = await supabase.from("leave_requests").insert({
        user_id: user?.id,
        date: form.date,
        to_date: form.type === "permission" ? form.date : form.to_date,
        type: form.type as any,
        reason: form.reason,
        permission_hours: form.type === "permission" ? parseFloat(form.permission_hours) : 0,
        ...(form.submitted_to ? { submitted_to: form.submitted_to } : {}),
      });

      if (error) toast.error(error.message);
      else {
        toast.success("Leave request submitted");
        closeDialog();
        fetchRequests();
      }
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ date: format(new Date(), "yyyy-MM-dd"), to_date: format(new Date(), "yyyy-MM-dd"), type: "", reason: "", submitted_to: "", permission_hours: "" });
  };

  const openEditDialog = (r: any) => {
    setEditingId(r.id);
    setForm({ date: r.date, to_date: r.to_date || r.date, type: r.type, reason: r.reason || "", submitted_to: r.submitted_to || "", permission_hours: r.permission_hours?.toString() || "" });
    setDialogOpen(true);
  };

  const handleApproval = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("leave_requests")
      .update({ status, approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("id", id);

    if (error) toast.error(error.message);
    else { toast.success(`Request ${status}`); fetchRequests(); fetchLeaveBalance(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", id)
      .eq("user_id", user?.id)
      .eq("status", "pending");

    if (error) toast.error(error.message);
    else { toast.success("Request deleted"); fetchRequests(); }
  };

  const handleSettingUpdate = async (id: string, field: string, value: any) => {
    const { error } = await supabase
      .from("leave_settings")
      .update({ [field]: value })
      .eq("id", id);

    if (error) toast.error(error.message);
    else { toast.success("Setting updated"); fetchLeaveSettings(); }
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

        {/* Admin: Leave Settings */}
        {role === "admin" && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" /> Leave Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {leaveSettings.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                    <div className="space-y-2 flex-1">
                      <p className="font-medium capitalize text-foreground">{s.leave_type} Leave</p>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Days:</Label>
                        <DebouncedNumberInput
                          value={s.total_days}
                          onSave={(val) => handleSettingUpdate(s.id, "total_days", val)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={s.is_enabled}
                        onCheckedChange={(v) => handleSettingUpdate(s.id, "is_enabled", v)}
                      />
                      <span className="text-xs text-muted-foreground">{s.is_enabled ? "Enabled" : "Disabled"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee: Leave Balance Cards */}
        {role === "employee" && enabledTypes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {enabledTypes.map((s) => {
              const usedKey = `${s.leave_type}_used` as string;
              const used = leaveBalance?.[usedKey] ?? 0;
              const total = s.total_days;
              const color = leaveColorMap[s.leave_type] || "text-primary";
              return (
                <Card key={s.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${color}`}>
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground capitalize">{s.leave_type} Leave</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-foreground">{total - used}</span>
                          <span className="text-xs text-muted-foreground">/ {total} remaining</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${used / total > 0.8 ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${total > 0 ? Math.min((used / total) * 100, 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{used} used</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Leave Requests Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {role !== "employee" && <TableHead>Employee</TableHead>}
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Submitted To</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    {(role === "admin" || role === "subadmin") && <TableHead>Actions</TableHead>}
                    {role === "employee" && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={role === "admin" ? 8 : role === "employee" ? 7 : 6} className="text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={role === "admin" ? 8 : role === "employee" ? 7 : 6} className="text-center text-muted-foreground py-8">
                        No leave requests
                      </TableCell>
                    </TableRow>
                  ) : requests.map((r) => (
                    <TableRow key={r.id}>
                      {role !== "employee" && <TableCell className="font-medium">{r.profiles?.full_name || "—"}</TableCell>}
                      <TableCell>{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{r.to_date ? format(new Date(r.to_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="capitalize">{r.type}</TableCell>
                      <TableCell>
                        {r.type === "permission" 
                          ? `${r.permission_hours || 0} hrs` 
                          : r.to_date && r.to_date !== r.date 
                            ? `${Math.ceil((new Date(r.to_date).getTime() - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
                            : "1 day"
                        }
                      </TableCell>
                      <TableCell>{r.approver?.full_name || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={r.reason || ""}>{r.reason || "—"}</TableCell>
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
                      {role === "employee" && (
                        <TableCell>
                          {r.status === "pending" && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(r)}>
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Leave Request</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this pending leave request? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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

        {/* Apply Leave Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Leave Request" : "Apply for Leave"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {allApplyTypes.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.type === "permission" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input type="number" min="0.5" max="8" step="0.5" placeholder="e.g. 2" value={form.permission_hours} onChange={(e) => setForm({ ...form, permission_hours: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input type="date" value={form.to_date} min={form.date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
                  </div>
                </div>
              )}
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
              <Button className="w-full" onClick={handleSubmit}>{editingId ? "Update Request" : "Submit Request"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
