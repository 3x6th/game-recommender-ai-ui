
import React, { useRef, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ChatMessage } from "../../types";
import { ChatMessageComponent } from "../ChatMessageComponent";
import { TypewriterPrompt } from "../TypewriterPrompt";

interface MessagesContainerProps {
    messages: ChatMessage[];
    isLoading: boolean;
    isLoadingMore: boolean;
    isLoadingInitial: boolean;
    hasMore: boolean;
    error: string | null;
    tagsCollapsed: boolean;
    currentChatId: string | null;
    userAvatarUrl: string | null;
    userSteamId?: string;
    onRetry: (() => void) | undefined;
    onSelectChat: (chatId: string) => void;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onMessagesChange?: () => void;
}

export function MessagesContainer({
                                      messages,
                                      isLoading,
                                      isLoadingMore,
                                      isLoadingInitial,
                                      hasMore,
                                      error,
                                      tagsCollapsed,
                                      currentChatId,
                                      userAvatarUrl,
                                      userSteamId,
                                      onRetry,
                                      onScroll,
                                  }: MessagesContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef<number | null>(null);

    // Scroll to bottom when chat changes or new messages appear
    useEffect(() => {
        if (prevScrollHeightRef.current != null) return;
        const container = containerRef.current;
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'auto'});
        }
    }, [currentChatId, messages.length])

    // Restore scroll position after prepending older messages
    useEffect(() => {
        const container = containerRef.current;
        const prev = prevScrollHeightRef.current;
        if (container && prev != null) {
            const delta = container.scrollHeight - prev;
            container.scrollTop = delta;
            prevScrollHeightRef.current = null;
        }
    }, [messages]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!hasMore || isLoadingMore) return;
        const el = e.currentTarget;
        if (el.scrollTop <= 4) {
            prevScrollHeightRef.current = el.scrollHeight;
            onScroll(e);
        }
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={`scrollbar-glass h-full min-h-0 overflow-y-auto space-y-4 ${
                tagsCollapsed ? 'pb-20 sm:pb-24' : 'pb-32 sm:pb-36'
            }`}
        >
            {/* Loading more messages (infinite scroll up) */}
            {isLoadingMore && (
                <div className="flex items-center justify-center py-2 text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="mx-auto max-w-md rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                    {error}
                </div>
            )}

            {/* Initial loading */}
            {isLoadingInitial && messages.length === 0 && (
                <div className="flex items-center justify-center py-10 text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            )}

            {/* Empty state */}
            {!isLoadingInitial && messages.length === 0 && (
                <div className="text-center text-zinc-400 py-10">
                    <Sparkles className="h-8 w-8 mx-auto mb-4 opacity-50" />
                    <TypewriterPrompt className="justify-center" />
                </div>
            )}

            {/* Messages list */}
            {messages.map((message) => (
                <ChatMessageComponent
                    key={message.id}
                    message={message}
                    userAvatarUrl={userAvatarUrl}
                    userSteamId={userSteamId}
                    onRetry={onRetry}
                />
            ))}

            {/* AI typing indicator */}
            {isLoading && (
                <div className="flex items-center gap-2 text-zinc-400">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span>AI is thinking...</span>
                </div>
            )}
        </div>
    );
}
