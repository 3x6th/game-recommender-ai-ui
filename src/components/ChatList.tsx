import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Loader2 } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';

interface ChatListProps {
  className?: string;
  onSelected?: () => void; // for mobile drawer-like usage
}

function formatRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString();
}

export const ChatList: React.FC<ChatListProps> = ({ className = '', onSelected }) => {
  const {
    chats,
    isLoadingChats,
    chatsError,
    currentChatId,
    selectChat,
    startNewChat,
    hasMoreChats,
    loadMoreChats,
  } = useChatContext();

  const handleSelect = (chatId: string) => {
    selectChat(chatId);
    onSelected?.();
  };

  const handleNewChat = () => {
    startNewChat();
    onSelected?.();
  };

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Chats</span>
        <button
          type="button"
          onClick={handleNewChat}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs text-zinc-200 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
          title="New chat"
          aria-label="Start a new chat"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New</span>
        </button>
      </div>

      <div className="scrollbar-glass flex-1 min-h-0 overflow-y-auto px-2 py-2">
        {chats.length === 0 && !isLoadingChats && (
          <div className="px-2 py-6 text-center text-xs text-zinc-500">
            No chats yet. Send your first message to start one.
          </div>
        )}

        <AnimatePresence initial={false}>
          {chats.map((chat) => {
            const isActive = chat.chatId === currentChatId;
            return (
              <motion.button
                key={chat.chatId}
                type="button"
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                onClick={() => handleSelect(chat.chatId)}
                className={[
                  'group mb-1 flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-all duration-150',
                  isActive
                    ? 'border-white/30 bg-white/10'
                    : 'border-transparent hover:border-white/15 hover:bg-white/5',
                ].join(' ')}
              >
                <MessageSquare
                  className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${
                    isActive ? 'text-blue-300' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-xs ${
                        isActive ? 'text-zinc-100' : 'text-zinc-300'
                      }`}
                    >
                      {chat.lastMessagePreview?.trim() || 'New conversation'}
                    </span>
                    <span className="flex-shrink-0 text-[10px] uppercase tracking-wide text-zinc-500">
                      {formatRelativeTime(chat.updatedAt)}
                    </span>
                  </div>
                  {chat.status === 'ARCHIVED' && (
                    <span className="mt-0.5 inline-block rounded-full bg-zinc-700/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-zinc-400">
                      archived
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {isLoadingChats && (
          <div className="flex items-center justify-center py-3 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {hasMoreChats && !isLoadingChats && (
          <button
            type="button"
            onClick={() => void loadMoreChats()}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-zinc-400 transition hover:border-white/20 hover:bg-white/10 hover:text-zinc-200"
          >
            Load more
          </button>
        )}

        {chatsError && (
          <div className="mt-2 rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-1.5 text-[11px] text-red-200">
            {chatsError}
          </div>
        )}
      </div>
    </div>
  );
};
