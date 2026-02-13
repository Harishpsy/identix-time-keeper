import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  present: { label: "Present", className: "status-present" },
  late: { label: "Late", className: "status-late" },
  absent: { label: "Absent", className: "status-absent" },
  half_day: { label: "Half Day", className: "status-late" },
  on_leave: { label: "On Leave", className: "status-on-leave" },
};

export default function AttendanceStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
