import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    description: string;
    icon: LucideIcon;
    children?: ReactNode;
}

export const PageHeader = ({ title, description, icon: Icon, children }: PageHeaderProps) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border">
                <Icon className="w-7 h-7 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                <p className="text-muted-foreground">{description}</p>
            </div>
        </div>
        {children && (
            <div className="flex gap-3">
                {children}
            </div>
        )}
    </div>
);
