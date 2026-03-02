import { NextRequest, NextResponse } from 'next/server'

interface GeocodingResponse {
  results: Array<{
    id: number
    name: string
    country: string
    latitude: number
    longitude: number
  }>
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q) {
    return NextResponse.json({
      success: false,
      error: 'Missing query parameter "q"',
    }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=zh&format=json`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch geocoding data')
    }

    const data = await response.json() as GeocodingResponse

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Location not found',
      }, { status: 404 })
    }

    const results = data.results.map((location) => ({
      city: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
    }))

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Geocoding API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch location data',
    }, { status: 500 })
  }
}
