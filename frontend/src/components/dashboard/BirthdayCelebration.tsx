import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cake, Sparkles, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Confetti config ── */
const CONFETTI_COLORS = [
  "#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA",
  "#F472B6", "#38BDF8", "#FB923C", "#34D399",
];
const CONFETTI_SHAPES = ["●", "■", "▲", "★", "♦", "◆"];
const CONFETTI_COUNT = 60;

/* ── Balloon config ── */
const BALLOON_COLORS = [
  "#FF6B6B", "#FFD700", "#4ECDC4", "#A78BFA",
  "#F472B6", "#38BDF8", "#FB923C", "#EF4444",
];
const BALLOON_COUNT = 24;

/* ── Fullscreen burst confetti config ── */
const BURST_COLORS = [
  "#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA",
  "#F472B6", "#38BDF8", "#FB923C", "#34D399",
];
const BURST_SHAPES = ["●", "■", "▲", "★", "♦", "◆", "❤", "✦", "◉", "▸"];
const BURST_COUNT = 120;

interface ConfettiPiece {
  id: number;
  color: string;
  shape: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
  drift: number;
}

interface BalloonPiece {
  id: number;
  color: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
  sway: number;
}

interface BurstPiece {
  id: number;
  color: string;
  shape: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
  drift: number;
}

function generateConfetti(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    shape: CONFETTI_SHAPES[i % CONFETTI_SHAPES.length],
    left: `${Math.random() * 100}%`,
    size: 6 + Math.random() * 10,
    delay: `${Math.random() * 1.5}s`,
    duration: `${2 + Math.random() * 2.5}s`,
    drift: -30 + Math.random() * 60,
  }));
}

function generateBalloons(): BalloonPiece[] {
  return Array.from({ length: BALLOON_COUNT }, (_, i) => ({
    id: i,
    color: BALLOON_COLORS[i % BALLOON_COLORS.length],
    left: `${2 + Math.random() * 96}%`,
    size: 40 + Math.random() * 32,
    delay: `${Math.random() * 2}s`,
    duration: `${3.5 + Math.random() * 3.5}s`,
    sway: -50 + Math.random() * 100,
  }));
}

function generateBurst(): BurstPiece[] {
  return Array.from({ length: BURST_COUNT }, (_, i) => ({
    id: i,
    color: BURST_COLORS[i % BURST_COLORS.length],
    shape: BURST_SHAPES[i % BURST_SHAPES.length],
    left: `${Math.random() * 100}%`,
    size: 8 + Math.random() * 16,
    delay: `${Math.random()}s`,
    duration: `${2.8 + Math.random() * 2.8}s`,
    drift: -80 + Math.random() * 160,
  }));
}

