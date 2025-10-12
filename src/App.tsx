import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Send, Sparkles, Eraser, Gamepad2, Heart } from "lucide-react";
import { ChatMessage, GameRecommendation, BurnoutLevel } from "./types";
import { GameRecommendationCard } from "./components/GameRecommendationCard";
import { ChatMessageComponent } from "./components/ChatMessageComponent";
import { BurnoutIndicator } from "./components/BurnoutIndicator";

export default function PlayCureApp() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string[]>(["Low-stress", "No shooters"]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chips = useMemo(
    () => [
      "Low-stress",
      "No shooters", 
      "Short sessions",
      "Narrative",
      "Co-op",
      "Puzzle",
      "Exploration",
      "Indie",
      "Offline",
      "Controller-friendly",
      "Relaxing",
      "Creative",
      "Story-driven",
      "Multiplayer",
      "Single-player"
    ],
    []
  );

  const toggleChip = (label: string) =>
    setActive((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );

  const clearChips = () => setActive([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && active.length === 0) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query || `Looking for games with: ${active.join(', ')}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "Based on your preferences, I've found some great games that should help with your gaming burnout!",
        timestamp: new Date(),
        recommendations: [
          {
            id: "1",
            title: "Stardew Valley",
            description: "A relaxing farming simulation that's perfect for unwinding after a stressful day.",
            confidence: 0.95,
            reasons: ["Perfect for low-stress gaming", "Great for short sessions", "Very relaxing"],
            tags: ["Farming", "Simulation", "Relaxing", "Indie"],
            steamUrl: "https://store.steampowered.com/app/413150/Stardew_Valley/"
          },
          {
            id: "2", 
            title: "Journey",
            description: "A beautiful, meditative adventure game with no combat or stress.",
            confidence: 0.88,
            reasons: ["No violence", "Beautiful visuals", "Short and sweet"],
            tags: ["Adventure", "Art", "Relaxing", "Short"],
            steamUrl: "https://store.steampowered.com/app/638230/Journey/"
          }
        ]
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-black text-white">
      <AnimatedBackground />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3 opacity-90 select-none">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-blue-400" />
              <Heart className="h-5 w-5 text-red-400" />
            </div>
            <span className="tracking-wide text-lg font-semibold uppercase text-zinc-300">PLAYCURE</span>
          </div>
          <BurnoutIndicator level="medium" />
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-4 max-h-96">
          {messages.length === 0 && (
            <div className="text-center text-zinc-400 py-8">
              <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>Welcome to PlayCure! Tell me about your gaming preferences or use the chips below.</p>
            </div>
          )}
          {messages.map((message) => (
            <ChatMessageComponent key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span>AI is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chips */}
        <div className="mb-6 w-full">
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((label) => {
              const isActive = active.includes(label);
              return (
                <motion.button
                  key={label}
                  onClick={() => toggleChip(label)}
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={[
                    "group relative overflow-hidden rounded-full border px-3 py-1.5 text-sm",
                    "backdrop-blur-md transition-all duration-200",
                    isActive
                      ? "border-white/40 bg-white/15 shadow-[0_10px_30px_-12px_rgba(255,255,255,0.45)]"
                      : "border-white/15 bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  <span className="relative z-10">{label}{isActive && " •"}</span>
                </motion.button>
              );
            })}
            {active.length > 0 && (
              <button
                onClick={clearChips}
                className="ml-2 rounded-full border border-white/15 bg-white/0 px-3 py-1.5 text-sm text-zinc-300 backdrop-blur-md hover:bg-white/10 transition-all duration-200"
                title="Clear all"
              >
                <div className="flex items-center gap-1.5"><Eraser className="h-4 w-4" /><span>Clear</span></div>
              </button>
            )}
          </div>
        </div>

        {/* Input bar */}
        <form onSubmit={onSubmit} className="w-full">
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 backdrop-blur-2xl">
            {/* Glow under input */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-24"
              initial={{ opacity: 0.18 }}
              animate={{ opacity: [0.22, 0.4, 0.22] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{
                background:
                  "radial-gradient(900px 340px at 50% 40%, rgba(255,255,255,0.55), transparent 60%)",
                filter: "blur(55px)",
              }}
            />
            <div className="relative z-10 flex items-center gap-3 px-4 py-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tell me about your gaming preferences..."
                className="w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
                aria-label="Game recommendation input"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || (!query.trim() && active.length === 0)}
                className="group relative inline-flex h-10 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/20 px-4 text-sm font-medium text-white backdrop-blur-md transition hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10">Send</span>
                <Send className="relative z-10 h-4 w-4" />
              </button>
            </div>
          </div>
        </form>

        <div className="mt-3 text-center text-xs text-zinc-400">
          Click on chips above to activate preferences. Everything in liquid glass style.
        </div>
      </div>
    </div>
  );
}

function AnimatedBackground() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 50, damping: 18, mass: 0.7 });
  const y = useSpring(my, { stiffness: 50, damping: 18, mass: 0.7 });
  const lastMove = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      lastMove.current = performance.now();
      const { innerWidth: w, innerHeight: h } = window;
      mx.set((e.clientX - w / 2) * 0.25);
      my.set((e.clientY - h / 2) * 0.25);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const idle = performance.now() - (lastMove.current || 0) > 1600 || window.innerWidth < 768;
      if (idle) {
        const now = t - start;
        const A = Math.min(window.innerWidth, window.innerHeight) * 0.14;
        mx.set(Math.sin(now / 1800) * A);
        my.set(Math.cos(now / 2400) * A * 0.85);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mx, my]);

  return (
    <div className="absolute inset-0 -z-10 pointer-events-none">
      <motion.div
        style={{ x, y, willChange: "transform" }}
        className="absolute left-1/2 top-1/2 h-[110vmin] w-[110vmin] -translate-x-1/2 -translate-y-1/2 rounded-[46%]"
        animate={{
          borderRadius: [
            "40% 60% 55% 45% / 55% 45% 55% 45%",
            "60% 40% 45% 55% / 45% 55% 45% 55%",
            "40% 60% 55% 45% / 55% 45% 55% 45%",
          ],
          scale: [1, 1.05, 1],
          rotate: [0, 10, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          filter: "blur(80px) saturate(200%) brightness(180%)",
          background:
            "radial-gradient(closest-side, rgba(120,200,255,0.95), rgba(40,140,255,0.75) 50%, rgba(0,0,0,0) 85%)",
          mixBlendMode: "screen",
        } as React.CSSProperties}
      />
    </div>
  );
}
