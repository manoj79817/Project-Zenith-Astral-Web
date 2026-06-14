/**
 * Zenith Calculator — Computes which celestial objects are near zenith
 * for a given observer location and time.
 *
 * Uses satellite.js for ISS/satellite positions from TLE data,
 * and astronomy-engine for Sun, Moon, planets, and star positions.
 */

import * as satellite from 'satellite.js';
import * as Astronomy from 'astronomy-engine';
import sampleTLEData from '../data/sampleTLE.json';
import constellationData from '../data/constellations.json';

// Types
export interface ZenithObject {
  id: string;
  name: string;
  type: 'satellite' | 'planet' | 'moon' | 'sun' | 'constellation' | 'star';
  category?: string;
  elevation: number;   // degrees above horizon (90 = zenith)
  azimuth: number;     // degrees from north, clockwise
  distance?: number;   // km for satellites, AU for planets
  speed?: number;      // km/s for satellites
  magnitude?: number;
  color?: string;
  icon?: string;
  stars?: ConstellationStar[];
  lines?: number[][];
}

interface ConstellationStar {
  name: string;
  ra: number;
  dec: number;
  mag: number;
  elevation?: number;
  azimuth?: number;
}

interface TLEEntry {
  noradId: number;
  name: string;
  category: string;
  tleLine1: string;
  tleLine2: string;
}

// Store for current TLE data (updated by live fetcher)
let currentTLEData: TLEEntry[] = sampleTLEData;

export const updateTLEData = (newData: TLEEntry[]): void => {
  currentTLEData = newData;
};

export const getTLEData = (): TLEEntry[] => currentTLEData;

/**
 * Convert RA/Dec (J2000) to horizontal coordinates (alt/az) for a given observer and time.
 */
function raDecToAltAz(
  raDeg: number,
  decDeg: number,
  lat: number,
  lon: number,
  date: Date
): { elevation: number; azimuth: number } {
  // Convert to radians
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  // Calculate Local Sidereal Time
  const jd = getJulianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  gmst = ((gmst % 360) + 360) % 360;
  const lst = ((gmst + lon) % 360) * (Math.PI / 180);

  // Hour angle
  const ha = lst - ra;

  // Altitude (elevation)
  const sinAlt =
    Math.sin(dec) * Math.sin(latRad) +
    Math.cos(dec) * Math.cos(latRad) * Math.cos(ha);
  const alt = Math.asin(sinAlt);

  // Azimuth
  const cosAz =
    (Math.sin(dec) - Math.sin(alt) * Math.sin(latRad)) /
    (Math.cos(alt) * Math.cos(latRad));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(ha) > 0) {
    az = 2 * Math.PI - az;
  }

  return {
    elevation: (alt * 180) / Math.PI,
    azimuth: (az * 180) / Math.PI,
  };
}

function getJulianDate(date: Date): number {
  return date.getTime() / 86400000.0 + 2440587.5;
}

/**
 * Calculate satellite positions from TLE data
 */
function calculateSatellitePositions(
  lat: number,
  lon: number,
  date: Date,
  minElevation: number
): ZenithObject[] {
  const results: ZenithObject[] = [];
  const observerGd = {
    latitude: satellite.degreesToRadians(lat),
    longitude: satellite.degreesToRadians(lon),
    height: 0.0, // km above sea level
  };

  for (const tle of currentTLEData) {
    try {
      const satrec = satellite.twoline2satrec(tle.tleLine1, tle.tleLine2);
      const result = satellite.propagate(satrec, date);

      if (!result || !result.position || typeof result.position === 'boolean') {
        continue;
      }

      const positionEci = result.position as satellite.EciVec3<number>;
      const gmst = satellite.gstime(date);
      const positionEcf = satellite.eciToEcf(positionEci, gmst);
      const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

      const elevationDeg = satellite.radiansToDegrees(lookAngles.elevation);
      const azimuthDeg = satellite.radiansToDegrees(lookAngles.azimuth);

      if (elevationDeg >= minElevation) {
        let speed: number | undefined;
        if (result.velocity && typeof result.velocity !== 'boolean') {
          const vel = result.velocity as satellite.EciVec3<number>;
          speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
        }

        const categoryColors: Record<string, string> = {
          station: '#00d4ff',
          communication: '#ffd700',
          weather: '#4fc3f7',
          navigation: '#66bb6a',
          science: '#ce93d8',
          debris: '#ef5350',
          other: '#90a4ae',
        };

        results.push({
          id: `sat_${tle.noradId}`,
          name: tle.name,
          type: 'satellite',
          category: tle.category,
          elevation: Math.round(elevationDeg * 100) / 100,
          azimuth: Math.round(azimuthDeg * 100) / 100,
          distance: Math.round(lookAngles.rangeSat),
          speed: speed ? Math.round(speed * 100) / 100 : undefined,
          color: categoryColors[tle.category] || '#90a4ae',
          icon: tle.category === 'station' ? '🛰️' : '📡',
        });
      }
    } catch {
      // Skip satellites that fail to propagate
    }
  }

  return results;
}

