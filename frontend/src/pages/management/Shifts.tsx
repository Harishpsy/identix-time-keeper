import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { API } from "@/lib/endpoints";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Shifts() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", start_time: "09:00", end_time: "18:00", grace_period_mins: 15, total_working_hours: 9, max_break_minutes: 60 });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(API.PROFILES.SHIFTS);
      setShifts(data || []);
    } catch (err) {
      toast.error("Failed to fetch shifts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShifts(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }

    try {
      if (editing) {
        await apiClient.patch(API.PROFILES.SHIFT_BY_ID(editing.id), form);
        toast.success("Shift updated");
      } else {
        await apiClient.post(API.PROFILES.SHIFTS, form);
        toast.success("Shift created");
      }
      setDialogOpen(false);
      setEditing(null);
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save shift");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(API.PROFILES.SHIFT_BY_ID(deleteTarget.id));
      toast.success("Shift deleted");
      fetchShifts();
    } catch (err) {
      toast.error("Failed to delete shift");
    }
    setDeleteTarget(null);
  };

  const openEdit = (shift: any) => {
    setEditing(shift);
    setForm({ name: shift.name, start_time: shift.start_time, end_time: shift.end_time, grace_period_mins: shift.grace_period_mins, total_working_hours: shift.total_working_hours ?? 9, max_break_minutes: shift.max_break_minutes ?? 60 });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", start_time: "09:00", end_time: "18:00", grace_period_mins: 15, total_working_hours: 9, max_break_minutes: 60 });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shift Management</h1>
          <p className="text-muted-foreground mt-1">Configure work shifts and grace periods</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Shift</Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Grace Period</TableHead>
                <TableHead>Working Hours</TableHead>
                <TableHead>Max Break</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : shifts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No shifts configured</TableCell></TableRow>
              ) : shifts.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.start_time}</TableCell>
                  <TableCell>{s.end_time}</TableCell>
                  <TableCell>{s.grace_period_mins} mins</TableCell>
                  <TableCell>{s.total_working_hours ?? 9} hrs</TableCell>
                  <TableCell>{s.max_break_minutes ?? 60} mins</TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Shift" : "Add Shift"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Shift Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning Shift" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grace Period (minutes)</Label>
              <Input type="number" value={form.grace_period_mins} onChange={(e) => setForm({ ...form, grace_period_mins: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Working Hours</Label>
                <Input type="number" step="0.5" value={form.total_working_hours} onChange={(e) => setForm({ ...form, total_working_hours: parseFloat(e.target.value) || 9 })} />
              </div>
              <div className="space-y-2">
                <Label>Max Break (minutes)</Label>
                <Input type="number" value={form.max_break_minutes} onChange={(e) => setForm({ ...form, max_break_minutes: parseInt(e.target.value) || 60 })} />
              </div>
            </div>
            <Button className="w-full" onClick={handleSave}>{editing ? "Update" : "Create"} Shift</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
