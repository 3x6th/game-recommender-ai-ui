export interface GameRecommendation {
  id: string;
  title: string;
  description: string;
  confidence: number;
  reasons: string[];
  tags: string[];
  imageUrl?: string;
  steamUrl?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  recommendations?: GameRecommendation[];
}

export interface BurnoutLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  color: string;
}
