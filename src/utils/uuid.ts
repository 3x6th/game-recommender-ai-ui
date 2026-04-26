/**
 * UUID v4 generator with fallback for environments without crypto.randomUUID
 * (older browsers, non-secure contexts).
 *
 * Used for clientRequestId on POST /api/v1/games/proceed (PCAI-116/138)
 * to make the call idempotent: replay of the same request must not create
 * a duplicate USER message on backend.
 */
export function generateUUID(): string {
  // Prefer the native, cryptographically strong implementation when available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: RFC4122 v4 using getRandomValues if available, else Math.random
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }

  // Last-resort fallback (non-secure contexts, very old browsers).
  // Sufficient for idempotency keys but NOT cryptographically strong.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
