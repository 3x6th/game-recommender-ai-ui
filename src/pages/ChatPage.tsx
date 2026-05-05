import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout} from "../components/layout/AppLayout";
import {
    Gamepad2,
    Heart,
    AlertCircle,
    X,
} from "lucide-react";
import { ChatMessage } from "../types";
import { ChatList } from "../components/ChatList";
import { useAuth } from "../hooks/useAuth";
import { gamesApi } from "../services/api";
import { generateUUID } from "../utils/uuid";
import { useChatContext } from "../context/ChatContext";
import { fromChatMessageDto } from "../utils/chatMessageMapper";
import { Header } from "../components/layout/Header";
import { TagsPanel } from "../components/tags/TagsPanel"
import { MessagesContainer } from "../components/chat/MessagesContainer"
import { ChatInput } from "../components/chat/ChatInput"

export default function ChatPage() {
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

            // PCAI-153: /proceed теперь возвращает тот же ChatMessageDto-конверт, что и
            // история. Маппим через тот же fromChatMessageDto — никакой ручной сборки
            // ChatMessage из legacy-полей. Если бек прислал несколько сообщений (status +
            // cards в будущем при streaming) — все попадут в ленту.
            const aiMessages: ChatMessage[] = (response.messages ?? []).map(fromChatMessageDto);

            // PCAI-143: render the assistant reply unconditionally. If backend gave
            // us a chatId (most cases), also adopt it and refresh the sidebar entry.
            appendMessages(aiMessages, {
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
        <AppLayout>
                <div className="relative z-10 text-center">
                    <div className="flex items-center gap-3 mb-4">
                        <Gamepad2 className="h-8 w-8 text-blue-400 animate-pulse" />
                        <Heart className="h-6 w-6 text-red-400 animate-pulse" />
                    </div>
                    <p className="text-zinc-400">Initializing PlayCure...</p>
                </div>
        </AppLayout>
        );
    }

    // Show error if authentication failed
    if (authError) {
        return (
            <AppLayout>
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
            </AppLayout>

        );
    }

    return (
        <>
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


                {/*Основной контент, обёрнутый в AppLayout*/}
                <AppLayout>

                        {/*Header*/}

                        <Header
                            authData={authData}
                            onLogout={logout}
                            sidebarOpen={sidebarOpen}
                            onToggleSidebar={() => setSidebarOpen(true)}
                        />

                        {/* Chat Messages + tags overlay */}
                        <div className="relative flex-1 min-h-0">
                            {/* chat messages */}

                            <MessagesContainer
                                messages={currentMessages}
                                isLoading={isLoading}
                                isLoadingMore={isLoadingMoreMessages}
                                isLoadingInitial={isLoadingMessages}
                                hasMore={hasMoreMessages}
                                error={messagesError}
                                tagsCollapsed={tagsCollapsed}
                                currentChatId={currentChatId}
                                onRetry={currentChatId ? () => selectChat(currentChatId) : undefined}
                                onSelectChat={selectChat}
                                onScroll={handleHistoryScroll}
                                onMessagesChange={() => {}}
                            />

                            {/* tags */}
                            <TagsPanel
                                tags={tags}
                                active={active}
                                collapsed={tagsCollapsed}
                                steamIdValue={steamIdOverride}
                                onToggleCollapse={() => setTagsCollapsed(prev => !prev)}
                                onToggleTag={toggleTag}
                                onClearTags={cleartags}
                                onSteamIdChange={(e) => setSteamIdOverride(normalizeSteamId(e.target.value))}
                            />
                        </div>
                        {/* Input bar */}

                        <ChatInput
                            value={query}
                            placeholder={currentChatId ? "Continue the conversation..." : "Tell me about your gaming preferences..."}
                            disabled={isLoading}
                            onChange={(e) => setQuery(e.target.value)}
                            onSubmit={onSubmit}
                        />

                        <div className="mt-3 text-center text-xs text-zinc-400">
                            Click on tags above to activate preferences.
                        </div>
                </AppLayout>
        </>
    );
}


