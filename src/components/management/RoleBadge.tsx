import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
    role: string;
}

export const RoleBadge = ({ role }: RoleBadgeProps) => {
    const config = {
        super_admin: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Super Admin" },
        admin: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Admin" },
        subadmin: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Manager" },
        employee: { color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", label: "Employee" },
    };

    const { color, label } = config[role as keyof typeof config] || config.employee;

    return (
        <Badge variant="outline" className={cn("text-xs font-medium border-0", color)}>
            {label}
        </Badge>
    );
};
