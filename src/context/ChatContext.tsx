import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { chatsApi } from '../services/api';
import { ChatDto, ChatMessage } from '../types';
import { fromChatMessageDto } from '../utils/chatMessageMapper';
import { useAuthContext } from './AuthContext';

/**
 * Format a Date as ISO_LOCAL_DATE_TIME (no trailing Z / no offset) — the
 * backend currently binds `before` to LocalDateTime which can't parse the
 * standard ISO string with 'Z'. See PCAI-149 (FE workaround) / PCAI-150
 * (proper BE fix to OffsetDateTime). Once BE is fixed we can drop this
 * and use date.toISOString() directly.
 */
function toLocalDateTimeNoTz(date: Date): string {
  // toISOString() always produces a UTC string ending with 'Z' — slicing it
  // off keeps the same instant value but in a format LocalDateTime accepts.
  return date.toISOString().slice(0, -1);
}

const CHAT_LIST_PAGE = 30;
const HISTORY_PAGE = 20;

interface ChatContextType {
  /** All chats loaded so far (most-recent first). */
  chats: ChatDto[];
  totalChats: number;
  hasMoreChats: boolean;
  isLoadingChats: boolean;
  chatsError: string | null;

  /** Currently active chat or null = "new chat draft". */
  currentChatId: string | null;
  /** Messages of the current chat (oldest -> newest) ready for rendering. */
  currentMessages: ChatMessage[];
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  messagesError: string | null;

