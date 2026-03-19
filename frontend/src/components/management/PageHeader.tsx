import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    description: string;
    icon: LucideIcon;
    children?: ReactNode;
}

export const PageHeader = ({ title, description, icon: Icon, children }: PageHeaderProps) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border shrink-0">
                <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <div>
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
            </div>
        </div>
        {children && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
                {children}
            </div>
        )}
    </div>
);