/**
 * Calculate solar system body positions using astronomy-engine
 */
function calculateCelestialBodies(
  lat: number,
  lon: number,
  date: Date,
  minElevation: number
): ZenithObject[] {
  const results: ZenithObject[] = [];
  const observer = new Astronomy.Observer(lat, lon, 0);
  const astroDate = Astronomy.MakeTime(date);

  // Sun
  try {
    const sunHor = Astronomy.Horizon(astroDate, observer, 0, 0, 'normal');
    if (sunHor.altitude >= minElevation) {
      results.push({
        id: 'sun',
        name: 'Sun',
        type: 'sun',
        elevation: Math.round(sunHor.altitude * 100) / 100,
        azimuth: Math.round(sunHor.azimuth * 100) / 100,
        distance: 1.0,
        magnitude: -26.74,
        color: '#ffd700',
        icon: '☀️',
      });
    }
  } catch {
    // Sun calculation failed
  }

  // Moon
  try {
    const moonEqu = Astronomy.Equator(Astronomy.Body.Moon, astroDate, observer, true, true);
    const moonHor = Astronomy.Horizon(astroDate, observer, moonEqu.ra, moonEqu.dec, 'normal');
    if (moonHor.altitude >= minElevation) {
      const moonDist = moonEqu.dist; // AU
      results.push({
        id: 'moon',
        name: 'Moon',
        type: 'moon',
        elevation: Math.round(moonHor.altitude * 100) / 100,
        azimuth: Math.round(moonHor.azimuth * 100) / 100,
        distance: Math.round(moonDist * 149597870.7), // km
        magnitude: -12.7,
        color: '#c0c0c0',
        icon: '🌙',
      });
    }
  } catch {
    // Moon calculation failed
  }

  // Planets
  const planets: Array<{
    body: Astronomy.Body;
    id: string;
    name: string;
    mag: number;
    color: string;
    icon: string;
  }> = [
    { body: Astronomy.Body.Mercury, id: 'mercury', name: 'Mercury', mag: -1.9, color: '#b5a089', icon: '🪐' },
    { body: Astronomy.Body.Venus, id: 'venus', name: 'Venus', mag: -4.6, color: '#e8cda0', icon: '🪐' },
    { body: Astronomy.Body.Mars, id: 'mars', name: 'Mars', mag: -2.9, color: '#c1440e', icon: '🔴' },
    { body: Astronomy.Body.Jupiter, id: 'jupiter', name: 'Jupiter', mag: -2.7, color: '#c88b3a', icon: '🟤' },
    { body: Astronomy.Body.Saturn, id: 'saturn', name: 'Saturn', mag: 0.7, color: '#ead6a6', icon: '💫' },
  ];

  for (const planet of planets) {
    try {
      const equ = Astronomy.Equator(planet.body, astroDate, observer, true, true);
      const hor = Astronomy.Horizon(astroDate, observer, equ.ra, equ.dec, 'normal');
      if (hor.altitude >= minElevation) {
        results.push({
          id: planet.id,
          name: planet.name,
          type: 'planet',
          elevation: Math.round(hor.altitude * 100) / 100,
          azimuth: Math.round(hor.azimuth * 100) / 100,
          distance: Math.round(equ.dist * 100) / 100, // AU
          magnitude: planet.mag,
          color: planet.color,
          icon: planet.icon,
        });
      }
    } catch {
      // Planet calculation failed
    }
  }

  return results;
}

