import { Hono } from 'hono'

interface GeocodingResponse {
  results: Array<{
    id: number
    name: string
    country: string
    latitude: number
    longitude: number
  }>
}

const weatherCodeMap: Record<number, { description: string; icon: string }> = {
  0: { description: '晴朗', icon: 'sunny' },
  1: { description: '大部分晴朗', icon: 'sunny' },
  2: { description: '多云', icon: 'cloudy' },
  3: { description: '阴天', icon: 'cloudy' },
  45: { description: '雾', icon: 'foggy' },
  48: { description: '雾凇', icon: 'foggy' },
  51: { description: '小毛毛雨', icon: 'rainy' },
  53: { description: '中毛毛雨', icon: 'rainy' },
  55: { description: '大毛毛雨', icon: 'rainy' },
  56: { description: '冻毛毛雨', icon: 'rainy' },
  57: { description: '重冻毛毛雨', icon: 'rainy' },
  61: { description: '小雨', icon: 'rainy' },
  63: { description: '中雨', icon: 'rainy' },
  65: { description: '大雨', icon: 'rainy' },
  66: { description: '冻雨', icon: 'rainy' },
  67: { description: '重冻雨', icon: 'rainy' },
  71: { description: '小雪', icon: 'snowy' },
  73: { description: '中雪', icon: 'snowy' },
  75: { description: '大雪', icon: 'snowy' },
  77: { description: '雪粒', icon: 'snowy' },
  80: { description: '小阵雨', icon: 'rainy' },
  81: { description: '中阵雨', icon: 'rainy' },
  82: { description: '大阵雨', icon: 'rainy' },
  85: { description: '小阵雪', icon: 'snowy' },
  86: { description: '大阵雪', icon: 'snowy' },
  95: { description: '雷暴', icon: 'stormy' },
  96: { description: '雷暴伴冰雹', icon: 'stormy' },
  99: { description: '重雷暴伴冰雹', icon: 'stormy' },
}

function getWeatherInfo(code: number) {
  return weatherCodeMap[code] || { description: '未知', icon: 'cloudy' }
}

const weather = new Hono()

weather.get('/', async (c) => {
  const { lat, lon, city } = c.req.query()

  if (!lat || !lon) {
    return c.json({
      success: false,
      error: 'Missing latitude or longitude',
    }, 400)
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lon)

  if (isNaN(latitude) || isNaN(longitude)) {
    return c.json({
      success: false,
      error: 'Invalid latitude or longitude',
    }, 400)
  }

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch weather data')
    }

    const data = await response.json() as any
    const current = data.current
    const weatherInfo = getWeatherInfo(current.weather_code)

    return c.json({
      success: true,
      data: {
        temperature: Math.round(current.temperature_2m),
        weatherCode: current.weather_code,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        city: city || undefined,
      },
    })
  } catch (error) {
    console.error('Weather API error:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch weather data',
    }, 500)
  }
})

weather.get('/geocode', async (c) => {
  const { q } = c.req.query()

  if (!q) {
    return c.json({
      success: false,
      error: 'Missing query parameter "q"',
    }, 400)
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=zh&format=json`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch geocoding data')
    }

    const data = await response.json() as GeocodingResponse

    if (!data.results || data.results.length === 0) {
      return c.json({
        success: false,
        error: 'Location not found',
      }, 404)
    }

    const location = data.results[0]

    return c.json({
      success: true,
      data: {
        city: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    })
  } catch (error) {
    console.error('Geocoding API error:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch location data',
    }, 500)
  }
})

export default weather
