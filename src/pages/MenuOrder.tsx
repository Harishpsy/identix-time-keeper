import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { navItems } from "@/lib/navigation";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
    moduleKey: string;
    item: any;
}

function SortableItem({ moduleKey, item }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: moduleKey });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 bg-muted/30 rounded-lg border group transition-colors ${isDragging ? "border-sidebar-primary bg-background shadow-lg opacity-80" : "hover:border-sidebar-primary/50"
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded transition-colors"
            >
                <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="w-8 h-8 rounded bg-background flex items-center justify-center text-sidebar-primary">
                {item.icon}
            </div>
            <div className="flex-1 font-medium text-sm">{item.label}</div>
        </div>
    );
}

export default function MenuOrder() {
    const [orderedModules, setOrderedModules] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get("/settings");
            if (data && data.sidebar_order) {
                try {
                    const savedOrder = JSON.parse(data.sidebar_order);
                    const currentKeys = navItems.map((m) => m.moduleKey);
                    const validatedOrder = [
                        ...savedOrder.filter((key: string) => currentKeys.includes(key)),
                        ...currentKeys.filter((key) => !savedOrder.includes(key)),
                    ];
                    setOrderedModules(validatedOrder);
                } catch (e) {
                    setOrderedModules(navItems.map((m) => m.moduleKey));
                }
            } else {
                setOrderedModules(navItems.map((m) => m.moduleKey));
            }
        } catch (err) {
            toast.error("Failed to fetch settings");
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setOrderedModules((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.patch("/settings", {
                sidebar_order: JSON.stringify(orderedModules),
            });
            toast.success("Sidebar menu order saved");
        } catch (err: any) {
            toast.error("Failed to save: " + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Menu Order</h1>
                    <p className="text-muted-foreground mt-1">
                        Drag and drop rotation modules to customize sidebar navigation for all users
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <GripVertical className="w-4 h-4" /> Sidebar Menu Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={orderedModules}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="grid gap-2">
                                    {orderedModules.map((moduleKey) => {
                                        const item = navItems.find((n) => n.moduleKey === moduleKey);
                                        if (!item) return null;
                                        return (
                                            <SortableItem
                                                key={moduleKey}
                                                moduleKey={moduleKey}
                                                item={item}
                                            />
                                        );
                                    })}
                                </div>
                            </SortableContext>
                        </DndContext>

                        <p className="text-xs text-muted-foreground italic">
                            Drag the handles <GripVertical className="inline w-3 h-3" /> to reorder items. Changes will be applied for all users based on their role permissions.
                        </p>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full"
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Menu Order
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
