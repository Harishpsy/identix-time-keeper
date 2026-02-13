import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Departments() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [empCounts, setEmpCounts] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchDepartments = async () => {
    const [{ data: deps }, { data: profiles }] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("profiles").select("department_id").not("department_id", "is", null),
    ]);
    setDepartments(deps || []);
    const counts: Record<string, number> = {};
    profiles?.forEach((p: any) => { counts[p.department_id] = (counts[p.department_id] || 0) + 1; });
    setEmpCounts(counts);
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Department name is required"); return; }

    if (editing) {
      const { error } = await supabase.from("departments").update({ name: name.trim() }).eq("id", editing.id);
      if (error) toast.error(error.message);
      else { toast.success("Department updated"); setDialogOpen(false); setEditing(null); fetchDepartments(); }
    } else {
      const { error } = await supabase.from("departments").insert({ name: name.trim() });
      if (error) toast.error(error.message);
      else { toast.success("Department created"); setDialogOpen(false); fetchDepartments(); }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("departments").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Department deleted"); fetchDepartments(); }
    setDeleteTarget(null);
  };

  const openEdit = (dept: any) => {
    setEditing(dept);
    setName(dept.name);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Department Management</h1>
            <p className="text-muted-foreground mt-1">Create and manage departments</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Department</Button>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead>Department Name</TableHead>
                  <TableHead className="w-40">Employees</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No departments configured</TableCell></TableRow>
                ) : departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Users className="w-3 h-3" />
                        {empCounts[d.id] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(d)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
              <DialogTitle>{editing ? "Edit Department" : "Add Department"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Department Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering" />
              </div>
              <Button className="w-full" onClick={handleSave}>{editing ? "Update" : "Create"} Department</Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Department</AlertDialogTitle>
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
    </DashboardLayout>
  );
}
