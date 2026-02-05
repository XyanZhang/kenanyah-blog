'use client';

import { useState } from 'react';
import { WeatherCardConfig } from '@blog/types';
import { Label } from '@/components/ui';
import { Input } from '@/components/ui';
import { Switch } from '@/components/ui';

interface WeatherConfigFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

interface LocationData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export function WeatherConfigForm({ config, onChange }: WeatherConfigFormProps) {
  const [searchCity, setSearchCity] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const values = config as WeatherCardConfig;

  const handleCitySearch = async () => {
    if (!searchCity.trim()) return;

    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchCity)}`);
      const data = await res.json();

      if (data.success) {
        setSearchResults(data.data);
      } else {
        setSearchError(data.error || 'Location not found');
        setSearchResults([]);
      }
    } catch (err) {
      setSearchError('Failed to search location');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectLocation = (location: LocationData) => {
    onChange({
      ...values,
      city: location.city,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setSearchResults([]);
    setSearchCity('');
  };

  const updateConfig = (key: keyof WeatherCardConfig, value: boolean) => {
    onChange({
      ...values,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>城市搜索</Label>
        <div className="flex gap-2">
          <Input
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            placeholder="输入城市名称搜索..."
            onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
          />
          <button
            type="button"
            onClick={handleCitySearch}
            disabled={searching}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-dark transition-colors disabled:opacity-50"
          >
            {searching ? '搜索中...' : '搜索'}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <Label>搜索结果</Label>
          {searchResults.map((location) => (
            <button
              key={`${location.city}-${location.country}`}
              type="button"
              onClick={() => selectLocation(location)}
              className="w-full px-4 py-3 text-left bg-surface-secondary rounded-lg hover:bg-surface-hover transition-colors border border-line-primary"
            >
              <span className="font-medium">{location.city}</span>
              <span className="text-sm text-content-muted ml-2">{location.country}</span>
            </button>
          ))}
        </div>
      )}

      {searchError && (
        <p className="text-sm text-red-500">{searchError}</p>
      )}

      {values.city && (
        <div className="p-3 bg-surface-secondary rounded-lg">
          <span className="text-sm font-medium">已选择: {values.city}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label>显示湿度</Label>
        <Switch
          checked={values.showHumidity}
          onCheckedChange={(v) => updateConfig('showHumidity', v)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>显示风速</Label>
        <Switch
          checked={values.showWind}
          onCheckedChange={(v) => updateConfig('showWind', v)}
        />
      </div>
    </div>
  );
}
