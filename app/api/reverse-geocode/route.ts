import { NextRequest, NextResponse } from 'next/server';

// Nominatim allows max 1 request per second; simple in-memory throttle
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1100;

async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat or lon' }, { status: 400 });
  }
  try {
    await throttleNominatim();
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ShipHub/1.0 (https://github.com/shiphub; contact@shiphub.example.com)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text();
      const isRateLimited = res.status === 429;
      const message = isRateLimited
        ? 'Geocoding service is busy. Please try again in a moment.'
        : 'Could not get address for this location. Try again or enter manually.';
      console.warn('Nominatim error:', res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: message, status: res.status },
        { status: res.status === 429 ? 429 : 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isTimeout = message.includes('timeout') || message.includes('abort');
    const userMessage = isTimeout
      ? 'Geocoding request timed out. Please try again.'
      : 'Could not get address for this location. Try again or enter manually.';
    console.warn('Reverse-geocode error:', message);
    return NextResponse.json(
      { error: userMessage },
      { status: 502 }
    );
  }
}
