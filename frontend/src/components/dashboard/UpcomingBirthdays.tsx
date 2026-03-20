import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { API } from "@/lib/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, Gift, Sparkles } from "lucide-react";

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
        const { data } = await apiClient.get(API.DASHBOARD.BIRTHDAYS);
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
    <Card className="border-border/50 overflow-hidden group/card relative">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary group-hover/card:animate-bounce" />
          Upcoming Birthdays
          <Sparkles className="w-3 h-3 text-yellow-400 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
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
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md ${emp.daysUntil === 0
                  ? "bg-gradient-to-r from-primary/10 to-transparent border border-primary/20"
                  : "bg-muted/40 hover:bg-muted/60"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-500 ${emp.daysUntil === 0 
                    ? "bg-primary/20 scale-110" 
                    : "bg-muted group-hover:rotate-12"
                    }`}>
                    <Cake className={`w-5 h-5 ${emp.daysUntil === 0 
                      ? "text-primary" 
                      : "text-muted-foreground"}`} 
                    />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{emp.fullName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                       Turning <span className="text-primary font-semibold">{emp.ageNext}</span> · {getBirthdayDate(emp.dateOfBirth)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={emp.daysUntil === 0 ? "default" : "secondary"}
                  className="text-xs px-2.5 py-0.5 rounded-full"
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
