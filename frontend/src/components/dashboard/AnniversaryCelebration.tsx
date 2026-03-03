import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles } from "lucide-react";

/* ── Confetti config ── */
const CONFETTI_COLORS = [
  "#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA",
  "#F472B6", "#38BDF8", "#FB923C", "#34D399",
];
const CONFETTI_SHAPES = ["●", "■", "▲", "★", "♦", "◆"];
const CONFETTI_COUNT = 50;

/* ── Balloon config ── */
const BALLOON_COLORS = [
  "#FF6B6B", "#FFD700", "#4ECDC4", "#A78BFA",
  "#F472B6", "#38BDF8", "#FB923C", "#EF4444",
  "#8B5CF6", "#10B981", "#F59E0B", "#EC4899",
];
const BALLOON_COUNT = 18;

/* ── Fullscreen burst confetti config ── */
const BURST_COLORS = [
  "#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA",
  "#F472B6", "#38BDF8", "#FB923C", "#34D399",
  "#EF4444", "#8B5CF6", "#F59E0B", "#EC4899",
];
const BURST_SHAPES = ["●", "■", "▲", "★", "♦", "◆", "❤", "✦", "◉", "▸"];
const BURST_COUNT = 100;

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
    duration: `${2 + Math.random() * 2}s`,
    drift: -30 + Math.random() * 60,
  }));
}

function generateBalloons(): BalloonPiece[] {
  return Array.from({ length: BALLOON_COUNT }, (_, i) => ({
    id: i,
    color: BALLOON_COLORS[i % BALLOON_COLORS.length],
    left: `${4 + Math.random() * 92}%`,
    size: 36 + Math.random() * 28,
    delay: `${Math.random() * 1.8}s`,
    duration: `${3 + Math.random() * 3}s`,
    sway: -40 + Math.random() * 80,
  }));
}

function generateBurst(): BurstPiece[] {
  return Array.from({ length: BURST_COUNT }, (_, i) => ({
    id: i,
    color: BURST_COLORS[i % BURST_COLORS.length],
    shape: BURST_SHAPES[i % BURST_SHAPES.length],
    left: `${Math.random() * 100}%`,
    size: 8 + Math.random() * 14,
    delay: `${Math.random() * 0.8}s`,
    duration: `${2.5 + Math.random() * 2.5}s`,
    drift: -60 + Math.random() * 120,
  }));
}

