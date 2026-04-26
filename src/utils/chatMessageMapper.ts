import { ChatMessage, ChatMessageDto, GameRecommendation, MetaEnvelope } from '../types';

/**
 * Build a Steam search URL for a card title.
 * Used as a fallback when meta payload doesn't carry a steamUrl.
 */
function steamSearchUrl(title: string): string {
  return `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`;
}

interface CardItem {
  title?: string;
  genre?: string;
  description?: string;
  whyRecommended?: string;
  why_recommended?: string;
  platforms?: string[];
  rating?: number;
  releaseYear?: string;
  release_year?: string;
  steamUrl?: string;
  steam_url?: string;
}

function toGameRecommendation(item: CardItem): GameRecommendation {
  const title = item.title ?? '';
  return {
    title,
    genre: item.genre ?? '',
    description: item.description ?? '',
    whyRecommended: item.whyRecommended ?? item.why_recommended ?? '',
    platforms: item.platforms ?? [],
    rating: typeof item.rating === 'number' ? item.rating : 0,
    releaseYear: item.releaseYear ?? item.release_year ?? '',
    steamUrl: item.steamUrl ?? item.steam_url ?? steamSearchUrl(title),
  };
}

/**
 * Convert backend ChatMessageDto (history read API) into the FE ChatMessage shape
 * used by ChatMessageComponent.
 *
 * Full meta.type support (PCAI-112):
 *   - reply           -> plain text content
 *   - cards / mixed   -> payload.items rendered as recommendation cards;
 *                        payload.reasoning rendered as the "why these games" block
 *   - status          -> status chip above the bubble (payload.message / .state / .code)
 *   - error           -> error block; payload.retryable -> retry button
 *   - unknown / null  -> fallback to plain content (forward compatibility)
 */
export function fromChatMessageDto(dto: ChatMessageDto): ChatMessage {
  const meta = dto.meta as MetaEnvelope | null | undefined;
  const type: ChatMessage['type'] = dto.role === 'USER' ? 'user' : 'ai';

  let recommendations: GameRecommendation[] | undefined;
  let reasoning: string | undefined;
  let status: ChatMessage['status'];
  let errorPayload: ChatMessage['error'];

  if (meta && meta.payload) {
    const payload = meta.payload as Record<string, unknown>;

    if (meta.type === 'cards' || meta.type === 'mixed') {
      const items = (payload.items as CardItem[] | undefined) ?? [];
      if (Array.isArray(items) && items.length > 0) {
        recommendations = items.map(toGameRecommendation);
      }
      const r = payload.reasoning;
      if (typeof r === 'string' && r.trim().length > 0) {
        reasoning = r;
      }
    } else if (meta.type === 'status') {
      status = {
        code: typeof payload.code === 'string' ? payload.code : undefined,
        message: typeof payload.message === 'string' ? payload.message : undefined,
        state: typeof payload.state === 'string' ? payload.state : undefined,
      };
    } else if (meta.type === 'error') {
      errorPayload = {
        code: typeof payload.code === 'string' ? payload.code : undefined,
        message: typeof payload.message === 'string' ? payload.message : undefined,
        retryable: payload.retryable === true,
      };
    }
    // reply / unknown -> nothing extra; content is rendered by default.
  }

  return {
    id: dto.messageId,
    messageId: dto.messageId,
    type,
    content: dto.content ?? '',
    timestamp: new Date(dto.createdAt),
    recommendations,
    reasoning,
    metaType: meta?.type,
    status,
    error: errorPayload,
  };
}
