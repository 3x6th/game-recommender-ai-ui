import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatMessage } from '../types';
import { ChatMessageComponent } from './ChatMessageComponent';

describe('ChatMessageComponent', () => {
  it('keeps regular reply messages working', () => {
    const message: ChatMessage = {
      id: 'reply-1',
      type: 'ai',
      content: 'A regular assistant reply',
      timestamp: new Date('2026-07-02T10:00:00Z'),
      metaType: 'reply',
    };

    render(<ChatMessageComponent message={message} />);

    expect(screen.getByText('A regular assistant reply')).toBeInTheDocument();
  });

  it('renders composite cards in text, reasoning, game order', () => {
    const message: ChatMessage = {
      id: 'message-1',
      type: 'ai',
      content: '',
      timestamp: new Date('2026-07-02T10:00:00Z'),
      metaType: 'cards',
      items: [
        {
          kind: 'game',
          game: {
            title: 'Hades',
            genre: 'Roguelike',
            description: 'Escape the Underworld.',
            whyRecommended: 'Short, satisfying runs.',
            platforms: ['PC'],
            rating: 9.2,
            releaseYear: '2020',
          },
        },
        { kind: 'reasoning', text: 'Why this set works' },
        { kind: 'text', text: 'Your **recommendations** are ready.' },
      ],
    };

    const { container } = render(<ChatMessageComponent message={message} />);
    const text = screen.getByText('recommendations');
    const reasoning = screen.getByText('Why this set works');
    const game = screen.getByRole('heading', { name: 'Hades' });

    expect(text.compareDocumentPosition(reasoning) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(reasoning.compareDocumentPosition(game) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll('strong')).toHaveLength(1);
  });
});
