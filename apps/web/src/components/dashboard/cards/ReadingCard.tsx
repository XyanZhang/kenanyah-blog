'use client';

import { motion } from 'framer-motion';
import { Calendar, Flame, CheckCircle, Clock, PauseCircle } from 'lucide-react';
import { DashboardCard as DashboardCardType, ReadingCardConfig } from '@blog/types';

interface ReadingCardProps {
  card: DashboardCardType;
}

interface StatusConfig {
  icon: React.ComponentType<{ size?: number; className?: string; }>;
  color: string;
  bg: string;
  label: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  reading: { icon: Clock, color: 'text-accent-primary', bg: 'bg-accent-primary/20', label: '在读' },
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20', label: '已读' },
  paused: { icon: PauseCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: '暂停' },
};

export function ReadingCard({ card }: ReadingCardProps) {
  const config = card.config as ReadingCardConfig;
  const progress = config.totalPages > 0 ? (config.currentPage / config.totalPages) * 100 : 0;
  const statusConfig = STATUS_CONFIG[config.status];
  const StatusIcon = statusConfig.icon;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
            <StatusIcon className={statusConfig.color} size={18} />
          </div>
          <span className={`text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        {config.showStreak && config.streak > 0 && (
          <motion.div
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 text-orange-500"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <Flame size={14} fill="currentColor" />
            <span className="text-sm font-bold">{config.streak}天</span>
          </motion.div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {config.coverUrl && (
          <motion.div
            className="w-20 h-28 mx-auto mb-4 rounded-lg overflow-hidden shadow-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <img
              src={config.coverUrl}
              alt={config.bookTitle}
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-bold text-content-primary leading-tight mb-1 line-clamp-2">
            {config.bookTitle || '书名'}
          </h3>
          {config.showAuthor && (
            <p className="text-sm text-content-secondary">
              {config.author || '作者'}
            </p>
          )}
        </motion.div>

        {config.showProgress && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex justify-between text-xs text-content-secondary mb-1">
              <span>{config.currentPage}页</span>
              <span>/ {config.totalPages}页</span>
            </div>
            <div className="h-2 bg-line-glass rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-center text-xs text-content-secondary mt-1">
              {progress.toFixed(1)}%
            </p>
          </motion.div>
        )}
      </div>

      <motion.div
        className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-line-glass"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Calendar size={14} className="text-content-secondary" />
        <span className="text-xs text-content-secondary">
          {config.status === 'completed' && config.finishDate
            ? `完成于 ${formatDate(config.finishDate)}`
            : config.startDate
            ? `开始于 ${formatDate(config.startDate)}`
            : '开始阅读'}
        </span>
      </motion.div>
    </div>
  );
}
