export interface GameRecommendation {
  title: string;
  genre: string;
  description: string;
  whyRecommended: string;
  platforms: string[];
  rating: number;
  releaseYear: string;
  steamUrl?: string;
}

// === Chat history (PCAI-115 / PCAI-140) + полиморфные items (PCAI-153) ===

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
export type ChatStatus = 'ACTIVE' | 'ARCHIVED';

export interface ChatDto {
  chatId: string;
  status: ChatStatus;
  /** ISO-8601 timestamp. */
  updatedAt: string;
  lastMessagePreview?: string;
}

export interface ChatPageResponse {
  content: ChatDto[];
  limit: number;
  offset: number;
  totalElements: number;
}

/**
 * Канонический meta envelope (PCAI-105/PCAI-111/PCAI-141/PCAI-153).
 * `mixed` снят, остаются reply / cards / status / error / tool_call / tool_result.
 * Незнакомые `type` — игнорируем (forward-compat для следующих релизов).
 */
export interface MetaEnvelope {
  schemaVersion: number;
  type: 'reply' | 'cards' | 'status' | 'error' | 'tool_call' | 'tool_result' | string;
  payload?: Record<string, unknown>;
}

export interface ChatMessageDto {
  messageId: string;
  role: MessageRole;
  content: string;
  meta?: MetaEnvelope | null;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

/**
 * Discriminated union для элементов внутри meta.payload.items[] (cards-сообщения).
 *
 * Незнакомые `kind` отфильтровываются ещё на уровне маппера — в render-модель
 * попадают только известные. Это даёт честное narrowing в switch. Когда BE
 * введёт новый kind (profile_review / clarifying_question / quick_replies),
 * добавляем здесь arm + ветку в маппере + ветку в ItemRenderer — всё в одном
 * типе-проверяемом месте.
 */
export type ChatMessageItem =
  | { kind: 'reasoning'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'game'; game: GameRecommendation };

/**
 * Render-модель сообщения для FE. Один тип для USER и ASSISTANT —
 * мапится из `ChatMessageDto` через `fromChatMessageDto` и для свежего ответа
 * /proceed, и для истории.
 */
export interface ChatMessage {
  id: string;
  /** Backend-side message id (если известен). */
  messageId?: string;
  type: 'user' | 'ai';
  /** Bubble-текст (для reply / error), для cards-сообщений пустой. */
  content: string;
  timestamp: Date;
  /** Тип meta-конверта, по которому рендерер выбирает форму. */
  metaType?: MetaEnvelope['type'];
  /** Полиморфные блоки (cards-сообщения). Рендерим switch по kind. */
  items?: ChatMessageItem[];
  /** Status-payload (PCAI-112): тонкий чип «thinking»/«searching». */
  status?: { code?: string; message?: string; state?: string };
  /** Error-payload (PCAI-112): красный блок + retry если retryable. */
  error?: { code?: string; message?: string; retryable?: boolean };
  /** Idempotency key of the USER turn; reused by Retry without duplicating it. */
  clientRequestId?: string;
  /** Tags captured when the USER turn was submitted. */
  tags?: string[];
}

export interface BurnoutLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  color: string;
}
