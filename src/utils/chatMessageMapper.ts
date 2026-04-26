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
 * Base meta.type support (PCAI-140):
 *   - cards / mixed -> payload.items rendered as recommendation cards;
 *                      payload.reasoning rendered as the "why these games" block
 *   - reply / status / error / unknown -> plain content (full UX for status/error
 *                      lives in PCAI-112)
 */
export function fromChatMessageDto(dto: ChatMessageDto): ChatMessage {
  const meta = dto.meta as MetaEnvelope | null | undefined;
  const type: ChatMessage['type'] = dto.role === 'USER' ? 'user' : 'ai';

  let recommendations: GameRecommendation[] | undefined;
  let reasoning: string | undefined;

  if (meta && (meta.type === 'cards' || meta.type === 'mixed') && meta.payload) {
    const payload = meta.payload as { items?: CardItem[]; reasoning?: string };
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      recommendations = payload.items.map(toGameRecommendation);
    }
    if (typeof payload.reasoning === 'string' && payload.reasoning.trim().length > 0) {
      reasoning = payload.reasoning;
    }
  }

  return {
    id: dto.messageId,
    messageId: dto.messageId,
    type,
    content: dto.content ?? '',
    timestamp: new Date(dto.createdAt),
    recommendations,
    reasoning,
  };
}
