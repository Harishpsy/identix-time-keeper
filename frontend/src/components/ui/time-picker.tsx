import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
    value: string; // 24-hour format "HH:mm"
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    min?: string;
}

export function TimePicker({ value, onChange, placeholder = "Select time", className, min }: TimePickerProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const hourRef = useRef<HTMLDivElement>(null);
    const minuteRef = useRef<HTMLDivElement>(null);

    // Parse 24h value into display parts
    const parsed = React.useMemo(() => {
        if (!value) return { hour: 12, minute: 0, period: "AM" as "AM" | "PM" };
        const [h, m] = value.split(":").map(Number);
        return {
            hour: h === 0 ? 12 : h > 12 ? h - 12 : h,
            minute: m,
            period: (h >= 12 ? "PM" : "AM") as "AM" | "PM",
        };
    }, [value]);

    // Format display text
    const displayText = React.useMemo(() => {
        if (!value) return "";
        const { hour, minute, period } = parsed;
        return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${period}`;
    }, [value, parsed]);

    // Update input value when value prop changes
    useEffect(() => {
        setInputValue(displayText);
    }, [displayText]);

    // Convert 12h parts to 24h string
    const to24h = (hour: number, minute: number, period: "AM" | "PM") => {
        let h = hour;
        if (period === "AM" && h === 12) h = 0;
        if (period === "PM" && h !== 12) h += 12;
        return `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    };

    const handleHourSelect = (h: number) => {
        const newVal = to24h(h, parsed.minute, parsed.period);
        onChange(newVal);
    };

    const handleMinuteSelect = (m: number) => {
        const newVal = to24h(parsed.hour, m, parsed.period);
        onChange(newVal);
    };

    const handlePeriodToggle = (p: "AM" | "PM") => {
        const newVal = to24h(parsed.hour, parsed.minute, p);
        onChange(newVal);
    };

    // Parse manual text input like "1:30 PM" or "13:30"
    const handleInputBlur = () => {
        const text = inputValue.trim();
        if (!text) return;

        // Try parsing "HH:MM AM/PM" format
        const ampmMatch = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (ampmMatch) {
            let h = parseInt(ampmMatch[1]);
            const m = parseInt(ampmMatch[2]);
            const p = ampmMatch[3].toUpperCase() as "AM" | "PM";
            if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
                onChange(to24h(h, m, p));
                return;
            }
        }

        // Try parsing "HH:MM" 24-hour format
        const h24Match = text.match(/^(\d{1,2}):(\d{2})$/);
        if (h24Match) {
            const h = parseInt(h24Match[1]);
            const m = parseInt(h24Match[2]);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                onChange(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
                return;
            }
        }

        // Invalid, revert
        setInputValue(displayText);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleInputBlur();
            setOpen(false);
        }
    };

    // Scroll to selected values when popover opens
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                const hourEl = hourRef.current?.querySelector("[data-selected=true]");
                const minEl = minuteRef.current?.querySelector("[data-selected=true]");
                hourEl?.scrollIntoView({ block: "center", behavior: "instant" });
                minEl?.scrollIntoView({ block: "center", behavior: "instant" });
            }, 50);
        }
    }, [open]);

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal h-10",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    {value ? displayText : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                {/* Manual input */}
                <div className="p-3 border-b">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                        placeholder="e.g. 01:30 PM"
                        className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div className="flex">
                    {/* Hours */}
                    <div className="flex-1 border-r">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center border-b">Hour</div>
                        <div
                            className="h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                            ref={hourRef}
                            onWheel={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <div className="p-1">
                                {hours.map((h) => (
                                    <button
                                        key={h}
                                        type="button"
                                        data-selected={parsed.hour === h}
                                        onClick={() => handleHourSelect(h)}
                                        className={cn(
                                            "w-full px-3 py-1.5 text-sm rounded-md text-center transition-colors",
                                            parsed.hour === h
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        {h.toString().padStart(2, "0")}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Minutes */}
                    <div className="flex-1 border-r">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center border-b">Min</div>
                        <div
                            className="h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                            ref={minuteRef}
                            onWheel={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <div className="p-1">
                                {minutes.map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        data-selected={parsed.minute === m}
                                        onClick={() => handleMinuteSelect(m)}
                                        className={cn(
                                            "w-full px-3 py-1.5 text-sm rounded-md text-center transition-colors",
                                            parsed.minute === m
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        {m.toString().padStart(2, "0")}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AM/PM */}
                    <div className="w-16">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center border-b">&nbsp;</div>
                        <div className="p-1 space-y-1 mt-1">
                            {(["AM", "PM"] as const).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => handlePeriodToggle(p)}
                                    className={cn(
                                        "w-full px-3 py-2 text-sm rounded-md text-center font-medium transition-colors",
                                        parsed.period === p
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
