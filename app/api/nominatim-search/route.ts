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
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  try {
    await throttleNominatim();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;
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
        ? 'Search service is busy. Please try again in a moment.'
        : 'Could not search for locations. Try again or enter manually.';
      console.warn('Nominatim search error:', res.status, text.slice(0, 200));
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
    if (isTimeout) {
      console.warn('Nominatim search timeout');
      return NextResponse.json(
        { error: 'Search took too long. Please try again.' },
        { status: 504 }
      );
    }
    console.error('nominatim-search error:', e);
    return NextResponse.json(
      { error: 'Search failed. Please try again.' },
      { status: 500 }
    );
  }
}
