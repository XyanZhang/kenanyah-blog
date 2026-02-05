'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WiHumidity, WiStrongWind } from 'react-icons/wi';
import { DashboardCard as DashboardCardType, WeatherCardConfig } from '@blog/types';
import { clsx } from 'clsx';
import { useGeolocation } from '@/hooks/useGeolocation';

interface WeatherApiData {
  temperature: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  city?: string;
}

const weatherThemes = {
  sunny: {
    bgGradient: 'from-sky-300 via-amber-100 to-yellow-100',
    sunColor: '#FBBF24',
    cloudColor: '#FEF3C7',
    accentColor: 'text-amber-500',
    bgElement: 'bg-yellow-200',
  },
  cloudy: {
    bgGradient: 'from-slate-300 via-gray-200 to-zinc-100',
    sunColor: '#94A3B8',
    cloudColor: '#E2E8F0',
    accentColor: 'text-slate-500',
    bgElement: 'bg-slate-200',
  },
  rainy: {
    bgGradient: 'from-blue-300 via-indigo-200 to-cyan-100',
    sunColor: '#60A5FA',
    cloudColor: '#BFDBFE',
    accentColor: 'text-blue-500',
    bgElement: 'bg-blue-200',
  },
  snowy: {
    bgGradient: 'from-cyan-200 via-blue-100 to-white',
    sunColor: '#A5F3FC',
    cloudColor: '#E0F2FE',
    accentColor: 'text-cyan-500',
    bgElement: 'bg-cyan-100',
  },
  stormy: {
    bgGradient: 'from-purple-400 via-indigo-300 to-slate-200',
    sunColor: '#A78BFA',
    cloudColor: '#C4B5FD',
    accentColor: 'text-purple-500',
    bgElement: 'bg-purple-200',
  },
  foggy: {
    bgGradient: 'from-zinc-300 via-gray-200 to-slate-100',
    sunColor: '#A1A1AA',
    cloudColor: '#D4D4D8',
    accentColor: 'text-gray-500',
    bgElement: 'bg-gray-200',
  },
};

function Sun({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute"
      animate={{
        rotate: 360,
        scale: [1, 1.1, 1],
      }}
      transition={{
        rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
        scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }}
      style={{ color }}
    >
      <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="6" />
        {[...Array(8)].map((_, i) => (
          <line
            key={i}
            x1="12"
            y1="12"
            x2="12"
            y2="3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${i * 45} 12 12)`}
          />
        ))}
      </svg>
    </motion.div>
  );
}

function Cloud({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <motion.div
      className="absolute"
      initial={{ x: -20, opacity: 0 }}
      animate={{
        x: [0, 10, 0],
        opacity: [0.8, 1, 0.8],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
      style={{ color }}
    >
      <svg width="80" height="40" viewBox="0 0 60 30">
        <ellipse cx="15" cy="20" rx="12" ry="8" fill="currentColor" />
        <ellipse cx="32" cy="18" rx="14" ry="10" fill="currentColor" />
        <ellipse cx="48" cy="20" rx="10" ry="7" fill="currentColor" />
      </svg>
    </motion.div>
  );
}

function Rain({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute flex gap-1"
      style={{ color }}
    >
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="flex flex-col gap-1"
          initial={{ y: -10, opacity: 0 }}
          animate={{
            y: [0, 20],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeIn',
            delay: i * 0.2,
          }}
        >
          <svg width="6" height="16" viewBox="0 0 6 16">
            <line x1="3" y1="0" x2="3" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </motion.div>
      ))}
    </motion.div>
  );
}

