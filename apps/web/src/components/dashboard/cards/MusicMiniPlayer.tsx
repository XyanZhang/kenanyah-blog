'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiMusic } from 'react-icons/fi';
import { MusicCardConfig } from '@blog/types';

interface MusicMiniPlayerProps {
  config: MusicCardConfig;
}

export function MusicMiniPlayer({ config }: MusicMiniPlayerProps) {
  // 播放列表支持
  const playlist = config.playlist || [];
  const hasPlaylist = playlist.length > 0;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(config.autoPlay || false);
  const [progress, setProgress] = useState(0);
  const [, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(215);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 获取当前播放的音频
  const currentTrack = hasPlaylist ? playlist[currentIndex] : null;
  const currentAudioUrl = currentTrack?.audioUrl || config.audioUrl || '';
  const currentTitle = currentTrack?.title || config.title || '未知曲目';

  // 播放下一首
  const playNext = () => {
    if (hasPlaylist && playlist.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
      setIsPlaying(true);
    }
  };

  // 播放上一首
  const playPrevious = () => {
    if (hasPlaylist && playlist.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
      setIsPlaying(true);
    }
  };

  // 音频加载时获取时长
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 215);
    }
  };

  // 播放完毕时自动播放下一首
  const handleEnded = () => {
    if (hasPlaylist && playlist.length > 1) {
      playNext();
    } else {
      setIsPlaying(false);
    }
  };

  // 切换播放状态
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // 切换歌曲时重新加载
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentAudioUrl]);

  const handleProgress = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || duration;
      setCurrentTime(current);
      setProgress((current / total) * 100);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = percentage * (audioRef.current.duration || duration);
    }
  };

  const togglePlay = () => {
    if (!currentAudioUrl) return;
    setIsPlaying(!isPlaying);
  };

  return (
    <motion.div
      className="w-full h-full rounded-2xl overflow-hidden relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <audio
        ref={audioRef}
        src={currentAudioUrl}
        onTimeUpdate={handleProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* 背景 */}
      <div className="absolute inset-0 bg-gradient-to-r from-theme-accent-primary/90 to-theme-accent-secondary/80" />

      <div className="relative z-10 h-full flex items-center px-4 gap-3">
        {/* 音乐图标 + 播放按钮 */}
        <motion.button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 hover:bg-white/30 transition-colors"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          {isPlaying ? (
            <FiPause className="text-white" size={18} />
          ) : (
            <FiPlay className="text-white ml-0.5" size={18} />
          )}
        </motion.button>

        {/* 歌曲信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FiMusic className="text-white/80 flex-shrink-0" size={14} />
            <span className="text-white text-sm font-medium truncate">
              {currentTitle}
            </span>
          </div>

          {/* 播放进度条 */}
          {config.showProgress !== false && (
            <div
              className="mt-1.5 h-1 bg-white/30 rounded-full cursor-pointer overflow-hidden group"
              onClick={handleSeek}
            >
              <motion.div
                className="h-full bg-white rounded-full"
                style={{ width: `${progress}%` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          )}
        </div>

        {/* 播放列表导航 (仅在有播放列表时显示) */}
        {hasPlaylist && playlist.length > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={playPrevious}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="上一首"
            >
              <FiPlay className="text-white text-xs rotate-180" />
            </button>
            <button
              onClick={playNext}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="下一首"
            >
              <FiPlay className="text-white text-xs" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
