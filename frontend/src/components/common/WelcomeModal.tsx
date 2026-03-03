import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeModalProps {
    userName: string;
    onClose: () => void;
}

// Confetti particle component
function Particle({ style }: { style: React.CSSProperties }) {
    return (
        <div
            className="absolute w-2 h-2 rounded-sm opacity-0"
            style={style}
        />
    );
}

const COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#3b82f6", "#f97316", "#14b8a6",
];

export function WelcomeModal({ userName, onClose }: WelcomeModalProps) {
    const [visible, setVisible] = useState(false);
    const [particles] = useState(() =>
        Array.from({ length: 40 }, (_, i) => ({
            id: i,
            color: COLORS[i % COLORS.length],
            left: `${Math.random() * 100}%`,
            delay: `${Math.random() * 0.8}s`,
            duration: `${1.2 + Math.random() * 1}s`,
            size: `${6 + Math.random() * 8}px`,
        }))
    );

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300);
    };

    return (
        <Dialog open={true}>
            <DialogContent
                className={cn(
                    "max-w-md border-0 overflow-hidden p-0 transition-all duration-300 shadow-2xl [&>button]:hidden",
                    visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                )}
            >
                {/* Confetti */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className="absolute top-0 rounded-sm"
                            style={{
                                left: p.left,
                                width: p.size,
                                height: p.size,
                                backgroundColor: p.color,
                                animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
                            }}
                        />
                    ))}
                </div>

                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-violet-500/10 pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center gap-6 p-10">
                    {/* Animated checkmark ring */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                            style={{ animation: "popIn 0.6s 0.2s cubic-bezier(0.175,0.885,0.32,1.275) both" }}>
                            <CheckCircle className="w-12 h-12 text-green-500" />
                        </div>
                        {/* Sparkle dots */}
                        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                            <div
                                key={i}
                                className="absolute w-2.5 h-2.5 rounded-full bg-primary"
                                style={{
                                    top: `${50 + 52 * Math.sin((deg * Math.PI) / 180)}%`,
                                    left: `${50 + 52 * Math.cos((deg * Math.PI) / 180)}%`,
                                    transform: "translate(-50%, -50%)",
                                    animation: `sparkle 0.5s ${0.4 + i * 0.08}s ease-out both`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Text */}
                    <div className="space-y-2" style={{ animation: "slideUp 0.5s 0.5s ease-out both" }}>
                        <div className="flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            <span className="text-sm font-semibold text-amber-500 uppercase tracking-widest">
                                Welcome Aboard!
                            </span>
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-foreground">
                            Hello, {userName}! 🎉
                        </h2>
                        <p className="text-muted-foreground mt-2 leading-relaxed">
                            Your onboarding is complete and your account is now fully active.
                            We're thrilled to have you on the team!
                        </p>
                    </div>

                    {/* Steps done */}
                    <div className="w-full bg-muted/40 rounded-xl p-4 text-left space-y-2"
                        style={{ animation: "slideUp 0.5s 0.7s ease-out both" }}>
                        {[
                            "Profile details saved",
                            "Documents verified",
                            "Account activated",
                        ].map((step) => (
                            <div key={step} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                <span className="text-foreground">{step}</span>
                            </div>
                        ))}
                    </div>

                    <Button
                        className="w-full h-12 text-base gap-2 shadow-lg shadow-primary/20"
                        onClick={handleClose}
                        style={{ animation: "slideUp 0.5s 0.9s ease-out both" }}
                    >
                        Go to Dashboard
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>

                <style>{`
                    @keyframes confettiFall {
                        0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
                        100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
                    }
                    @keyframes popIn {
                        0%   { transform: scale(0); opacity: 0; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes sparkle {
                        0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
                        60%  { transform: translate(-50%,-50%) scale(1.4); opacity: 1; }
                        100% { transform: translate(-50%,-50%) scale(1); opacity: 0.6; }
                    }
                    @keyframes slideUp {
                        0%   { transform: translateY(20px); opacity: 0; }
                        100% { transform: translateY(0); opacity: 1; }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    );
}