function Snow({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ color, left: `${10 + i * 12}%` }}
          initial={{ y: -10, opacity: 0 }}
          animate={{
            y: [0, 60],
            x: [0, (i % 2 === 0 ? 10 : -10)],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
            <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2" />
            <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" stroke="currentColor" strokeWidth="2" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="2" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" stroke="currentColor" strokeWidth="2" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" stroke="currentColor" strokeWidth="2" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

function Thunder({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute"
      style={{ color }}
      animate={{
        opacity: [0, 1, 0],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <svg width="40" height="50" viewBox="0 0 24 32">
        <polygon
          points="12,0 8,14 14,14 6,32 18,18 12,18 20,0"
          fill="currentColor"
        />
      </svg>
    </motion.div>
  );
}

function WeatherIcon({ type, color }: { type: string; color: string }) {
  switch (type) {
    case 'sunny':
      return <Sun color={color} />;
    case 'rainy':
      return (
        <>
          <Cloud color={color} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <Rain color={color} />
          </div>
        </>
      );
    case 'snowy':
      return (
        <>
          <Cloud color={color} delay={0.2} />
          <Snow color={color} />
        </>
      );
    case 'stormy':
      return (
        <>
          <Cloud color={color} />
          <Thunder color="#FBBF24" />
        </>
      );
    case 'foggy':
      return (
        <div className="flex flex-col gap-2">
          <Cloud color={color} delay={0} />
          <motion.div
            className="h-2 bg-white/50 rounded-full blur-sm"
            animate={{ width: ['60%', '80%', '60%'] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ color }}
          />
          <motion.div
            className="h-2 bg-white/40 rounded-full blur-sm"
            animate={{ width: ['40%', '60%', '40%'] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            style={{ color }}
          />
        </div>
      );
    default:
      return <Cloud color={color} />;
  }
}

export function WeatherCard({ card }: { card: DashboardCardType }) {
  const config = card.config as WeatherCardConfig;
  const { latitude, longitude, error: geoError, loading: geoLoading } = useGeolocation();
  const [weatherData, setWeatherData] = useState<WeatherApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      const lat = config.latitude || latitude;
      const lon = config.longitude || longitude;

      if (!lat || !lon) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `/api/weather?lat=${lat}&lon=${lon}&city=${encodeURIComponent(config.city || '')}`
        );
        const data = await res.json();

        if (data.success) {
          setWeatherData(data.data);
        } else {
          setError(data.error || 'Failed to fetch weather');
        }
      } catch (err) {
        setError('Failed to fetch weather');
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [latitude, longitude, config.city, config.latitude, config.longitude]);

  const weatherType = (weatherData?.icon || 'sunny') as keyof typeof weatherThemes;
  const theme = weatherThemes[weatherType];

  if (geoLoading || loading) {
    return (
      <div className="w-full h-full rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-16 h-16 rounded-full border-4 border-slate-300 border-t-slate-500" />
          </motion.div>
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-slate-400"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (geoError || error) {
    return (
      <div className="w-full h-full rounded-3xl bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            😵‍💫
          </motion.div>
          <p className="text-red-500 font-medium">{geoError || error}</p>
          <p className="text-red-400 text-sm mt-2">点击卡片重新加载</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      className={clsx(
        'w-full h-full rounded-3xl relative overflow-hidden',
        'bg-gradient-to-br',
        theme.bgGradient,
        'shadow-lg'
      )}
    >
      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className={clsx('absolute rounded-full blur-xl', theme.bgElement)}
            style={{
              width: 40 + Math.random() * 60,
              height: 40 + Math.random() * 60,
              left: `${10 + Math.random() * 70}%`,
              top: `${Math.random() * 40}%`,
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Main weather illustration */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative w-32 h-32 flex items-center justify-center">
            <WeatherIcon type={weatherType} color={theme.sunColor} />
          </div>
        </motion.div>
      </div>

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-bold text-slate-700 mb-1">
            {weatherData?.city || config.city || '未知位置'}
          </h3>
          {weatherData?.description && (
            <p className="text-sm text-slate-500 mb-3">{weatherData.description}</p>
          )}

          <div className="flex items-baseline gap-1 mb-4">
            <motion.span
              className="text-5xl font-black text-slate-700"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {weatherData?.temperature ?? '--'}
            </motion.span>
            <span className="text-2xl font-bold text-slate-500">°</span>
          </div>

          <div className="flex gap-4">
            {config.showHumidity && (
              <div className="flex items-center gap-2 bg-white/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <WiHumidity size={18} className={theme.accentColor} />
                </motion.div>
                <span className="text-sm font-medium text-slate-600">
                  {weatherData?.humidity ?? '--'}%
                </span>
              </div>
            )}
            {config.showWind && (
              <div className="flex items-center gap-2 bg-white/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <WiStrongWind size={18} className={theme.accentColor} />
                </motion.div>
                <span className="text-sm font-medium text-slate-600">
                  {weatherData?.windSpeed ?? '--'} km/h
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Decorative corner */}
      <motion.div
        className="absolute top-3 right-3 w-12 h-12 opacity-30"
        style={{ color: theme.sunColor }}
        animate={{ rotate: [0, 90, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2" />
          <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
          <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2" />
          <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
        </svg>
      </motion.div>
    </motion.div>
  );
}
