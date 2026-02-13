import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Shifts() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", start_time: "09:00", end_time: "18:00", grace_period_mins: 15 });

  const fetchShifts = async () => {
    const { data } = await supabase.from("shifts").select("*").order("name");
    setShifts(data || []);
  };

  useEffect(() => { fetchShifts(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }

    if (editing) {
      const { error } = await supabase.from("shifts").update(form).eq("id", editing.id);
      if (error) toast.error(error.message);
      else { toast.success("Shift updated"); setDialogOpen(false); setEditing(null); fetchShifts(); }
    } else {
      const { error } = await supabase.from("shifts").insert(form);
      if (error) toast.error(error.message);
      else { toast.success("Shift created"); setDialogOpen(false); fetchShifts(); }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("shifts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Shift deleted"); fetchShifts(); }
  };

  const openEdit = (shift: any) => {
    setEditing(shift);
    setForm({ name: shift.name, start_time: shift.start_time, end_time: shift.end_time, grace_period_mins: shift.grace_period_mins });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", start_time: "09:00", end_time: "18:00", grace_period_mins: 15 });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No shifts configured</TableCell></TableRow>
                ) : shifts.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.start_time}</TableCell>
                    <TableCell>{s.end_time}</TableCell>
                    <TableCell>{s.grace_period_mins} mins</TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
              <Button className="w-full" onClick={handleSave}>{editing ? "Update" : "Create"} Shift</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
