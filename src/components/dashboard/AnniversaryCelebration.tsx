import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper, Star, Gift, Heart } from "lucide-react";

export default function AnniversaryCelebration() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [yearsCompleted, setYearsCompleted] = useState(0);

  useEffect(() => {
    if (!profile?.date_of_joining) return;

    const joining = new Date(profile.date_of_joining);
    const today = new Date();

    // Check if today is the anniversary (same month & day)
    if (
      joining.getMonth() === today.getMonth() &&
      joining.getDate() === today.getDate()
    ) {
      const years = today.getFullYear() - joining.getFullYear();
      if (years >= 1) {
        // Only show once per session
        const key = `anniversary-shown-${profile.id}-${today.getFullYear()}`;
        if (!sessionStorage.getItem(key)) {
          setYearsCompleted(years);
          setOpen(true);
          sessionStorage.setItem(key, "true");
        }
      }
    }
  }, [profile]);

  if (!open) return null;

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md border-none bg-gradient-to-br from-primary/10 via-background to-accent/10 overflow-hidden p-0">
        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className="absolute text-lg animate-float-particle"
              style={{
                left: `${8 + Math.random() * 84}%`,
                top: `${8 + Math.random() * 84}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              {["🎉", "✨", "🌟", "🎊", "💫", "⭐"][i % 6]}
            </span>
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-6 py-10 gap-5">
          {/* Icon cluster */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center animate-scale-in">
              <PartyPopper className="w-10 h-10 text-primary animate-bounce" />
            </div>
            <Star className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-ping" />
            <Gift className="absolute -bottom-1 -left-3 w-5 h-5 text-pink-500 animate-pulse" />
            <Heart className="absolute -top-1 -left-2 w-4 h-4 text-red-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>

          <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
            <h2 className="text-2xl font-bold text-foreground">
              🎂 Happy {ordinal(yearsCompleted)} Work Anniversary!
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
              Congratulations <span className="font-semibold text-foreground">{profile?.full_name}</span>! 
              You've completed <span className="font-semibold text-primary">{yearsCompleted} {yearsCompleted === 1 ? "year" : "years"}</span> with us. 
              Thank you for your dedication and hard work! 🙌
            </p>
          </div>

          <div className="flex items-center gap-1 text-yellow-500 animate-fade-in" style={{ animationDelay: "0.6s", animationFillMode: "both" }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400" />
            ))}
          </div>

          <Button
            onClick={() => setOpen(false)}
            className="mt-2 animate-fade-in"
            style={{ animationDelay: "0.8s", animationFillMode: "both" }}
          >
            Thank You! 🎉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
