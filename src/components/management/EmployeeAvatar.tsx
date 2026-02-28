import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail } from "lucide-react";

interface EmployeeAvatarProps {
    name: string;
    email: string;
    avatar?: string;
}

export const EmployeeAvatar = ({ name, email, avatar }: EmployeeAvatarProps) => {
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-background">
                <AvatarImage src={avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="font-medium text-sm">{name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {email}
                </span>
            </div>
        </div>
    );
};
