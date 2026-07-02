import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TextBlockProps {
  text: string;
}

const COLLAPSE_THRESHOLD = 500;

/**
 * Allow only links that cannot execute code in the browser. Relative links and
 * anchors are safe as well; every other scheme (javascript:, data:, vbscript:)
 * is removed from the rendered anchor.
 */
const safeUrlTransform = (url: string): string | undefined => {
  const value = url.trim();
  if (!value) return undefined;

  try {
    const parsed = new URL(value, 'https://playcure.local');
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return value;
    }
  } catch {
    // Invalid links are rendered as text without a clickable href.
  }

  return undefined;
};

/**
 * Нарративный текст ассистента — kind: "text" в items[].
 * Используется в составных ответах после tool-цикла, когда агент пишет
 * «вот что я нашёл» + карточки в одном сообщении (см. api-contract.md §5.3).
 *
 * Стилистически — лёгкий текстовый блок с акцентной линией, чтобы он не
 * конкурировал с игровыми карточками. Reasoning оформляется отдельно.
 */
export const TextBlock: React.FC<TextBlockProps> = ({ text }) => {
  const trimmed = text.trim();
  const [expanded, setExpanded] = React.useState(false);
  if (!trimmed) return null;

  const isLong = trimmed.length > COLLAPSE_THRESHOLD;

  return (
    <section className="relative border-l-2 border-blue-400/50 py-1 pl-4 pr-1 text-zinc-100">
      <div
        data-testid="text-block-content"
        className={`relative transition-[max-height] duration-200 ${
          isLong && !expanded ? 'max-h-48 overflow-hidden' : 'max-h-none'
        }`}
      >
        <ReactMarkdown
          skipHtml
          allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br']}
          unwrapDisallowed
          urlTransform={safeUrlTransform}
          components={{
            p: ({ children }) => (
              <p className="mb-2 text-sm leading-relaxed last:mb-0">{children}</p>
            ),
            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => (
              <ul className="mb-2 list-disc space-y-1 pl-5 text-sm leading-relaxed last:mb-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed last:mb-0">{children}</ol>
            ),
            li: ({ children }) => <li className="pl-0.5">{children}</li>,
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 underline decoration-blue-300/50 underline-offset-2 transition-colors hover:text-blue-200"
              >
                {children}
              </a>
            ),
          }}
        >
          {trimmed}
        </ReactMarkdown>
        {isLong && !expanded && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/90 to-transparent"
          />
        )}
      </div>

      {isLong && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-300 transition-colors hover:text-blue-200"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Показать ещё
            </>
          )}
        </button>
      )}
    </section>
  );
};
