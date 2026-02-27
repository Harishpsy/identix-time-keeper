import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Check, X, CalendarDays, Loader2, Settings, Info } from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker";
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
  const [allBalances, setAllBalances] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [form, setForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), type: "", reason: "", start_time: "", end_time: "" });


  // Settings state
  const [leavesEnabled, setLeavesEnabled] = useState(true);
  const [sickEnabled, setSickEnabled] = useState(true);
  const [casualEnabled, setCasualEnabled] = useState(true);
  const [annualEnabled, setAnnualEnabled] = useState(true);
  const [permissionEnabled, setPermissionEnabled] = useState(true);

  const [defaultSick, setDefaultSick] = useState(12);
  const [defaultCasual, setDefaultCasual] = useState(12);
  const [defaultAnnual, setDefaultAnnual] = useState(15);
  const [defaultPermission, setDefaultPermission] = useState(0);

  const [savingSettings, setSavingSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const fetchAllBalances = async () => {
    if (role === "super_admin" || role === "admin" || role === "subadmin") {
      setLoadingBalances(true);
      try {
        const response = await apiClient.get("/leaves/balances/all");
        setAllBalances(response.data);
      } catch (err) {
        console.error("Failed to fetch all balances", err);
      } finally {
        setLoadingBalances(false);
      }
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await apiClient.get("/settings");
      if (data) {
        setLeavesEnabled(data.leaves_enabled ?? true);
        setSickEnabled(data.sick_leave_enabled ?? true);
        setCasualEnabled(data.casual_leave_enabled ?? true);
        setAnnualEnabled(data.annual_leave_enabled ?? true);
        setPermissionEnabled(data.permission_leave_enabled ?? true);

        setDefaultSick(data.default_sick_leaves ?? 12);
        setDefaultCasual(data.default_casual_leaves ?? 12);
        setDefaultAnnual(data.default_annual_leaves ?? 15);
        setDefaultPermission(data.default_permission_leaves ?? 0);
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchBalance();
    fetchAllBalances();
    fetchSettings();
  }, [user, role]);

  const handleSubmit = async () => {
    if (!form.date || !form.type) { toast.error("Date and type are required"); return; }
    if (form.type === "permission" && (!form.start_time || !form.end_time)) {
      toast.error("Start and end times are required for permission");
      return;
    }
    if (form.type === "permission" && form.start_time && form.end_time && form.end_time <= form.start_time) {
      toast.error("End time must be after start time");
      return;
    }
    try {
      await apiClient.post("/leaves/apply", form);
      toast.success("Leave request submitted");
      setDialogOpen(false);
      setForm({ ...form, type: "", reason: "", start_time: "", end_time: "" });
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
      fetchAllBalances();
      fetchBalance(); // Also refresh current user balance
    } catch (err) {
      toast.error("Failed to update status");
    }
  };



  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await apiClient.patch("/settings", {
        leaves_enabled: leavesEnabled,
        sick_leave_enabled: sickEnabled,
        casual_leave_enabled: casualEnabled,
        annual_leave_enabled: annualEnabled,
        permission_leave_enabled: permissionEnabled,
        default_sick_leaves: defaultSick,
        default_casual_leaves: defaultCasual,
        default_annual_leaves: defaultAnnual,
        default_permission_leaves: defaultPermission,
      });
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSyncBalances = async () => {
    if (!confirm("Are you sure you want to apply these default leave totals to ALL active employees for the current year? This will override their current total allocations.")) return;

    setSyncing(true);
    try {
      await apiClient.post("/leaves/balances/sync");
      toast.success("Leave balances synchronized for all employees");
      fetchAllBalances();
    } catch (err: any) {
      toast.error("Sync failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const leaveTypes = [
    { id: "sick", label: "Sick", enabled: sickEnabled },
    { id: "casual", label: "Casual", enabled: casualEnabled },
    { id: "annual", label: "Annual", enabled: annualEnabled },
    { id: "permission", label: "Permission", enabled: permissionEnabled },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Management</h1>
          <p className="text-muted-foreground mt-1">
            {role === "employee" ? "Apply for leave and track your requests" : "Manage leave requests, balances and settings"}
          </p>
        </div>
        {(role === "employee" || role === "admin" || role === "subadmin") && (
          <Button onClick={() => setDialogOpen(true)} data-tour="apply-leave"><Plus className="w-4 h-4 mr-2" />Apply Leave</Button>
        )}
      </div>

      {role === "employee" && leaveBalance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" data-tour="leave-stats">
          {leaveTypes.filter(t => Boolean(t.enabled)).map((type) => {
            const used = leaveBalance[`${type.id}_used`] || 0;
            const total = leaveBalance[`${type.id}_total`] || 0;
            return (
              <Card key={type.id}>
                <CardContent className="p-4">
                  <p className="capitalize text-sm text-muted-foreground">{type.label} Leave</p>
                  <p className="text-2xl font-bold">
                    {total - used} / {total} {type.id === "permission" ? "HRS" : "Days"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="requests" className="w-full">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          {(role === "super_admin" || role === "admin" || role === "subadmin") && (
            <TabsTrigger value="balances">Employee Balances</TabsTrigger>
          )}
          {(role === "super_admin" || role === "admin") && (
            <TabsTrigger value="settings">Settings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card className="border-border/50" data-tour="leave-table">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {role !== "employee" && <TableHead>Employee</TableHead>}
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Time (If Permission)</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approved By</TableHead>
                      {(role === "super_admin" || role === "admin" || role === "subadmin") && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                    ) : requests.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leave requests found</TableCell></TableRow>
                    ) : requests.map((r) => (
                      <TableRow key={r.id}>
                        {role !== "employee" && <TableCell>{r.full_name}</TableCell>}
                        <TableCell>{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="capitalize">{r.type}</TableCell>
                        <TableCell>
                          {r.type === "permission" && r.start_time && r.end_time ? (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {r.start_time.substring(0, 5)} - {r.end_time.substring(0, 5)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[r.status]}`}>
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {r.processed_by_name ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{r.processed_by_name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{r.processed_by_role}</span>
                              {r.processed_at && <span className="text-[10px] text-muted-foreground">{format(new Date(r.processed_at), "dd MMM HH:mm")}</span>}
                            </div>
                          ) : r.status !== "pending" ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Pending</span>
                          )}
                        </TableCell>
                        {(role === "super_admin" || role === "admin" || role === "subadmin") && (
                          <TableCell>
                            {r.status === "pending" ? (
                              (() => {
                                const roleHierarchy: Record<string, number> = { super_admin: 4, admin: 3, subadmin: 2, employee: 1 };
                                const canApprove = roleHierarchy[role || ""] > roleHierarchy[r.requester_role || "employee"] && r.user_id !== user?.id;

                                if (!canApprove) return "-";

                                return (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, "approved")}><Check className="w-4 h-4 text-success" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, "rejected")}><X className="w-4 h-4 text-destructive" /></Button>
                                  </div>
                                );
                              })()
                            ) : "—"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {(role === "super_admin" || role === "admin" || role === "subadmin") && (
          <TabsContent value="balances" className="mt-4">
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Year</TableHead>
                        {Boolean(sickEnabled) && <TableHead>Sick</TableHead>}
                        {Boolean(casualEnabled) && <TableHead>Casual</TableHead>}
                        {Boolean(annualEnabled) && <TableHead>Annual</TableHead>}
                        {Boolean(permissionEnabled) && <TableHead>Permission</TableHead>}

                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingBalances ? (
                        <TableRow><TableCell colSpan={3 + [sickEnabled, casualEnabled, annualEnabled, permissionEnabled].filter(Boolean).length} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                      ) : allBalances.length === 0 ? (
                        <TableRow><TableCell colSpan={3 + [sickEnabled, casualEnabled, annualEnabled, permissionEnabled].filter(Boolean).length} className="text-center py-8 text-muted-foreground">No balances found</TableCell></TableRow>
                      ) : allBalances.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.full_name}</TableCell>
                          <TableCell>{b.year}</TableCell>
                          {Boolean(sickEnabled) && (
                            <TableCell>
                              {`${b.sick_total - b.sick_used} / ${b.sick_total} Days`}
                            </TableCell>
                          )}
                          {Boolean(casualEnabled) && (
                            <TableCell>
                              {`${b.casual_total - b.casual_used} / ${b.casual_total} Days`}
                            </TableCell>
                          )}
                          {Boolean(annualEnabled) && (
                            <TableCell>
                              {`${b.annual_total - b.annual_used} / ${b.annual_total} Days`}
                            </TableCell>
                          )}
                          {Boolean(permissionEnabled) && (
                            <TableCell>
                              {`${b.permission_total - b.permission_used} / ${b.permission_total} HRS`}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {(role === "super_admin" || role === "admin") && (
          <TabsContent value="settings" className="mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Visibility Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Global Leave Module</Label>
                      <p className="text-xs text-muted-foreground">Toggle visibility of the whole module</p>
                    </div>
                    <Switch checked={leavesEnabled} onCheckedChange={setLeavesEnabled} />
                  </div>
                  <div className="pt-2 border-t space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Info className="w-3 h-3" /> Individual Leave Type Visibility
                    </p>
                    <div className="flex items-center justify-between space-x-2">
                      <Label className="text-sm">Sick Leave</Label>
                      <Switch checked={sickEnabled} onCheckedChange={setSickEnabled} />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label className="text-sm">Casual Leave</Label>
                      <Switch checked={casualEnabled} onCheckedChange={setCasualEnabled} />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label className="text-sm">Annual Leave</Label>
                      <Switch checked={annualEnabled} onCheckedChange={setAnnualEnabled} />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label className="text-sm">Permission Leave</Label>
                      <Switch checked={permissionEnabled} onCheckedChange={setPermissionEnabled} />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                  >
                    {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save General Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" /> Default Leave Allocations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Sick</Label>
                      <Input
                        type="number"
                        value={defaultSick}
                        onChange={(e) => setDefaultSick(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Casual</Label>
                      <Input
                        type="number"
                        value={defaultCasual}
                        onChange={(e) => setDefaultCasual(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Annual</Label>
                      <Input
                        type="number"
                        value={defaultAnnual}
                        onChange={(e) => setDefaultAnnual(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Permission</Label>
                      <Input
                        type="number"
                        value={defaultPermission}
                        onChange={(e) => setDefaultPermission(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t">
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                    >
                      {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Update Default Allocations
                    </Button>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={handleSyncBalances}
                      disabled={syncing}
                    >
                      {syncing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Apply Defaults to All Employees
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply Leave</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.filter(t => t.enabled).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            {form.type === "permission" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <TimePicker
                    value={form.start_time}
                    onChange={(v) => setForm({ ...form, start_time: v })}
                    placeholder="Pick start time"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <TimePicker
                    value={form.end_time}
                    onChange={(v) => setForm({ ...form, end_time: v })}
                    placeholder="Pick end time"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleSubmit}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
