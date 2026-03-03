import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface StatusBadgeProps {
    isActive: boolean;
}

export const StatusBadge = ({ isActive }: StatusBadgeProps) => (
    <Badge
        variant={isActive ? "secondary" : "outline"}
        className={cn(
            "gap-1 px-2 py-0.5 text-xs font-medium",
            isActive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800"
        )}
    >
        {isActive ? (
            <>
                <CheckCircle2 className="w-3 h-3" />
                Active
            </>
        ) : (
            <>
                <XCircle className="w-3 h-3" />
                Inactive
            </>
        )}
    </Badge>
);
