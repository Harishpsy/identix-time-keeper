import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Loader2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { API } from "@/lib/endpoints";
import { toast } from "sonner";
import { format, eachDayOfInterval, parseISO } from "date-fns";

export default function ReprocessDialog({ onComplete }: { onComplete?: () => void }) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const handleReprocess = async () => {
    if (fromDate > toDate) {
      toast.error("From date must be before To date");
      return;
    }

    const days = eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) });
    if (days.length > 31) {
      toast.error("Maximum 31 days at a time");
      return;
    }

    setProcessing(true);
    setProgress({ done: 0, total: days.length });
    let successCount = 0;
    let errorCount = 0;

    for (const day of days) {
      const dateStr = format(day, "yyyy-MM-dd");
      try {
        await apiClient.post(API.ATTENDANCE.REPROCESS, { date: dateStr });
        successCount++;
      } catch {
        errorCount++;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setProcessing(false);
    if (errorCount === 0) {
      toast.success(`Reprocessed ${successCount} day(s) successfully`);
    } else {
      toast.warning(`Processed ${successCount} day(s), ${errorCount} failed`);
    }
    setOpen(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Reprocess
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reprocess Daily Summaries</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Recalculate attendance summaries from raw punch data for the selected date range. Manual overrides will be preserved.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>From Date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={processing} />
          </div>
          <div className="space-y-2">
            <Label>To Date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={processing} />
          </div>
        </div>
        {processing && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing {progress.done}/{progress.total} days...
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleReprocess} disabled={processing}>
            {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Reprocess
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
