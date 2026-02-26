'use client';

import { WeatherCard, WeatherCardCompact } from '@/components/ui/weather-card';

export default function WeatherDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-8">
      <h1 className="text-3xl font-bold text-slate-700 mb-8 text-center">
        天气卡片组件演示
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* 晴天 */}
        <WeatherCard
          weather="sunny"
          temperature={28}
          city="北京"
          description="阳光明媚"
          humidity={45}
          windSpeed={12}
        />

        {/* 阴天 */}
        <WeatherCard
          weather="cloudy"
          temperature={22}
          city="上海"
          description="多云转阴"
          humidity={60}
          windSpeed={18}
        />

        {/* 下雨 */}
        <WeatherCard
          weather="rainy"
          temperature={19}
          city="杭州"
          description="中雨"
          humidity={82}
          windSpeed={15}
        />

        {/* 下雪 */}
        <WeatherCard
          weather="snowy"
          temperature={-3}
          city="哈尔滨"
          description="小雪"
          humidity={70}
          windSpeed={8}
        />

        {/* 雷暴 */}
        <WeatherCard
          weather="stormy"
          temperature={25}
          city="深圳"
          description="雷阵雨"
          humidity={75}
          windSpeed={22}
        />

        {/* 雾天 */}
        <WeatherCard
          weather="foggy"
          temperature={15}
          city="成都"
          description="大雾"
          humidity={90}
          windSpeed={5}
        />
      </div>

      <h2 className="text-2xl font-bold text-slate-700 mt-12 mb-6 text-center">
        紧凑版本
      </h2>

      <div className="flex flex-wrap gap-4 justify-center max-w-4xl mx-auto">
        <WeatherCardCompact
          weather="sunny"
          temperature={28}
          city="北京"
        />
        <WeatherCardCompact
          weather="rainy"
          temperature={19}
          city="杭州"
        />
        <WeatherCardCompact
          weather="snowy"
          temperature={-3}
          city="哈尔滨"
        />
        <WeatherCardCompact
          weather="cloudy"
          temperature={22}
          city="上海"
        />
      </div>
    </div>
  );
}
