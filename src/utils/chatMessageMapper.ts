import {
  ChatMessage,
  ChatMessageDto,
  ChatMessageItem,
  GameRecommendation,
  MetaEnvelope,
} from '../types';

/**
 * Steam-fallback URL по названию игры. Используется, пока в контракте нет
 * Steam-обогащения карточки (см. api-contract.md §5.2 — gameId/storeUrl/imageUrl
 * НЕ входят в DTO). Когда BE начнёт отдавать `storeUrl` — этот fallback станет
 * мёртвым и будет удалён.
 */
function steamSearchUrl(title: string): string {
  return `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`;
}

interface RawCard {
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

function toGameRecommendation(raw: RawCard): GameRecommendation {
  const title = raw.title ?? '';
  return {
    title,
    genre: raw.genre ?? '',
    description: raw.description ?? '',
    whyRecommended: raw.whyRecommended ?? raw.why_recommended ?? '',
    platforms: raw.platforms ?? [],
    rating: typeof raw.rating === 'number' ? raw.rating : 0,
    releaseYear: raw.releaseYear ?? raw.release_year ?? '',
    steamUrl: raw.steamUrl ?? raw.steam_url ?? steamSearchUrl(title),
  };
}

/**
 * Парсит payload.items[] полиморфно по полю `kind` (контракт §5).
 * Незнакомые kind пропускаются — это сознательный forward-compat:
 * BE может добавить новые kind (profile_review, clarifying_question и т.п.),
 * старый клиент не должен падать.
 */
function parseItems(rawItems: unknown): ChatMessageItem[] | undefined {
  if (!Array.isArray(rawItems)) return undefined;
  const out: ChatMessageItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const kind = typeof item.kind === 'string' ? item.kind : undefined;
    if (!kind) continue;

    if (kind === 'reasoning' && typeof item.text === 'string') {
      out.push({ kind: 'reasoning', text: item.text });
      continue;
    }
    if (kind === 'text' && typeof item.text === 'string') {
      out.push({ kind: 'text', text: item.text });
      continue;
    }
    if (kind === 'game') {
      out.push({ kind: 'game', game: toGameRecommendation(item as RawCard) });
      continue;
    }
    // Незнакомый kind — тихо пропускаем (forward-compat: BE может ввести
    // profile_review / clarifying_question / quick_replies, старый клиент
    // не падает).
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Конвертирует `ChatMessageDto` (envelope из /proceed и /chats/{id}/messages)
 * в render-модель FE. Один путь и для свежих ответов /proceed, и для истории.
 *
 * meta.type:
 *  - reply       → bubble с content
 *  - cards       → items[] полиморфно (reasoning / text / game / unknown)
 *  - status      → тонкий чип
 *  - error       → красный блок с retry если retryable
 *  - tool_call   → деталь LangChain-цикла, по умолчанию НЕ показываем (контракт §4.6)
 *  - tool_result → ответ инструмента, НЕ показываем (контракт §4.7)
 *  - unknown     → fallback на content
 */
export function fromChatMessageDto(dto: ChatMessageDto): ChatMessage {
  const meta = dto.meta as MetaEnvelope | null | undefined;
  const type: ChatMessage['type'] = dto.role === 'USER' ? 'user' : 'ai';

  let items: ChatMessageItem[] | undefined;
  let status: ChatMessage['status'];
  let errorPayload: ChatMessage['error'];
  let clientRequestId: string | undefined;
  let tags: string[] | undefined;
  let content = dto.content ?? '';

  if (meta?.payload) {
    const payload = meta.payload as Record<string, unknown>;

    if (dto.role === 'USER') {
      clientRequestId =
        typeof payload.clientRequestId === 'string' ? payload.clientRequestId : undefined;
      tags = Array.isArray(payload.tags)
        ? payload.tags.filter((tag): tag is string => typeof tag === 'string')
        : undefined;
    }

    if (meta.type === 'cards') {
      items = parseItems(payload.items);
      // Для cards content по контракту пуст — всё содержимое в items[].
      content = '';
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
    // reply / tool_call / tool_result / unknown → ничего лишнего; content рендерится сам.
  }

  return {
    id: dto.messageId,
    messageId: dto.messageId,
    type,
    content,
    timestamp: new Date(dto.createdAt),
    metaType: meta?.type,
    items,
    status,
    error: errorPayload,
    clientRequestId,
    tags,
  };
}
