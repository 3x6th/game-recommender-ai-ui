import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Heart, Zap, Shield } from 'lucide-react';
import { BurnoutLevel } from '../types';

interface BurnoutIndicatorProps {
  level: 'low' | 'medium' | 'high' | 'critical';
}

const burnoutConfig: Record<string, BurnoutLevel> = {
  low: {
    level: 'low',
    description: 'Feeling good!',
    color: 'text-green-400'
  },
  medium: {
    level: 'medium',
    description: 'Take it easy',
    color: 'text-yellow-400'
  },
  high: {
    level: 'high',
    description: 'Time for a break',
    color: 'text-orange-400'
  },
  critical: {
    level: 'critical',
    description: 'Rest needed',
    color: 'text-red-400'
  }
};

const getIcon = (level: string) => {
  switch (level) {
    case 'low': return <Shield className="h-4 w-4" />;
    case 'medium': return <Heart className="h-4 w-4" />;
    case 'high': return <Zap className="h-4 w-4" />;
    case 'critical': return <AlertTriangle className="h-4 w-4" />;
    default: return <Heart className="h-4 w-4" />;
  }
};

export const BurnoutIndicator: React.FC<BurnoutIndicatorProps> = ({ level }) => {
  const config = burnoutConfig[level];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-md"
    >
      <div className={config.color}>
        {getIcon(level)}
      </div>
      <div className="text-xs">
        <div className={`font-medium ${config.color}`}>
          {config.description}
        </div>
        <div className="text-zinc-400">
          Burnout Level: {level.toUpperCase()}
        </div>
      </div>
    </motion.div>
  );
};


