import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface ReasoningBlockProps {
  text: string;
}

const COLLAPSE_THRESHOLD = 280;

/**
 * «Why these games» — метакомментарий ассистента про набор карточек.
 * Соответствует kind: "reasoning" в полиморфных items[] (см. api-contract.md §5.1).
 */
export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({ text }) => {
  const trimmed = text.trim();
  const [expanded, setExpanded] = useState(false);
  if (!trimmed) return null;

  const isLong = trimmed.length > COLLAPSE_THRESHOLD;
  const visible = !isLong || expanded
    ? trimmed
    : `${trimmed.slice(0, COLLAPSE_THRESHOLD).trimEnd()}…`;

  return (
    <div className="rounded-xl border border-purple-300/20 bg-gradient-to-br from-purple-500/10 to-blue-500/5 p-3 backdrop-blur-md">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-purple-300" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-purple-200/80">
          Why these games
        </span>
      </div>
      <AnimatePresence initial={false}>
        <motion.p
          key={expanded ? 'expanded' : 'collapsed'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap"
        >
          {visible}
        </motion.p>
      </AnimatePresence>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-purple-200/80 hover:text-purple-100 transition-colors"
        >
          {expanded ? (
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
  );
};
