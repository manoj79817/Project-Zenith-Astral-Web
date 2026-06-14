/**
 * TLE Fetcher — Fetches live TLE data from CelesTrak and ISS position from OpenNotify.
 * Falls back to sample data if fetching fails.
 */

import axios from 'axios';
import { updateTLEData, getTLEData } from './zenithCalculator';
import { isMockStore } from '../db/connection';
import { Satellite } from '../models';

interface TLEEntry {
  noradId: number;
  name: string;
  category: string;
  tleLine1: string;
  tleLine2: string;
}

// CelesTrak TLE sources (no API key needed)
const CELESTRAK_URLS: Record<string, string> = {
  stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
  weather: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle',
  starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  gps: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
  science: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle',
};

// Parse TLE text format into structured entries
function parseTLEText(text: string, category: string): TLEEntry[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const entries: TLEEntry[] = [];

  for (let i = 0; i < lines.length - 2; i += 3) {
    const nameLine = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (!line1?.startsWith('1 ') || !line2?.startsWith('2 ')) continue;

    const noradIdMatch = line1.match(/^1\s+(\d+)/);
    if (!noradIdMatch) continue;

    entries.push({
      noradId: parseInt(noradIdMatch[1], 10),
      name: nameLine.trim(),
      category,
      tleLine1: line1,
      tleLine2: line2,
    });
  }

  return entries;
}

/**
 * Fetch TLE data from CelesTrak
 */
export async function fetchCelesTrakTLEs(): Promise<TLEEntry[]> {
  const allEntries: TLEEntry[] = [];

  // Only fetch stations and a limited set to avoid overloading
  const categoriesToFetch = ['stations', 'science'];

  for (const category of categoriesToFetch) {
    try {
      const url = CELESTRAK_URLS[category];
      const response = await axios.get(url, { timeout: 15000 });
      const entries = parseTLEText(response.data, category);
      // Limit to 50 per category
      allEntries.push(...entries.slice(0, 50));
      console.log(`[TLE] Fetched ${entries.length} ${category} TLEs from CelesTrak`);
    } catch (error) {
      console.warn(`[TLE] Failed to fetch ${category} TLEs:`, (error as Error).message);
    }
  }

  return allEntries;
}

/**
 * Fetch ISS position from OpenNotify (no key needed)
 */
export async function fetchISSPosition(): Promise<{
  latitude: number;
  longitude: number;
  timestamp: number;
} | null> {
  try {
    const response = await axios.get('http://api.open-notify.org/iss-now.json', {
      timeout: 10000,
    });
    if (response.data.message === 'success') {
      return {
        latitude: parseFloat(response.data.iss_position.latitude),
        longitude: parseFloat(response.data.iss_position.longitude),
        timestamp: response.data.timestamp,
      };
    }
    return null;
  } catch (error) {
    console.warn('[ISS] Failed to fetch ISS position:', (error as Error).message);
    return null;
  }
}

/**
 * Refresh all TLE data — called on schedule and manually
 */
export async function refreshTLEData(): Promise<{ count: number; source: string }> {
  try {
    const liveTLEs = await fetchCelesTrakTLEs();

    if (liveTLEs.length > 0) {
      updateTLEData(liveTLEs);

      // Also store in DB if available
      if (!isMockStore()) {
        for (const tle of liveTLEs) {
          try {
            await Satellite.findOneAndUpdate(
              { noradId: tle.noradId },
              { ...tle, lastUpdated: new Date() },
              { upsert: true }
            );
          } catch {
            // Individual satellite update failure is non-critical
          }
        }
      }

      console.log(`[TLE] ✅ Refreshed ${liveTLEs.length} TLE entries from CelesTrak`);
      return { count: liveTLEs.length, source: 'celestrak' };
    }

    console.log('[TLE] No live data available, keeping existing TLE data');
    return { count: getTLEData().length, source: 'cache' };
  } catch (error) {
    console.error('[TLE] Refresh failed:', error);
    return { count: getTLEData().length, source: 'fallback' };
  }
}
