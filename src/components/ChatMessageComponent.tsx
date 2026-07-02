import React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bot,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage, ChatMessageItem } from '../types';
import { GameRecommendationCard } from './GameRecommendationCard';
import { ReasoningBlock } from './ReasoningBlock';
import { TextBlock } from './TextBlock';

interface ChatMessageComponentProps {
  message: ChatMessage;
  /** Вызывается, когда пользователь жмёт retry на error-сообщении. */
  onRetry?: (message: ChatMessage) => void;
}

/**
 * Отрисовка одного сообщения чата.
 *
 * meta.type диктует форму:
 *  - status                 → тонкий чип (без аватара/пузыря)
 *  - error                  → красный блок + retry если retryable
 *  - cards                  → блоки items[] (reasoning / text / game / unknown)
 *  - reply                  → bubble с content
 *  - tool_call/tool_result  → скрываем из ленты (служебные шаги агента,
 *                             см. api-contract.md §4.6 / §4.7)
 *  - unknown                → fallback на content
 */
export const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({ message, onRetry }) => {
  const isStatus = message.metaType === 'status' && !!message.status;
  const isError = message.metaType === 'error' && !!message.error;
  const isHiddenAgentStep =
    message.metaType === 'tool_call' || message.metaType === 'tool_result';

  if (isHiddenAgentStep) {
    return null;
  }

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
          <>
            {message.content?.trim() && (
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
            {message.items && message.items.length > 0 && (
              <div className="mt-3 space-y-3">
                {[...message.items]
                  .sort((left, right) => ITEM_ORDER[left.kind] - ITEM_ORDER[right.kind])
                  .map((item, idx) => (
                    <ItemRenderer key={idx} item={item} />
                  ))}
              </div>
            )}
          </>
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

const ITEM_ORDER: Record<ChatMessageItem['kind'], number> = {
  text: 0,
  reasoning: 1,
  game: 2,
};

/**
 * Switch по `kind` — единственное место, где FE решает как отрисовать
 * элемент items[]. Незнакомые kind'ы отфильтровываются ещё в chatMessageMapper,
 * сюда попадают только известные → честное narrowing.
 */
const ItemRenderer: React.FC<{ item: ChatMessageItem }> = ({ item }) => {
  switch (item.kind) {
    case 'reasoning':
      return <ReasoningBlock text={item.text} />;
    case 'text':
      return <TextBlock text={item.text} />;
    case 'game':
      return <GameRecommendationCard game={item.game} />;
    default: {
      // Exhaustiveness check: если в union добавится новый kind без обработки —
      // TS подсветит ошибку именно здесь.
      const _exhaustive: never = item;
      void _exhaustive;
      return null;
    }
  }
};