export default function AnniversaryCelebration() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [yearsCompleted, setYearsCompleted] = useState(0);
  const confetti = useMemo(() => generateConfetti(), []);
  const balloons = useMemo(() => generateBalloons(), []);
  const burst = useMemo(() => generateBurst(), []);

  useEffect(() => {
    if (!profile?.date_of_joining) return;

    const joinDate = new Date(profile.date_of_joining);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth();
    const joinDay = joinDate.getDate();
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const todayYear = today.getFullYear();

    if (joinMonth === todayMonth && joinDay === todayDay) {
      const years = todayYear - joinYear;
      if (years >= 1) {
        const key = `anniversary-shown-${profile.id}-${todayYear}`;
        if (!sessionStorage.getItem(key)) {
          setYearsCompleted(years);
          setOpen(true);
          sessionStorage.setItem(key, "true");
        }
      }
    }
  }, [profile]);

  // Auto-dismiss the fullscreen celebration after 5 seconds
  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), 5000);
    return () => clearTimeout(timer);
  }, [celebrating]);

  const handleCelebrate = useCallback(() => {
    setCelebrating(true);
    setOpen(false);
  }, []);

  if (!open && !celebrating) return null;

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes ac-fall {
          0%   { transform: translateY(-40px) rotate(0deg) translateX(0); opacity: 1; }
          100% { transform: translateY(480px) rotate(720deg) translateX(var(--drift)); opacity: 0; }
        }
        @keyframes ac-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(168,85,247,.25), 0 0 60px rgba(168,85,247,.10); }
          50%      { box-shadow: 0 0 50px rgba(168,85,247,.40), 0 0 90px rgba(168,85,247,.18); }
        }
        @keyframes ac-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes ac-pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ac-slide-up {
          0%   { transform: translateY(24px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes ac-ring-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ac-shine {
          0%   { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(200%) rotate(25deg); }
        }
        @keyframes ac-number-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }

        /* ── Fullscreen celebration ── */
        @keyframes ac-balloon-rise {
          0%   { transform: translateY(100vh) translateX(0) scale(0.4); opacity: 0; }
          10%  { opacity: 1; transform: translateY(80vh) translateX(0) scale(0.8); }
          100% { transform: translateY(-120px) translateX(var(--sway)) scale(1); opacity: 0.9; }
        }
        @keyframes ac-burst-fall {
          0%   { transform: translateY(-30px) rotate(0deg) translateX(0); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(1080deg) translateX(var(--drift)); opacity: 0; }
        }
        @keyframes ac-overlay-in {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes ac-overlay-out {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes ac-text-pop {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes ac-text-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes ac-emoji-burst {
          0%   { transform: scale(0) rotate(0deg); opacity: 0; }
          50%  { transform: scale(1.4) rotate(15deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {/* ── Fullscreen Celebration Overlay ── */}
      {celebrating && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-auto cursor-pointer overflow-hidden"
          onClick={() => setCelebrating(false)}
          style={{
            background: "radial-gradient(ellipse at 50% 40%, rgba(139,92,246,.15) 0%, rgba(0,0,0,.6) 100%)",
            animation: "ac-overlay-in .4s ease-out forwards",
          }}
        >
          {/* Burst confetti - fullscreen */}
          {burst.map((c) => (
            <span
              key={`burst-${c.id}`}
              className="absolute top-0 leading-none select-none"
              style={{
                left: c.left,
                fontSize: c.size,
                color: c.color,
                animationName: "ac-burst-fall",
                animationTimingFunction: "cubic-bezier(.25,.46,.45,.94)",
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

          {/* Balloons floating up */}
          {balloons.map((b) => (
            <div
              key={`balloon-${b.id}`}
              className="absolute bottom-0 select-none"
              style={{
                left: b.left,
                animationName: "ac-balloon-rise",
                animationTimingFunction: "cubic-bezier(.25,.46,.45,.94)",
                animationIterationCount: "1",
                animationFillMode: "forwards",
                animationDelay: b.delay,
                animationDuration: b.duration,
                "--sway": `${b.sway}px`,
              } as React.CSSProperties}
            >
              {/* Balloon SVG */}
              <svg
                width={b.size}
                height={b.size * 1.3}
                viewBox="0 0 40 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <ellipse cx="20" cy="18" rx="17" ry="18" fill={b.color} />
                <ellipse cx="20" cy="18" rx="17" ry="18" fill="url(#sheen)" fillOpacity="0.35" />
                <polygon points="15,35 20,38 25,35" fill={b.color} />
                <line x1="20" y1="38" x2="20" y2="52" stroke={b.color} strokeWidth="1" opacity="0.6" />
                {/* Highlight */}
                <ellipse cx="13" cy="12" rx="4" ry="6" fill="white" fillOpacity="0.3" transform="rotate(-20 13 12)" />
                <defs>
                  <radialGradient id="sheen" cx="0.35" cy="0.3" r="0.8">
                    <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          ))}

          {/* Center message */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-4">
            <div
              style={{
                animation: "ac-emoji-burst .6s cubic-bezier(.34,1.56,.64,1) .3s both",
              }}
            >
              <span className="text-7xl">🎉</span>
            </div>
            <div
              className="text-center"
              style={{
                animation: "ac-text-pop .6s cubic-bezier(.34,1.56,.64,1) .5s both",
              }}
            >
              <h2
                className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-2xl"
                style={{
                  textShadow: "0 0 40px rgba(168,85,247,.5), 0 4px 20px rgba(0,0,0,.4)",
                  animation: "ac-text-float 3s ease-in-out 1s infinite",
                }}
              >
                Happy {ordinal(yearsCompleted)} Anniversary!
              </h2>
              <p
                className="text-xl md:text-2xl text-white/80 mt-3 font-medium"
                style={{
                  textShadow: "0 2px 10px rgba(0,0,0,.3)",
                  animation: "ac-slide-up .5s ease-out .8s both",
                }}
              >
                🏆 {profile?.full_name} 🏆
              </p>
            </div>
            <p
              className="text-white/50 text-sm mt-6"
              style={{ animation: "ac-slide-up .5s ease-out 1.2s both" }}
            >
              Tap anywhere to dismiss
            </p>
          </div>
        </div>
      )}

      {/* ── Anniversary Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px] border-none p-0 overflow-hidden bg-transparent shadow-none [&>button]:text-white [&>button]:hover:text-white/80">
          {/* Main card */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 35%, #4c1d95 70%, #581c87 100%)",
            }}
          >
            {/* ── Confetti layer ── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
              {confetti.map((c) => (
                <span
                  key={c.id}
                  className="absolute top-0 leading-none select-none"
                  style={{
                    left: c.left,
                    fontSize: c.size,
                    color: c.color,
                    animationName: "ac-fall",
                    animationTimingFunction: "cubic-bezier(.25,.46,.45,.94)",
                    animationIterationCount: "infinite",
                    animationDelay: c.delay,
                    animationDuration: c.duration,
                    "--drift": `${c.drift}px`,
                  } as React.CSSProperties}
                >
                  {c.shape}
                </span>
              ))}
            </div>

            {/* Subtle mesh gradient layer */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 20% 20%, rgba(251,191,36,.3) 0%, transparent 50%), " +
                  "radial-gradient(circle at 80% 80%, rgba(236,72,153,.25) 0%, transparent 50%)",
              }}
            />

            {/* Content */}
            <div className="relative z-20 flex flex-col items-center text-center px-8 py-10 gap-6">
              {/* Trophy with animated ring */}
              <div
                className="relative"
                style={{ animation: "ac-pop .6s cubic-bezier(.34,1.56,.64,1) forwards" }}
              >
                {/* Spinning dotted ring */}
                <div
                  className="absolute -inset-4 rounded-full border-2 border-dashed border-amber-400/40"
                  style={{ animation: "ac-ring-spin 12s linear infinite" }}
                />
                <div
                  className="w-[88px] h-[88px] rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(251,191,36,.25) 0%, rgba(168,85,247,.25) 100%)",
                    animation: "ac-glow 3s ease-in-out infinite, ac-float 4s ease-in-out infinite",
                  }}
                >
                  <Trophy className="w-10 h-10 text-amber-400 drop-shadow-lg" />
                </div>
                {/* Corner sparkles */}
                <Sparkles
                  className="absolute -top-1 -right-1 w-5 h-5 text-yellow-300"
                  style={{ animation: "ac-float 2s ease-in-out infinite", animationDelay: ".3s" }}
                />
                <Sparkles
                  className="absolute -bottom-2 -left-2 w-4 h-4 text-pink-300"
                  style={{ animation: "ac-float 2.5s ease-in-out infinite", animationDelay: ".8s" }}
                />
              </div>

              {/* Big number */}
              <div
                style={{
                  animation: "ac-slide-up .5s ease-out .25s both",
                }}
              >
                <div
                  className="relative inline-block"
                  style={{ animation: "ac-number-pulse 3s ease-in-out infinite" }}
                >
                  <span
                    className="text-6xl font-extrabold tracking-tight bg-clip-text text-transparent select-none"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #fbbf24, #f472b6, #a78bfa)",
                    }}
                  >
                    {yearsCompleted}
                  </span>
                  {/* Shine sweep */}
                  <span
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ animation: "ac-shine 3s ease-in-out infinite 1.5s" }}
                  >
                    <span
                      className="block w-8 h-full"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)",
                      }}
                    />
                  </span>
                </div>
                <p className="text-sm font-medium text-amber-200/80 tracking-wider uppercase mt-1">
                  {yearsCompleted === 1 ? "Year" : "Years"} of Excellence
                </p>
              </div>

              {/* Title */}
              <div style={{ animation: "ac-slide-up .5s ease-out .4s both" }}>
                <h2 className="text-[22px] font-bold text-white leading-snug">
                  Happy {ordinal(yearsCompleted)} Work Anniversary!
                </h2>
                <p className="text-white/60 text-sm mt-2 leading-relaxed max-w-[300px] mx-auto">
                  Congratulations{" "}
                  <span className="font-semibold text-amber-300">{profile?.full_name}</span>!
                  Thank you for your incredible dedication & contributions to the team 🙌
                </p>
              </div>

              {/* Star rating row */}
              <div
                className="flex gap-1.5"
                style={{ animation: "ac-slide-up .5s ease-out .55s both" }}
              >
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="text-xl"
                    style={{
                      animation: "ac-pop .4s cubic-bezier(.34,1.56,.64,1) forwards",
                      animationDelay: `${0.6 + i * 0.08}s`,
                      opacity: 0,
                    }}
                  >
                    ⭐
                  </span>
                ))}
              </div>

              {/* CTA button */}
              <Button
                onClick={handleCelebrate}
                className="relative overflow-hidden border-none text-sm font-semibold px-8 py-2.5 rounded-full text-indigo-950 hover:scale-105 transition-transform"
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #f9a8d4)",
                  animation: "ac-slide-up .5s ease-out .7s both",
                }}
              >
                🎈 Celebrate! 🎉
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
