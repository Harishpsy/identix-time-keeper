import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, CalendarHeart } from "lucide-react";

interface AnniversaryEmployee {
  id: string;
  fullName: string;
  dateOfJoining: string;
  daysUntil: number;
  yearsCompleting: number;
}

export default function UpcomingAnniversaries() {
  const [employees, setEmployees] = useState<AnniversaryEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnniversaries = async () => {
      try {
        const { data } = await apiClient.get("/dashboard/anniversaries");
        setEmployees(data || []);
      } catch (err) {
        console.error("Failed to fetch anniversaries", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnniversaries();
  }, []);

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const getAnniversaryDate = (dateOfJoining: string) => {
    const [, joinMonth, joinDay] = dateOfJoining.split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${joinDay} ${months[joinMonth - 1]}`;
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarHeart className="w-4 h-4 text-primary" />
          Upcoming Work Anniversaries
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No upcoming anniversaries
          </p>
        ) : (
          <div className="space-y-3">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${emp.daysUntil === 0
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted/40 hover:bg-muted/60"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${emp.daysUntil === 0 ? "bg-primary/20" : "bg-muted"
                    }`}>
                    <Cake className={`w-4 h-4 ${emp.daysUntil === 0 ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{emp.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {ordinal(emp.yearsCompleting)} anniversary · {getAnniversaryDate(emp.dateOfJoining)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={emp.daysUntil === 0 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {emp.daysUntil === 0 ? "🎉 Today!" : `${emp.daysUntil}d away`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
