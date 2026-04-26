import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ChatMessage } from '../types';
import { GameRecommendationCard } from './GameRecommendationCard';

interface ChatMessageComponentProps {
  message: ChatMessage;
}

/**
 * Length above which the reasoning block becomes collapsible.
 * Picked to roughly match 3 lines on desktop.
 */
const REASONING_COLLAPSE_THRESHOLD = 280;

export const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({ message }) => {
  const reasoning = message.type === 'ai' ? message.reasoning?.trim() : undefined;
  const isLongReasoning = !!reasoning && reasoning.length > REASONING_COLLAPSE_THRESHOLD;
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

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
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* PCAI-139: aggregate explanation from the agent ("why these games"). */}
        {reasoning && (
          <div className="mt-3 rounded-xl border border-purple-300/20 bg-gradient-to-br from-purple-500/10 to-blue-500/5 p-3 backdrop-blur-md">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-purple-200/80">
                Why these games
              </span>
            </div>
            <AnimatePresence initial={false}>
              <motion.p
                key={reasoningExpanded ? 'expanded' : 'collapsed'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap"
              >
                {!isLongReasoning || reasoningExpanded
                  ? reasoning
                  : `${reasoning.slice(0, REASONING_COLLAPSE_THRESHOLD).trimEnd()}…`}
              </motion.p>
            </AnimatePresence>
            {isLongReasoning && (
              <button
                type="button"
                onClick={() => setReasoningExpanded((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-purple-200/80 hover:text-purple-100 transition-colors"
              >
                {reasoningExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Show more
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-4 space-y-3">
            {message.recommendations.map((game, idx) => (
              <GameRecommendationCard key={`${game.title}-${idx}`} game={game} />
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

