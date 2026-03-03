import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
}

const variantClasses = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

export default function StatCard({ title, value, icon, trend, variant = "default" }: StatCardProps) {
  return (
    <Card className="border-border/50 animate-fade-in">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1 text-card-foreground">{value}</p>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${variantClasses[variant]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
