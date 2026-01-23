import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_PHRASES = [
  'What to play?',
  'Во что поиграть?',
  '¿A qué jugar?',
  'À quoi jouer ?',
  '玩什么游戏？',
];

export const TypewriterPrompt: React.FC<{
  className?: string;
  phrases?: string[];
}> = ({ className = '', phrases }) => {
  const items = useMemo(() => (phrases && phrases.length > 0 ? phrases : DEFAULT_PHRASES), [phrases]);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    const t = window.setInterval(() => setCursorOn((v) => !v), 500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const current = items[phraseIndex % items.length] ?? '';

    const typeSpeedMs = isDeleting ? 35 : 55;
    const pauseAfterTypedMs = 1200;
    const pauseAfterDeletedMs = 350;

    let timer: number | null = null;

    if (!isDeleting) {
      if (text.length < current.length) {
        const nextLen = Math.min(current.length, text.length + 1);
        timer = window.setTimeout(() => setText(current.slice(0, nextLen)), typeSpeedMs);
      } else if (current.length > 0) {
        timer = window.setTimeout(() => setIsDeleting(true), pauseAfterTypedMs);
      }
    } else {
      if (text.length > 0) {
        const nextLen = Math.max(0, text.length - 1);
        timer = window.setTimeout(() => setText(current.slice(0, nextLen)), typeSpeedMs);
      } else {
        timer = window.setTimeout(() => {
          setIsDeleting(false);
          setPhraseIndex((i) => (i + 1) % items.length);
        }, pauseAfterDeletedMs);
      }
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isDeleting, items, phraseIndex, text]);

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className="text-zinc-200 text-base sm:text-lg">{text}</span>
      <span
        aria-hidden
        className={`inline-block h-5 w-[2px] bg-blue-400 transition-opacity ${cursorOn ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