  selectChat: (chatId: string) => void;
  startNewChat: () => void;
  loadMoreChats: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refreshChats: () => Promise<void>;
  /**
   * Append messages to the currently active chat view.
   *
   * Use without opts for an optimistic local echo (e.g. user message before
   * /proceed responds). Pass opts.chatId to also adopt a chat id from the
   * server response — the sidebar gets updated/prepended when refreshList=true.
   *
   * If the backend doesn't return a chatId, callers should still call this
   * with no chatId so the messages are at least visible in the current view
   * (PCAI-143).
   */
  appendMessages: (
    messages: ChatMessage[],
    opts?: { chatId?: string | null; refreshList?: boolean },
  ) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, authData } = useAuthContext();

  // Chat list
  const [chats, setChats] = useState<ChatDto[]>([]);
  const [totalChats, setTotalChats] = useState(0);
  const [chatsOffset, setChatsOffset] = useState(0);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);

  // Current chat & messages
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Track in-flight session to ignore stale responses on quick switches.
  const currentLoadTokenRef = useRef(0);

  const sessionKey = authData?.sessionId ?? null;

  const refreshChats = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingChats(true);
    setChatsError(null);
    try {
      const page = await chatsApi.listChats({ limit: CHAT_LIST_PAGE, offset: 0 });
      setChats(page.content);
      setChatsOffset(page.content.length);
      setTotalChats(page.totalElements);
    } catch (err) {
      console.error('Failed to load chats:', err);
      setChatsError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setIsLoadingChats(false);
    }
  }, [isAuthenticated]);

  const loadMoreChats = useCallback(async () => {
    if (!isAuthenticated || isLoadingChats) return;
    if (chatsOffset >= totalChats) return;
    setIsLoadingChats(true);
    setChatsError(null);
    try {
      const page = await chatsApi.listChats({ limit: CHAT_LIST_PAGE, offset: chatsOffset });
      setChats((prev) => [...prev, ...page.content]);
      setChatsOffset(chatsOffset + page.content.length);
      setTotalChats(page.totalElements);
    } catch (err) {
      console.error('Failed to load more chats:', err);
      setChatsError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setIsLoadingChats(false);
    }
  }, [chatsOffset, isAuthenticated, isLoadingChats, totalChats]);

  // Initial load on auth establishment, AND reload on session change
  // (covers Guest -> Steam login transition — PCAI-114).
  useEffect(() => {
    if (!isAuthenticated) {
      setChats([]);
      setChatsOffset(0);
      setTotalChats(0);
      setCurrentChatId(null);
      setCurrentMessages([]);
      setHasMoreMessages(false);
      return;
    }
    void refreshChats();
  }, [isAuthenticated, sessionKey, refreshChats]);

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
    setCurrentMessages([]);
    setMessagesError(null);
    setHasMoreMessages(false);

    const token = ++currentLoadTokenRef.current;
    setIsLoadingMessages(true);

    const before = toLocalDateTimeNoTz(new Date());
    chatsApi
      .getChatMessages(chatId, { before, limit: HISTORY_PAGE })
      .then((dtos) => {
        if (token !== currentLoadTokenRef.current) return; // stale
        // Backend returns DESC by createdAt — flip to ASC for chronological render.
        const sorted = [...dtos].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setCurrentMessages(sorted.map(fromChatMessageDto));
        setHasMoreMessages(dtos.length === HISTORY_PAGE);
      })
      .catch((err) => {
        if (token !== currentLoadTokenRef.current) return;
        console.error('Failed to load chat messages:', err);
        setMessagesError(err instanceof Error ? err.message : 'Failed to load messages');
      })
      .finally(() => {
        if (token !== currentLoadTokenRef.current) return;
        setIsLoadingMessages(false);
      });
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!currentChatId || isLoadingMoreMessages || !hasMoreMessages) return;
    if (currentMessages.length === 0) return;

    setIsLoadingMoreMessages(true);
    try {
      // Earliest currently-loaded message is at index 0 (ASC order).
      const before = toLocalDateTimeNoTz(currentMessages[0].timestamp);
      const dtos = await chatsApi.getChatMessages(currentChatId, {
        before,
        limit: HISTORY_PAGE,
      });
      const sorted = [...dtos].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setCurrentMessages((prev) => [...sorted.map(fromChatMessageDto), ...prev]);
      setHasMoreMessages(dtos.length === HISTORY_PAGE);
    } catch (err) {
      console.error('Failed to load more messages:', err);
      setMessagesError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [currentChatId, currentMessages, hasMoreMessages, isLoadingMoreMessages]);

  const startNewChat = useCallback(() => {
    setCurrentChatId(null);
    setCurrentMessages([]);
    setMessagesError(null);
    setHasMoreMessages(false);
  }, []);

  const appendMessages = useCallback(
    (
      messages: ChatMessage[],
      opts?: { chatId?: string | null; refreshList?: boolean },
    ) => {
      if (messages.length === 0) return;

      // 1) Optimistic local render — always.
      setCurrentMessages((prev) => [...prev, ...messages]);

      // 2) Adopt server-issued chatId, if any.
      if (opts?.chatId) {
        setCurrentChatId(opts.chatId);
      }

      // 3) Refresh sidebar entry only when requested AND we have a chatId.
      if (opts?.refreshList && opts.chatId) {
        // PCAI-151: prefer USER message text as preview — it's the actual
        // "topic" of the chat. AI replies are often a stub like
        // "Received N recommendations" and read poorly in the sidebar.
        const reversed = [...messages].reverse();
        const lastUser = reversed.find((m) => m.type === 'user' && m.content?.trim().length);
        const lastAny = reversed.find((m) => m.content?.trim().length);
        const previewSource = lastUser?.content ?? lastAny?.content ?? '';
        const preview =
          previewSource.length > 80 ? `${previewSource.slice(0, 77)}…` : previewSource;
        const nowIso = new Date().toISOString();
        const chatId = opts.chatId;

        setChats((prev) => {
          const existingIdx = prev.findIndex((c) => c.chatId === chatId);
          if (existingIdx >= 0) {
            const updated = {
              ...prev[existingIdx],
              updatedAt: nowIso,
              lastMessagePreview: preview || prev[existingIdx].lastMessagePreview,
            };
            return [updated, ...prev.filter((_, i) => i !== existingIdx)];
          }
          const newChat: ChatDto = {
            chatId,
            status: 'ACTIVE',
            updatedAt: nowIso,
            lastMessagePreview: preview,
          };
          setTotalChats((t) => t + 1);
          return [newChat, ...prev];
        });
      }
    },
    [],
  );

  const hasMoreChats = chatsOffset < totalChats;

  const value = useMemo<ChatContextType>(
    () => ({
      chats,
      totalChats,
      hasMoreChats,
      isLoadingChats,
      chatsError,
      currentChatId,
      currentMessages,
      isLoadingMessages,
      isLoadingMoreMessages,
      hasMoreMessages,
      messagesError,
      selectChat,
      startNewChat,
      loadMoreChats,
      loadMoreMessages,
      refreshChats,
      appendMessages,
    }),
    [
      chats,
      totalChats,
      hasMoreChats,
      isLoadingChats,
      chatsError,
      currentChatId,
      currentMessages,
      isLoadingMessages,
      isLoadingMoreMessages,
      hasMoreMessages,
      messagesError,
      selectChat,
      startNewChat,
      loadMoreChats,
      loadMoreMessages,
      refreshChats,
      appendMessages,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = (): ChatContextType => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
};
