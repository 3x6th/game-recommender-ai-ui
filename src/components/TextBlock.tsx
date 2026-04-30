import React from 'react';

interface TextBlockProps {
  text: string;
}

/**
 * Нарративный текст ассистента — kind: "text" в items[].
 * Используется в составных ответах после tool-цикла, когда агент пишет
 * «вот что я нашёл» + карточки в одном сообщении (см. api-contract.md §5.3).
 *
 * Стилистически — обычный chat-bubble без декораций. Reasoning отдельно.
 */
export const TextBlock: React.FC<TextBlockProps> = ({ text }) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return (
    <div className="rounded-2xl px-4 py-3 bg-white/10 text-zinc-200 border border-white/15 backdrop-blur-md">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{trimmed}</p>
    </div>
  );
};
