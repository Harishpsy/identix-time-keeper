import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, date_of_joining")
        .eq("is_active", true)
        .not("date_of_joining", "is", null);

      if (!profiles) {
        setLoading(false);
        return;
      }

      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const todayYear = today.getFullYear();

      const upcoming: AnniversaryEmployee[] = profiles
        .map((p) => {
          const [joinYear, joinMonth, joinDay] = p.date_of_joining!.split("-").map(Number);
          const yearsCompleting = todayYear - joinYear;

          // Skip if they haven't completed at least 1 year yet
          if (yearsCompleting < 1) {
            // Check if they'll complete 1 year this year
            const willComplete1 = todayYear - joinYear === 0 ? false : true;
            if (!willComplete1) return null;
          }

          // Calculate days until anniversary this year
          const anniversaryThisYear = new Date(todayYear, joinMonth - 1, joinDay);
          let diffMs = anniversaryThisYear.getTime() - new Date(todayYear, todayMonth - 1, todayDay).getTime();

          // If anniversary already passed this year, calculate for next year
          if (diffMs < 0) {
            const anniversaryNextYear = new Date(todayYear + 1, joinMonth - 1, joinDay);
            diffMs = anniversaryNextYear.getTime() - new Date(todayYear, todayMonth - 1, todayDay).getTime();
            return {
              id: p.id,
              fullName: p.full_name,
              dateOfJoining: p.date_of_joining!,
              daysUntil: Math.round(diffMs / (1000 * 60 * 60 * 24)),
              yearsCompleting: yearsCompleting + 1,
            };
          }

          return {
            id: p.id,
            fullName: p.full_name,
            dateOfJoining: p.date_of_joining!,
            daysUntil: Math.round(diffMs / (1000 * 60 * 60 * 24)),
            yearsCompleting,
          };
        })
        .filter((e): e is AnniversaryEmployee => e !== null && e.yearsCompleting >= 1)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);

      setEmployees(upcoming);
      setLoading(false);
    };

    fetchAnniversaries();
  }, []);

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const getAnniversaryDate = (dateOfJoining: string, daysUntil: number) => {
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
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  emp.daysUntil === 0
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted/40 hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    emp.daysUntil === 0 ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <Cake className={`w-4 h-4 ${emp.daysUntil === 0 ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{emp.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {ordinal(emp.yearsCompleting)} anniversary · {getAnniversaryDate(emp.dateOfJoining, emp.daysUntil)}
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
