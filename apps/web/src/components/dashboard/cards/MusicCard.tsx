'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiSkipBack, FiSkipForward, FiMusic } from 'react-icons/fi';
import { DashboardCard as DashboardCardType, MusicCardConfig } from '@blog/types';

interface MusicCardProps {
  card: DashboardCardType;
}

interface MusicVisualizerProps {
  isPlaying: boolean;
  color: string;
}

function MusicVisualizer({ isPlaying, color }: MusicVisualizerProps) {
  return (
    <div className="flex items-end justify-center gap-1 h-12">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-2 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            height: isPlaying ? [8, 24, 12, 32, 16, 28, 8] : 8,
          }}
          transition={{
            duration: isPlaying ? 0.8 : 0.3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

function RotatingDisc({ isPlaying, coverUrl }: { isPlaying: boolean; coverUrl?: string }) {
  return (
    <div className="relative">
      <motion.div
        className="w-20 h-20 rounded-full overflow-hidden shadow-lg border-4 border-white/20"
        animate={{ rotate: isPlaying ? 360 : 0 }}
        transition={{
          rotate: { duration: isPlaying ? 10 : 0.3, repeat: Infinity, ease: 'linear' },
        }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-theme-accent-primary to-theme-accent-secondary flex items-center justify-center">
            <FiMusic size={32} className="text-white" />
          </div>
        )}
      </motion.div>
      <motion.div
        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center"
        animate={{ scale: isPlaying ? [1, 1.1, 1] : 1 }}
        transition={{ duration: isPlaying ? 1 : 0.3, repeat: Infinity }}
      >
        <div className="w-2 h-2 rounded-full bg-theme-accent-primary" />
      </motion.div>
    </div>
  );
}

export function MusicCard({ card }: MusicCardProps) {
  const config = card.config as MusicCardConfig;
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(215);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, audioRef.current.duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  return (
    <motion.div
      className="w-full h-full rounded-3xl relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <audio ref={audioRef} src={config.audioUrl} onTimeUpdate={handleProgress} onEnded={() => setIsPlaying(false)} />

      <div className="absolute inset-0 bg-gradient-to-br from-theme-accent-primary/90 via-theme-accent-secondary/80 to-theme-accent-tertiary/70" />

      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10 blur-xl"
            style={{
              width: 30 + Math.random() * 50,
              height: 30 + Math.random() * 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
            }}
            animate={{
              x: [0, 20, -20, 0],
              y: [0, -15, 15, 0],
              scale: [1, 1.3, 0.8, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full flex flex-col p-5">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
            <FiMusic className="text-white" size={20} />
          </div>
          <span className="text-white/80 font-medium text-sm">Now Playing</span>
        </motion.div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <RotatingDisc isPlaying={isPlaying} coverUrl={config.coverUrl} />

          <motion.div
            className="text-center"
            animate={{ y: isPlaying ? [0, -3, 0] : 0 }}
            transition={{ duration: isPlaying ? 3 : 0.3, repeat: Infinity }}
          >
            <h3 className="text-lg font-bold text-white mb-1 truncate max-w-[200px]">{config.title || '未知曲目'}</h3>
            {config.artist && <p className="text-sm text-white/70">{config.artist}</p>}
          </motion.div>

          <MusicVisualizer isPlaying={isPlaying} color="rgba(255,255,255,0.6)" />
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4"
        >
          {config.showProgress !== false && (
            <div
              className="h-1.5 bg-white/30 rounded-full cursor-pointer overflow-hidden mb-3"
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

          <div className="flex items-center justify-between text-white/80">
            <span className="text-xs font-mono">{formatTime(currentTime)}</span>

            <div className="flex items-center gap-4">
              <button
                onClick={skipBackward}
                className="hover:text-white transition-colors p-1"
                aria-label="Skip backward 10 seconds"
              >
                <FiSkipBack size={18} />
              </button>

              <motion.button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-white text-theme-accent-primary flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                {isPlaying ? <FiPause size={22} /> : <FiPlay size={22} className="ml-1" />}
              </motion.button>

              <button
                onClick={skipForward}
                className="hover:text-white transition-colors p-1"
                aria-label="Skip forward 10 seconds"
              >
                <FiSkipForward size={18} />
              </button>
            </div>

            {config.showVolume !== false && (
              <div className="flex items-center gap-2 group">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-white transition-colors p-1"
                >
                  {isMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
                </button>
                <motion.div
                  className="w-0 overflow-hidden group-hover:w-20 transition-all duration-300"
                  animate={{ width: isMuted ? 0 : (volume > 0 ? 60 : 0) }}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      if (Number(e.target.value) > 0) setIsMuted(false);
                    }}
                    className="w-16 h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        className="absolute top-3 right-3 w-10 h-10 opacity-40"
        animate={{ rotate: isPlaying ? 360 : 0 }}
        transition={{ duration: isPlaying ? 20 : 0.3, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-white">
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="19" r="2" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
          <circle cx="6.5" cy="6.5" r="1.5" />
          <circle cx="17.5" cy="6.5" r="1.5" />
          <circle cx="6.5" cy="17.5" r="1.5" />
          <circle cx="17.5" cy="17.5" r="1.5" />
        </svg>
      </motion.div>
    </motion.div>
  );
}