export default function BirthdayCelebration() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  
  const confetti = useMemo(() => generateConfetti(), []);
  const balloons = useMemo(() => generateBalloons(), []);
  const burst = useMemo(() => generateBurst(), []);

  useEffect(() => {
    if (!profile?.date_of_birth) return;

    const dob = new Date(profile.date_of_birth);
    const dobMonth = dob.getMonth();
    const dobDay = dob.getDate();
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    if (dobMonth === todayMonth && dobDay === todayDay) {
      const year = today.getFullYear();
      const key = `birthday-shown-${profile.id}-${year}`;
      if (!sessionStorage.getItem(key)) {
        setOpen(true);
        sessionStorage.setItem(key, "true");
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), 7000);
    return () => clearTimeout(timer);
  }, [celebrating]);

  const handleCelebrate = useCallback(() => {
    setCelebrating(true);
    setOpen(false);
  }, []);

  if (!open && !celebrating) return null;

  return (
    <>
      <style>{`
        @keyframes bday-fall {
          0%   { transform: translateY(-50px) rotate(0deg) translateX(0); opacity: 1; }
          100% { transform: translateY(500px) rotate(1080deg) translateX(var(--drift)); opacity: 0; }
        }
        @keyframes bday-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-12px) rotate(3deg); }
        }
        @keyframes bday-pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bday-balloon-rise {
          0%   { transform: translateY(110vh) translateX(0) scale(0.5); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateY(-150px) translateX(var(--sway)) scale(1.1); opacity: 0; }
        }
        @keyframes bday-text-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50%      { transform: scale(1.04); filter: brightness(1.1); }
        }
        @keyframes ac-slide-up {
          0%   { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* ── Fullscreen Celebration Overlay ── */}
      {celebrating && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-auto cursor-pointer overflow-hidden backdrop-blur-sm"
          onClick={() => setCelebrating(false)}
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)",
          }}
        >
          {/* Confetti bursting */}
          {burst.map((c) => (
            <span
              key={`burst-${c.id}`}
              className="absolute top-0 leading-none select-none"
              style={{
                left: c.left,
                fontSize: c.size,
                color: c.color,
                animationName: "bday-fall",
                animationTimingFunction: "cubic-bezier(.17,.67,.83,.67)",
                animationIterationCount: "1",
                animationFillMode: "forwards",
                animationDelay: c.delay,
                animationDuration: c.duration,
                "--drift": `${c.drift}px`,
              } as React.CSSProperties}
            >
              {c.shape}
            </span>
          ))}

          {/* Balloons rising */}
          {balloons.map((b) => (
            <div
              key={`balloon-${b.id}`}
              className="absolute bottom-0 select-none"
              style={{
                left: b.left,
                animationName: "bday-balloon-rise",
                animationTimingFunction: "ease-out",
                animationIterationCount: "1",
                animationFillMode: "forwards",
                animationDelay: b.delay,
                animationDuration: b.duration,
                "--sway": `${b.sway}px`,
              } as React.CSSProperties}
            >
              <svg width={b.size} height={b.size * 1.5} viewBox="0 0 30 45">
                <ellipse cx="15" cy="15" rx="14" ry="15" fill={b.color} fillOpacity="0.8" />
                <path d="M15 30 L15 45" stroke={b.color} strokeWidth="1" strokeDasharray="2 1" />
                <circle cx="10" cy="10" r="3" fill="white" fillOpacity="0.3" />
              </svg>
            </div>
          ))}

          {/* Message */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
             <div className="animate-bounce mb-6">
               <span className="text-8xl drop-shadow-lg">🎂</span>
             </div>
             <h1 
               className="text-5xl md:text-7xl font-black text-white tracking-tighter"
               style={{
                textShadow: "0 0 30px rgba(236,72,153,0.8), 0 10px 40px rgba(0,0,0,0.5)",
                animation: "bday-text-pulse 2s ease-in-out infinite"
               }}
             >
                HAPPY BIRTHDAY!
             </h1>
             <p 
               className="text-3xl md:text-5xl text-white mt-6 font-black drop-shadow-[0_4px_12px_rgba(236,72,153,0.8)]"
               style={{ animation: "bday-text-pulse 2s ease-in-out infinite 0.5s" }}
             >
                ✨ {profile?.full_name} ✨
             </p>
             <p className="mt-12 text-white/40 text-sm">Click anywhere to close celebration</p>
          </div>
        </div>
      )}

      {/* ── Birthday Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px] border-none p-0 overflow-hidden bg-transparent shadow-none [&>button]:text-white">
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: "linear-gradient(160deg, #500724 0%, #831843 40%, #db2777 100%)",
            }}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                {confetti.slice(0, 30).map((c) => (
                    <span
                        key={c.id}
                        className="absolute leading-none rotate-12"
                        style={{
                            left: c.left,
                            top: `${Math.random() * 100}%`,
                            fontSize: c.size,
                            color: c.color,
                            opacity: 0.6
                        }}
                    >
                        {c.shape}
                    </span>
                ))}
            </div>

            <div className="relative z-10 px-8 py-12 flex flex-col items-center text-center gap-6">
              <div 
                className="relative"
                style={{ animation: "bday-pop 0.8s cubic-bezier(.34,1.56,.64,1) both" }}
              >
                <div className={`absolute -inset-6 bg-pink-400/20 rounded-full blur-xl animate-pulse`} />
                <div 
                    className={`w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-xl border-4 border-white/20`}
                    style={{ animation: "bday-float 4s ease-in-out infinite" }}
                >
                    <Cake className="w-12 h-12 text-white drop-shadow-md" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 text-yellow-300 animate-pulse w-8 h-8" />
              </div>

              <div style={{ animation: "ac-slide-up 0.6s ease-out 0.2s both" }}>
                <h2 className="text-3xl font-black text-white italic tracking-tight">
                    IT'S YOUR DAY!
                </h2>
                <div className={`h-1 w-20 bg-yellow-400 mx-auto mt-2 rounded-full`} />
              </div>

              <div style={{ animation: "ac-slide-up 0.6s ease-out 0.4s both" }}>
                <p className={`text-xl font-bold text-pink-100`}>
                    Happy Birthday, {profile?.full_name}!
                </p>
                <p className="text-white/70 text-sm mt-3 leading-relaxed">
                    Wishing you a fantastic day filled with joy, laughter, and plenty of cake! May your year ahead be as awesome as you are. 🎈
                </p>
              </div>

              <div 
                className="flex items-center gap-3 py-2"
                style={{ animation: "ac-slide-up 0.6s ease-out 0.6s both" }}
              >
                <span className="text-2xl animate-bounce">🎁</span>
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎁</span>
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.4s' }}>🎁</span>
              </div>

              <Button
                onClick={handleCelebrate}
                className={`group relative h-12 px-10 rounded-full bg-yellow-400 text-pink-900 hover:bg-yellow-300 font-black text-lg shadow-lg hover:scale-105 transition-all overflow-hidden`}
                style={{ animation: "ac-slide-up 0.6s ease-out 0.8s both" }}
              >
                <span className="relative z-10 flex items-center gap-2">
                   LET'S CELEBRATE! <Sparkles className="w-5 h-5" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}