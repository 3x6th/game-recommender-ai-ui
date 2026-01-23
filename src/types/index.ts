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
}

export interface BurnoutLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  color: string;
}


