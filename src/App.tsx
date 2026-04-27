import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  Send,
  Sparkles,
  Eraser,
  Gamepad2,
  Heart,
  AlertCircle,
  LogOut,
  LogIn,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { ChatMessage } from "./types";
import { ChatMessageComponent } from "./components/ChatMessageComponent";
import { ChatList } from "./components/ChatList";
import { useAuth } from "./hooks/useAuth";
import { API_BASE_URL, gamesApi } from "./services/api";
import { TypewriterPrompt } from "./components/TypewriterPrompt";
import { generateUUID } from "./utils/uuid";
import { useChatContext } from "./context/ChatContext";

export default function PlayCureApp() {
  const { authData, isLoading: authLoading, error: authError, logout } = useAuth();
  const {
    currentChatId,
    currentMessages,
    isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    loadMoreMessages,
    messagesError,
    appendMessages,
    selectChat,
  } = useChatContext();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string[]>(["Low-stress", "No shooters"]);
  const [tagsCollapsed, setTagsCollapsed] = useState(false);
  const [steamIdOverride, setSteamIdOverride] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Track previous scroll height to preserve scroll position when prepending
  // older messages on infinite scroll up.
  const prevScrollHeightRef = useRef<number | null>(null);

  const tags = useMemo(
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

  const toggleTag = (label: string) =>
    setActive((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );

  const cleartags = () => setActive([]);

  const normalizeSteamId = (value: string): string => {
    const trimmed = value.trim();
    const profilesMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{5,})/i);
    if (profilesMatch?.[1]) {
      return profilesMatch[1].slice(0, 17);
    }
    const digits = trimmed.replace(/[^\d]/g, '');
    return digits.slice(0, 17);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  // Scroll to bottom when current chat changes (after history load) and on new
  // messages — but NOT after prepending older messages (handled separately).
  useEffect(() => {
    if (prevScrollHeightRef.current != null) return;
    scrollToBottom("auto");
  }, [currentChatId, currentMessages.length]);

  // After older messages are prepended, restore relative scroll position so
  // the user stays where they were instead of jumping to the top.
  useEffect(() => {
    const container = messagesContainerRef.current;
    const prev = prevScrollHeightRef.current;
    if (container && prev != null) {
      const delta = container.scrollHeight - prev;
      container.scrollTop = delta;
      prevScrollHeightRef.current = null;
    }
  }, [currentMessages]);

  // PCAI-144: close drawer on ESC.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  // Infinite-scroll: when user reaches the very top, fetch older messages.
  const handleHistoryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreMessages || isLoadingMoreMessages) return;
    const el = e.currentTarget;
    if (el.scrollTop <= 4) {
      prevScrollHeightRef.current = el.scrollHeight;
      void loadMoreMessages();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && active.length === 0) return;
    if (isLoading) return;
    setTagsCollapsed(true);

    const content = query.trim() || `Looking for games with: ${active.join(', ')}`;

    // PCAI-138: idempotency key — one UUID per user message.
    const clientRequestId = generateUUID();

    const userMessage: ChatMessage = {
      id: clientRequestId,
      type: 'user',
      content,
      timestamp: new Date(),
    };

    setQuery("");
    setIsLoading(true);

    // PCAI-143: optimistic echo — show user message immediately, before /proceed
    // returns. Without this the bubble appeared only after the response, and
    // if the response didn't carry chatId we'd lose it entirely.
    appendMessages([userMessage]);

    try {
      const steamIdToSend = steamIdOverride.length === 17 ? steamIdOverride : undefined;
      const response = await gamesApi.proceed({
        content,
        tags: active,
        clientRequestId,
        // PCAI-140: continue the active chat if there is one; omit to start a new one.
        ...(currentChatId ? { chatId: currentChatId } : {}),
        ...(steamIdToSend ? { steamId: steamIdToSend } : {}),
      });

      const assistantMessage: ChatMessage = {
        id: response.assistantMessageId ?? `${Date.now()}-ai`,
        messageId: response.assistantMessageId,
        type: 'ai',
        content: response.recommendation || "Here are some recommendations:",
        timestamp: new Date(),
        // PCAI-139: aggregate explanation rendered above the cards.
        reasoning: response.reasoning,
        recommendations: (response.recommendations || []).map((rec) => ({
          ...rec,
          steamUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(rec.title)}`,
        })),
      };

      // PCAI-143: render the assistant reply unconditionally. If backend gave
      // us a chatId (most cases), also adopt it and refresh the sidebar entry.
      // If it didn't — still show the message in the current view.
      appendMessages([assistantMessage], {
        chatId: response.chatId ?? null,
        refreshList: true,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      appendMessages([
        {
          id: `${Date.now()}-err`,
          type: 'ai',
          content: "Sorry — I couldn't get recommendations right now. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while authenticating
  if (authLoading) {
    return (
      <div className="relative min-h-dvh w-full overflow-hidden bg-black text-white flex items-center justify-center">
        <AnimatedBackground />
        <div className="relative z-10 text-center">
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 className="h-8 w-8 text-blue-400 animate-pulse" />
            <Heart className="h-6 w-6 text-red-400 animate-pulse" />
          </div>
          <p className="text-zinc-400">Initializing PlayCure...</p>
        </div>
      </div>
    );
  }

  // Show error if authentication failed
  if (authError) {
    return (
      <div className="relative min-h-dvh w-full overflow-hidden bg-black text-white flex items-center justify-center">
        <AnimatedBackground />
        <div className="relative z-10 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-zinc-400 mb-4">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <AnimatedBackground />

      {/* PCAI-144: chat drawer — closed by default on all screen sizes,
          opens via the burger button left of the logo. */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="chat-drawer"
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-3 left-3 z-50 w-[280px] flex flex-col rounded-2xl border border-white/10 bg-black/70 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Chat list"
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
              <span className="tracking-wide text-sm font-semibold uppercase text-zinc-200">
                PLAYCURE
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close chats"
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ChatList className="flex-1 min-h-0" onSelected={() => setSidebarOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex h-dvh min-h-0 max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        {/* Main column. min-h-0 is required so that flex-1 children can shrink
            below content size and let the inner overflow-y-auto take effect
            (PCAI-147 — flex `min-height: auto` gotcha). */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="mb-6 flex shrink-0 items-center justify-between sm:mb-8">
            <div className="flex items-center gap-2 opacity-90 select-none">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="group relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 backdrop-blur-md transition hover:border-white/25 hover:bg-white/10 hover:text-zinc-100"
                aria-label="Open chats"
                aria-expanded={sidebarOpen}
                title="Chats"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="ml-1 flex items-center gap-2">
                <Gamepad2 className="h-6 w-6 text-blue-400" />
                <Heart className="h-5 w-5 text-red-400" />
              </div>
              <span className="tracking-wide text-lg font-semibold uppercase text-zinc-300">PLAYCURE</span>
              {authData?.steamId && (
                <span className="text-xs text-zinc-500 ml-2 truncate max-w-[140px] sm:max-w-none">
                  Steam ID: {authData.steamId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {!authData?.steamId ? (
                <button
                  onClick={() => {
                    // PCAI-142: mark that we expect to come back from Steam, so
                    // initializeAuth forces a /refresh and doesn't reuse the
                    // stale guest access-token from localStorage.
                    try {
                      sessionStorage.setItem('pendingSteamLogin', '1');
                    } catch {
                      /* ignore */
                    }
                    window.location.href = `${API_BASE_URL}/auth/steam`;
                  }}
                  className="group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/15 px-3 text-sm font-medium text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
                  title="Login via Steam"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Login via Steam</span>
                </button>
              ) : (
                <button
                  onClick={logout}
                  className="group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/15 px-3 text-sm font-medium text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages + tags overlay */}
          <div className="relative flex-1 min-h-0">
            <div
              ref={messagesContainerRef}
              onScroll={handleHistoryScroll}
              className={`scrollbar-glass h-full min-h-0 overflow-y-auto space-y-4 ${
                tagsCollapsed ? 'pb-20 sm:pb-24' : 'pb-32 sm:pb-36'
              }`}
            >
              {isLoadingMoreMessages && (
                <div className="flex items-center justify-center py-2 text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}

              {messagesError && (
                <div className="mx-auto max-w-md rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                  {messagesError}
                </div>
              )}

              {isLoadingMessages && currentMessages.length === 0 && (
                <div className="flex items-center justify-center py-10 text-zinc-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}

              {!isLoadingMessages && currentMessages.length === 0 && (
                <div className="text-center text-zinc-400 py-10">
                  <Sparkles className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <TypewriterPrompt className="justify-center" />
                </div>
              )}

              {currentMessages.map((message) => (
                <ChatMessageComponent
                  key={message.id}
                  message={message}
                  // PCAI-112: a retryable error meta lets user reload chat history
                  // (in case the assistant produced a follow-up message after the
                  // error). For interactive resend we'd need to remember last user
                  // text — out of scope here.
                  onRetry={
                    currentChatId
                      ? () => selectChat(currentChatId)
                      : undefined
                  }
                />
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
            </div>

            {/* tags */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20">
              <div className="pointer-events-auto flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTagsCollapsed((prev) => !prev)}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/55 px-2.5 py-2 text-zinc-200 hover:bg-black/70 transition-all duration-200"
                    title={tagsCollapsed ? "Show" : "Hide"}
                    aria-label={tagsCollapsed ? "Show tags" : "Hide tags"}
                  >
                    {tagsCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <div
                    className={[
                      "inline-flex items-center rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-sm",
                      "transition-all duration-200 hover:bg-black/70",
                    ].join(" ")}
                  >
                    <input
                      value={steamIdOverride}
                      onChange={(e) => setSteamIdOverride(normalizeSteamId(e.target.value))}
                      placeholder="Steam ID"
                      className="w-44 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
                      inputMode="numeric"
                      aria-label="Steam ID"
                    />
                  </div>

                  {active.length > 0 && (
                    <span className="text-xs text-zinc-400">{active.length} active</span>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {!tagsCollapsed && (
                    <motion.div
                      key="tags-panel"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: "easeInOut" }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {tags.map((label) => {
                          const isActive = active.includes(label);
                          return (
                            <motion.button
                              key={label}
                              onClick={() => toggleTag(label)}
                              whileHover={{ y: -3 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              className={[
                                "group relative overflow-hidden rounded-full border px-3 py-1.5 text-sm",
                                "backdrop-blur-md transition-all duration-200",
                                isActive
                                  ? "border-white/45 bg-black/70 text-zinc-100 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)]"
                                  : "border-white/20 bg-black/55 text-zinc-200 hover:bg-black/70",
                              ].join(" ")}
                            >
                              <span className="relative z-10">{label}{isActive && " •"}</span>
                            </motion.button>
                          );
                        })}
                        {active.length > 0 && (
                          <button
                            onClick={cleartags}
                            className="ml-2 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-sm text-zinc-200 hover:bg-black/70 transition-all duration-200"
                            title="Clear all"
                          >
                            <div className="flex items-center gap-1.5"><Eraser className="h-4 w-4" /><span>Clear</span></div>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <form onSubmit={onSubmit} className="relative z-10 w-full">
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
                  placeholder={
                    currentChatId ? "Continue the conversation..." : "Tell me about your gaming preferences..."
                  }
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
            Click on tags above to activate preferences.
          </div>
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
        style={{
          x,
          y,
          willChange: "transform",
          filter: "blur(80px) saturate(200%) brightness(180%)",
          background: "radial-gradient(closest-side, rgba(120,200,255,0.95), rgba(40,140,255,0.75) 50%, rgba(0,0,0,0) 85%)",
          mixBlendMode: "screen",
        }}
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
      />
    </div>
  );
}
