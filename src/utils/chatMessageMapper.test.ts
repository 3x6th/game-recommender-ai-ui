import { describe, expect, it } from 'vitest';
import { ChatMessageDto } from '../types';
import { fromChatMessageDto } from './chatMessageMapper';

describe('fromChatMessageDto', () => {
  it('keeps USER retry context from the reply envelope', () => {
    const dto: ChatMessageDto = {
      messageId: 'message-id',
      role: 'USER',
      content: 'Recommend something relaxing',
      createdAt: '2026-07-20T11:13:40.765Z',
      meta: {
        schemaVersion: 1,
        type: 'reply',
        payload: {
          text: 'Recommend something relaxing',
          clientRequestId: 'c33c693a-6f54-44c1-9136-136feed5d7aa',
          tags: ['Low-stress', 'Indie'],
        },
      },
    };

    const message = fromChatMessageDto(dto);

    expect(message.clientRequestId).toBe('c33c693a-6f54-44c1-9136-136feed5d7aa');
    expect(message.tags).toEqual(['Low-stress', 'Indie']);
  });
});
