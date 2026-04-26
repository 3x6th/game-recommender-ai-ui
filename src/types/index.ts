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

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  recommendations?: GameRecommendation[];
  /** Aggregate explanation from the agent — why these games (PCAI-133/PCAI-139). */
  reasoning?: string;
  /** Backend-side message id (assistantMessageId from /proceed or messageId from history). */
  messageId?: string;
  /**
   * Meta envelope kind, normalized for the renderer (PCAI-112).
   * Set only when backend supplies meta (history reads). Live /proceed
   * responses are mapped to 'reply' / 'cards' / 'mixed' implicitly.
   */
  metaType?: MetaEnvelope['type'];
  /**
   * Status payload (PCAI-112): when metaType === 'status' the renderer
   * shows a state chip ("thinking", "searching", ...) above the bubble.
   */
  status?: { code?: string; message?: string; state?: string };
  /**
   * Error payload (PCAI-112): when metaType === 'error' the renderer shows
   * an error card; if retryable=true a retry button is shown.
   */
  error?: { code?: string; message?: string; retryable?: boolean };
}

export interface BurnoutLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  color: string;
}

// === Chat history (PCAI-115 / PCAI-140) ===

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
 * Canonical meta envelope for chat messages (PCAI-105/PCAI-111).
 * Backend returns this on history reads. /proceed currently uses the legacy
 * GameRecommendationResponse shape — meta is built only by the read API.
 */
export interface MetaEnvelope {
  schemaVersion: number;
  type: 'reply' | 'cards' | 'mixed' | 'status' | 'error' | string;
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


