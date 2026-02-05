'use client';

import { motion } from 'framer-motion';
import {
  WiDaySunny,
  WiCloud,
  WiRain,
  WiSnow,
  WiThunderstorm,
  WiFog,
  WiHumidity,
  WiWindy,
} from 'react-icons/wi';
import { IoMdSunny, IoMdRainy } from 'react-icons/io';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface WeatherCardProps {
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy';
  temperature: number;
  city: string;
  humidity?: number;
  windSpeed?: number;
  description?: string;
  className?: string;
  variant?: 'full' | 'compact';
}

const weatherConfig = {
  sunny: {
    bgGradient: 'from-amber-300 via-orange-200 to-yellow-100',
    bgPattern: 'bg-amber-200/30',
    iconColor: '#F59E0B',
    iconBg: 'from-yellow-300 to-orange-400',
    shadowColor: 'shadow-amber-500/30',
    accentColor: 'text-amber-600',
    CloudIcon: WiDaySunny,
    SimpleIcon: IoMdSunny,
    cloudColor: 'fill-yellow-300',
  },
  cloudy: {
    bgGradient: 'from-slate-300 via-gray-200 to-zinc-100',
    bgPattern: 'bg-slate-200/30',
    iconColor: '#94A3B8',
    iconBg: 'from-slate-300 to-slate-400',
    shadowColor: 'shadow-slate-500/30',
    accentColor: 'text-slate-600',
    CloudIcon: WiCloud,
    SimpleIcon: WiCloud,
    cloudColor: 'fill-slate-300',
  },
  rainy: {
    bgGradient: 'from-blue-300 via-indigo-200 to-cyan-100',
    bgPattern: 'bg-blue-200/30',
    iconColor: '#3B82F6',
    iconBg: 'from-blue-400 to-indigo-500',
    shadowColor: 'shadow-blue-500/30',
    accentColor: 'text-blue-600',
    CloudIcon: WiRain,
    SimpleIcon: IoMdRainy,
    cloudColor: 'fill-blue-300',
  },
  snowy: {
    bgGradient: 'from-cyan-200 via-blue-100 to-white',
    bgPattern: 'bg-cyan-100/30',
    iconColor: '#22D3EE',
    iconBg: 'from-cyan-300 to-blue-400',
    shadowColor: 'shadow-cyan-500/30',
    accentColor: 'text-cyan-600',
    CloudIcon: WiSnow,
    SimpleIcon: WiSnow,
    cloudColor: 'fill-cyan-300',
  },
  stormy: {
    bgGradient: 'from-purple-400 via-indigo-300 to-slate-200',
    bgPattern: 'bg-purple-200/30',
    iconColor: '#8B5CF6',
    iconBg: 'from-purple-500 to-indigo-600',
    shadowColor: 'shadow-purple-500/30',
    accentColor: 'text-purple-600',
    CloudIcon: WiThunderstorm,
    SimpleIcon: WiThunderstorm,
    cloudColor: 'fill-purple-300',
  },
  foggy: {
    bgGradient: 'from-zinc-300 via-gray-200 to-slate-100',
    bgPattern: 'bg-gray-200/30',
    iconColor: '#6B7280',
    iconBg: 'from-gray-300 to-gray-400',
    shadowColor: 'shadow-gray-500/30',
    accentColor: 'text-gray-600',
    CloudIcon: WiFog,
    SimpleIcon: WiFog,
    cloudColor: 'fill-gray-300',
  },
};

