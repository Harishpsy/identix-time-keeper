import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, Gift } from "lucide-react";

interface BirthdayEmployee {
  id: string;
  fullName: string;
  dateOfBirth: string;
  daysUntil: number;
  ageNext: number;
}

export default function UpcomingBirthdays() {
  const [employees, setEmployees] = useState<BirthdayEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const { data } = await apiClient.get("/dashboard/birthdays");
        setEmployees(data || []);
      } catch (err) {
        console.error("Failed to fetch birthdays", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  const getBirthdayDate = (dateOfBirth: string) => {
    const d = new Date(dateOfBirth);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          Upcoming Birthdays
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No upcoming birthdays
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
                       Turning {emp.ageNext} · {getBirthdayDate(emp.dateOfBirth)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={emp.daysUntil === 0 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {emp.daysUntil === 0 ? "🎂 Today!" : `${emp.daysUntil}d away`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
