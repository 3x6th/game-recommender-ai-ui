import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { ChatMessage } from '../types';
import { GameRecommendationCard } from './GameRecommendationCard';

interface ChatMessageComponentProps {
  message: ChatMessage;
}

export const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({ message }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {message.type === 'ai' && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-2xl ${message.type === 'user' ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            message.type === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-white/10 text-zinc-200 border border-white/15 backdrop-blur-md'
          }`}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        
        {message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-4 space-y-3">
            {message.recommendations.map((game) => (
              <GameRecommendationCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
      
      {message.type === 'user' && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </motion.div>
  );
};

