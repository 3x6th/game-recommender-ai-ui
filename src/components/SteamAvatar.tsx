import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';

interface SteamAvatarProps {
  avatarUrl: string | null;
  steamId?: string;
  size?: 'sm' | 'md';
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
} as const;

export function SteamAvatar({ avatarUrl, steamId, size = 'md' }: SteamAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl, steamId]);

  if (!avatarUrl || imageFailed) {
    return (
      <span
        className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-green-500 to-blue-600 text-white`}
        role="img"
        aria-label="Steam avatar fallback"
      >
        <UserRound className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={steamId ? `Steam avatar for ${steamId}` : 'Steam avatar'}
      className={`${sizeClass} shrink-0 rounded-full border border-white/15 object-cover`}
      onError={() => setImageFailed(true)}
    />
  );
}
