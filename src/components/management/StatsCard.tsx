import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: number;
}

export const StatsCard = ({ title, value, icon: Icon, description, trend }: StatsCardProps) => (
    <Card className="relative overflow-hidden">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
            </div>
            {trend !== undefined && (
                <div className="mt-4 flex items-center gap-1 text-xs">
                    <span className={trend > 0 ? "text-green-600" : "text-red-600"}>
                        {trend > 0 ? "+" : ""}{trend}%
                    </span>
                    <span className="text-muted-foreground">vs last month</span>
                </div>
            )}
        </CardContent>
    </Card>
);
