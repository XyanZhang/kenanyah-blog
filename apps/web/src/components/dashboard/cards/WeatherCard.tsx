'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WiDaySunny, WiCloud, WiRain, WiSnow, WiThunderstorm, WiFog, WiHumidity, WiWindy } from 'react-icons/wi';
import { DashboardCard as DashboardCardType, WeatherCardConfig } from '@blog/types';
import { clsx } from 'clsx';
import { useGeolocation } from '@/hooks/useGeolocation';

const weatherConfig = {
  sunny: {
    bgGradient: 'from-amber-300 via-orange-200 to-yellow-100',
    iconBg: 'from-yellow-300 to-orange-400',
  },
  cloudy: {
    bgGradient: 'from-slate-300 via-gray-200 to-zinc-100',
    iconBg: 'from-slate-300 to-slate-400',
  },
  rainy: {
    bgGradient: 'from-blue-300 via-indigo-200 to-cyan-100',
    iconBg: 'from-blue-400 to-indigo-500',
  },
  snowy: {
    bgGradient: 'from-cyan-200 via-blue-100 to-white',
    iconBg: 'from-cyan-300 to-blue-400',
  },
  stormy: {
    bgGradient: 'from-purple-400 via-indigo-300 to-slate-200',
    iconBg: 'from-purple-500 to-indigo-600',
  },
  foggy: {
    bgGradient: 'from-zinc-300 via-gray-200 to-slate-100',
    iconBg: 'from-gray-300 to-gray-400',
  },
};

const weatherIcons = {
  sunny: WiDaySunny,
  cloudy: WiCloud,
  rainy: WiRain,
  snowy: WiSnow,
  stormy: WiThunderstorm,
  foggy: WiFog,
};

interface WeatherApiData {
  temperature: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  city?: string;
}

export function WeatherCard({ card }: { card: DashboardCardType }) {
  const config = card.config as WeatherCardConfig;
  const { latitude, longitude, error: geoError, loading: geoLoading } = useGeolocation();
  const [weatherData, setWeatherData] = useState<WeatherApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      if (!latitude || !longitude) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `/api/weather?lat=${latitude}&lon=${longitude}&city=${encodeURIComponent(config.city || '')}`
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
  }, [latitude, longitude, config.city]);

  const weatherType = (weatherData?.icon || 'sunny') as keyof typeof weatherConfig;
  const theme = weatherConfig[weatherType];
  const WeatherIcon = weatherIcons[weatherType];

  if (geoLoading || loading) {
    return (
      <div className="w-full h-full rounded-2xl p-5 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-full border-3 border-slate-400 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <span className="text-sm text-slate-500">加载天气中...</span>
        </div>
      </div>
    );
  }

  if (geoError || error) {
    return (
      <div className="w-full h-full rounded-2xl p-5 bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
        <div className="text-center">
          <span className="text-3xl mb-2 block">😕</span>
          <span className="text-sm text-red-500">{geoError || error}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={clsx(
        'w-full h-full rounded-2xl p-5',
        'bg-gradient-to-br',
        theme.bgGradient,
        'backdrop-blur-xl border border-white/40',
        'flex flex-col items-center justify-center',
        'transition-all duration-300 hover:scale-[1.02]'
      )}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mb-3"
      >
        <div
          className={clsx(
            'w-20 h-20 rounded-full',
            'bg-gradient-to-br',
            theme.iconBg,
            'flex items-center justify-center',
            'shadow-lg'
          )}
        >
          <WeatherIcon size={50} color="white" />
        </div>
      </motion.div>

      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-700">
          {weatherData?.city || config.city || '未知位置'}
        </h3>
        {weatherData?.description && (
          <p className="text-xs text-slate-500 mt-1">{weatherData.description}</p>
        )}
      </div>

      <div className="flex items-baseline justify-center gap-1 mt-2">
        <span className="text-5xl font-black text-slate-700">
          {weatherData?.temperature ?? '--'}
        </span>
        <span className="text-2xl font-bold text-slate-500">°C</span>
      </div>

      <div className="flex gap-4 mt-4">
        {config.showHumidity && (
          <div className="flex items-center gap-1">
            <WiHumidity size={20} className="text-slate-500" />
            <span className="text-xs text-slate-500">
              {weatherData?.humidity ?? '--'}%
            </span>
          </div>
        )}
        {config.showWind && (
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="flex items-center gap-1"
          >
            <WiWindy size={20} className="text-slate-500" />
            <span className="text-xs text-slate-500">
              {weatherData?.windSpeed ?? '--'} km/h
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
