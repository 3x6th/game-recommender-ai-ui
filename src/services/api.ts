import axios from 'axios';
import { GameRecommendation, ChatMessage } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface GameRecommendationRequest {
  query?: string;
  preferences: string[];
  burnoutLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface GameRecommendationResponse {
  message: string;
  recommendations: GameRecommendation[];
  burnoutLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const gameRecommendationApi = {
  async getRecommendations(request: GameRecommendationRequest): Promise<GameRecommendationResponse> {
    try {
      const response = await api.post<GameRecommendationResponse>('/recommendations', request);
      return response.data;
    } catch (error) {
      console.error('Error fetching game recommendations:', error);
      throw new Error('Failed to get game recommendations');
    }
  },

  async sendMessage(message: string, preferences: string[]): Promise<ChatMessage> {
    try {
      const response = await api.post<ChatMessage>('/chat', {
        message,
        preferences,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
};

export default api;