/**
 * Calculate constellation positions
 */
function calculateConstellations(
  lat: number,
  lon: number,
  date: Date,
  minElevation: number
): ZenithObject[] {
  const results: ZenithObject[] = [];
  const constellations = constellationData as Record<
    string,
    {
      name: string;
      stars: Array<{ name: string; ra: number; dec: number; mag: number }>;
      lines: number[][];
    }
  >;

  for (const [id, constellation] of Object.entries(constellations)) {
    try {
      const starPositions: ConstellationStar[] = constellation.stars.map((star) => {
        const altAz = raDecToAltAz(star.ra, star.dec, lat, lon, date);
        return {
          ...star,
          elevation: Math.round(altAz.elevation * 100) / 100,
          azimuth: Math.round(altAz.azimuth * 100) / 100,
        };
      });

      // Check if enough stars are above the minimum elevation
      const visibleStars = starPositions.filter(
        (s) => s.elevation !== undefined && s.elevation >= minElevation
      );

      if (visibleStars.length >= 2) {
        // Use average position of visible stars
        const avgElevation =
          visibleStars.reduce((sum, s) => sum + (s.elevation || 0), 0) /
          visibleStars.length;
        const avgAzimuth =
          visibleStars.reduce((sum, s) => sum + (s.azimuth || 0), 0) /
          visibleStars.length;

        const constellationColors: Record<string, string> = {
          orion: '#87ceeb',
          ursa_major: '#9bb0d4',
          cassiopeia: '#b8a9c9',
          scorpius: '#e74c3c',
          leo: '#f39c12',
          cygnus: '#87ceeb',
          gemini: '#00bcd4',
          lyra: '#e0e7ff',
          aquarius: '#4fc3f7',
          taurus: '#ff7043',
          canis_major: '#bbdefb',
          andromeda_const: '#ce93d8',
        };

        results.push({
          id,
          name: constellation.name,
          type: 'constellation',
          elevation: Math.round(avgElevation * 100) / 100,
          azimuth: Math.round(avgAzimuth * 100) / 100,
          color: constellationColors[id] || '#ffffff',
          icon: '⭐',
          stars: starPositions,
          lines: constellation.lines,
        });
      }
    } catch {
      // Constellation calculation failed
    }
  }

  return results;
}

/**
 * Main zenith calculation — returns all objects near zenith for a given location and time.
 */
export function calculateZenith(
  lat: number,
  lon: number,
  date: Date = new Date(),
  minElevation: number = 70
): ZenithObject[] {
  const allObjects: ZenithObject[] = [];

  // Satellites from TLE data
  const sats = calculateSatellitePositions(lat, lon, date, minElevation);
  allObjects.push(...sats);

  // Sun, Moon, Planets from astronomy-engine
  const celestial = calculateCelestialBodies(lat, lon, date, minElevation);
  allObjects.push(...celestial);

  // Constellations
  const consts = calculateConstellations(lat, lon, date, Math.max(minElevation - 30, 20));
  allObjects.push(...consts);

  // Sort by elevation (highest first = closest to zenith)
  allObjects.sort((a, b) => b.elevation - a.elevation);

  return allObjects;
}

/**
 * Get sun position for day/night terminator calculation
 */
export function getSunPosition(date: Date = new Date()): { ra: number; dec: number; lat: number; lon: number } {
  try {
    const astroDate = Astronomy.MakeTime(date);
    const observer = new Astronomy.Observer(0, 0, 0);
    const sunEqu = Astronomy.Equator(Astronomy.Body.Sun, astroDate, observer, true, true);

    // Sub-solar point
    const jd = getJulianDate(date);
    const T = (jd - 2451545.0) / 36525.0;
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
    gmst = ((gmst % 360) + 360) % 360;
    const subSolarLon = ((sunEqu.ra * 15 - gmst) % 360 + 360) % 360;

    return {
      ra: sunEqu.ra,
      dec: sunEqu.dec,
      lat: sunEqu.dec,
      lon: subSolarLon > 180 ? subSolarLon - 360 : subSolarLon,
    };
  } catch {
    return { ra: 0, dec: 23.4, lat: 23.4, lon: 0 };
  }
}
