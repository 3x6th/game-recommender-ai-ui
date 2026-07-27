import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('shows the Steam avatar next to a user message', () => {
    const message: ChatMessage = {
      id: 'user-1',
      type: 'user',
      content: 'Recommend something new',
      timestamp: new Date('2026-07-02T10:00:00Z'),
    };

    render(
      <ChatMessageComponent
        message={message}
        userAvatarUrl="https://cdn.example/avatar.jpg"
        userSteamId="76561198000000000"
      />,
    );

    expect(screen.getByRole('img', { name: 'Steam avatar for 76561198000000000' })).toHaveAttribute(
      'src',
      'https://cdn.example/avatar.jpg',
    );
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

  it('passes the retryable error message to the retry handler', () => {
    const onRetry = vi.fn();
    const message: ChatMessage = {
      id: 'error-1',
      type: 'ai',
      content: 'AI is temporarily unavailable',
      timestamp: new Date('2026-07-20T11:13:44Z'),
      metaType: 'error',
      error: {
        code: 'AI_UNAVAILABLE',
        message: 'AI is temporarily unavailable',
        retryable: true,
      },
    };

    render(<ChatMessageComponent message={message} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledWith(message);
  });
});
