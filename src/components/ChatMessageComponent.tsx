import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bot,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { GameRecommendationCard } from './GameRecommendationCard';

interface ChatMessageComponentProps {
  message: ChatMessage;
  /**
   * Optional retry hook (PCAI-112). Shown only when message is an
   * error meta with payload.retryable=true.
   */
  onRetry?: (message: ChatMessage) => void;
}

/**
 * Length above which the reasoning block becomes collapsible.
 * Picked to roughly match 3 lines on desktop.
 */
const REASONING_COLLAPSE_THRESHOLD = 280;

export const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({ message, onRetry }) => {
  const reasoning = message.type === 'ai' ? message.reasoning?.trim() : undefined;
  const isLongReasoning = !!reasoning && reasoning.length > REASONING_COLLAPSE_THRESHOLD;
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  const isStatus = message.metaType === 'status' && !!message.status;
  const isError = message.metaType === 'error' && !!message.error;

  // PCAI-112: status messages are rendered as a slim chip rather than a full bubble.
  if (isStatus) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-start"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-xs text-blue-100 backdrop-blur-md">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{message.status?.message ?? message.content ?? message.status?.state ?? 'Working...'}</span>
          {message.status?.code && (
            <span className="ml-1 text-[10px] uppercase tracking-wide text-blue-200/70">
              {message.status.code}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

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
        {/* PCAI-112: error meta — distinct error card with optional retry. */}
        {isError ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 backdrop-blur-md">
            <div className="mb-1.5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-300" />
              <span className="text-xs font-semibold uppercase tracking-wide text-red-200">
                {message.error?.code ?? 'Error'}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-red-50 whitespace-pre-wrap">
              {message.error?.message ?? message.content}
            </p>
            {message.error?.retryable && onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300/30 bg-red-300/10 px-2.5 py-1 text-xs text-red-100 transition hover:border-red-300/60 hover:bg-red-300/20"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        ) : (
          <div
            className={`rounded-2xl px-4 py-3 ${
              message.type === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-zinc-200 border border-white/15 backdrop-blur-md'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* PCAI-139: aggregate explanation from the agent ("why these games"). */}
        {!isError && reasoning && (
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

        {!isError && message.recommendations && message.recommendations.length > 0 && (
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
