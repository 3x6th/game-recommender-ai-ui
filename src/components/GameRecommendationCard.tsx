import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Star } from 'lucide-react';
import { GameRecommendation } from '../types';

interface GameRecommendationCardProps {
  game: GameRecommendation;
}

export const GameRecommendationCard: React.FC<GameRecommendationCardProps> = ({ game }) => {
  const steamSearchUrl =
    game.steamUrl ?? `https://store.steampowered.com/search/?term=${encodeURIComponent(game.title)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-xl border border-white/15 bg-white/5 backdrop-blur-md p-4 hover:bg-white/10 transition-all duration-200"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 pr-3">
          <h3 className="text-lg font-semibold text-white truncate">{game.title}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
              {game.genre}
            </span>
            {game.releaseYear && (
              <span className="text-zinc-500">• {game.releaseYear}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-yellow-400">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-medium">
            {Number.isFinite(game.rating) ? game.rating.toFixed(1) : '—'}
          </span>
        </div>
      </div>
      
      <p className="text-zinc-300 text-sm mb-3 leading-relaxed">
        {game.description}
      </p>
      
      <div className="mb-3">
        <h4 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
          Why this game:
        </h4>
        <p className="text-xs text-zinc-300 leading-relaxed">{game.whyRecommended}</p>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {game.platforms.map((platform, index) => (
          <span
            key={`${platform}-${index}`}
            className="px-2 py-1 text-xs bg-white/10 rounded-full text-zinc-300 border border-white/10"
          >
            {platform}
          </span>
        ))}
      </div>
      
      <a
        href={steamSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        <span>View on Steam</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    </motion.div>
  );
};