export function WeatherCard({
  weather,
  temperature,
  city,
  humidity,
  windSpeed,
  description,
  className,
}: WeatherCardProps) {
  const config = weatherConfig[weather];
  const CloudIcon = config.CloudIcon;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={twMerge(
        clsx(
          'relative overflow-hidden rounded-[2rem] p-8',
          'bg-gradient-to-br',
          config.bgGradient,
          'backdrop-blur-xl border border-white/40',
          'transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl',
          config.shadowColor,
          className
        )
      )}
    >
      <div className="absolute inset-0">
        <div className={clsx('absolute inset-0 opacity-50', config.bgPattern)}>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-24 h-24 rounded-full bg-white/25 blur-2xl"
              animate={{
                x: [0, 40, -40, 0],
                y: [0, -30, 30, 0],
                scale: [1, 1.3, 0.7, 1],
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.3,
              }}
              style={{
                left: `${10 + i * 12}%`,
                top: `${5 + (i % 4) * 20}%`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 text-center"
        >
          <h3 className="text-3xl font-bold text-slate-700">{city}</h3>
          {description && (
            <p className="text-sm text-slate-500 mt-2 font-medium tracking-wide">
              {description}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
            delay: 0.3,
          }}
          className="relative mb-8"
        >
          <motion.div
            animate={{
              y: [0, -12, 0],
              rotate: [0, 4, -4, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div
              className={clsx(
                'w-40 h-40 rounded-full',
                'bg-gradient-to-br',
                config.iconBg,
                'flex items-center justify-center',
                'shadow-2xl shadow-black/10',
                'relative'
              )}
            >
              <CloudIcon
                size={100}
                color="white"
                className="drop-shadow-lg"
              />
            </div>
          </motion.div>

          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${25 + i * 15}%`,
                top: `${i % 2 === 0 ? '5%' : '15%'}`,
              }}
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.3, 0.8],
                rotate: [0, 15, -15, 0],
              }}
              transition={{
                duration: 2.5 + i * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
            >
              <CloudIcon
                size={weather === 'sunny' ? 24 : 20}
                color={weather === 'sunny' ? '#F59E0B' : '#94A3B8'}
                className={weather === 'sunny' ? 'text-yellow-400' : 'text-slate-400'}
              />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-8"
        >
          <div className="flex items-baseline justify-center gap-2">
            <motion.span
              className="text-8xl font-black text-slate-700 tracking-tighter"
              animate={{
                scale: [1, 1.03, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {temperature}
            </motion.span>
            <span className="text-4xl font-bold text-slate-500">°C</span>
          </div>
        </motion.div>

        {(humidity !== undefined || windSpeed !== undefined) && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-10"
          >
            {humidity !== undefined && (
              <motion.div
                className="flex flex-col items-center"
                whileHover={{ scale: 1.1 }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <WiHumidity
                    size={36}
                    className={config.accentColor}
                  />
                </motion.div>
                <span className="text-xl font-bold text-slate-600 mt-2">
                  {humidity}%
                </span>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  湿度
                </span>
              </motion.div>
            )}

            {windSpeed !== undefined && (
              <motion.div
                className="flex flex-col items-center"
                whileHover={{ scale: 1.1 }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <WiWindy
                    size={36}
                    className={config.accentColor}
                  />
                </motion.div>
                <span className="text-xl font-bold text-slate-600 mt-2">
                  {windSpeed}
                  <span className="text-sm font-normal text-slate-400 ml-1">
                    km/h
                  </span>
                </span>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  风速
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        <motion.div
          className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
          animate={{
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </motion.div>
  );
}

export function WeatherCardCompact({
  weather,
  temperature,
  city,
  className,
}: WeatherCardProps) {
  const config = weatherConfig[weather];
  const CloudIcon = config.SimpleIcon;

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={twMerge(
        clsx(
          'flex items-center gap-4 px-6 py-4 rounded-2xl',
          'bg-gradient-to-r',
          config.bgGradient,
          'backdrop-blur-lg border border-white/30 shadow-lg',
          'transition-all duration-300 hover:shadow-xl',
          config.shadowColor,
          className
        )
      )}
    >
      <motion.div
        animate={{
          y: [0, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className={clsx(
            'w-14 h-14 rounded-xl',
            'bg-gradient-to-br',
            config.iconBg,
            'flex items-center justify-center',
            'shadow-lg'
          )}
        >
          <CloudIcon
            size={32}
            color="white"
          />
        </div>
      </motion.div>

      <div>
        <h4 className="text-lg font-bold text-slate-700">{city}</h4>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-600">
            {temperature}°
          </span>
        </div>
      </div>

      <motion.div
        className="ml-auto"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className={clsx(
            'w-3 h-3 rounded-full',
            'bg-gradient-to-r',
            config.iconBg
          )}
        />
      </motion.div>
    </motion.div>
  );
}
