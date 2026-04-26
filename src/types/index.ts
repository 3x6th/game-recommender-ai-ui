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
}

export interface BurnoutLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  color: string;
}


