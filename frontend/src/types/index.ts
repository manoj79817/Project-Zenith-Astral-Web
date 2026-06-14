export interface ZenithObject {
  id: string;
  name: string;
  type: 'satellite' | 'planet' | 'moon' | 'sun' | 'constellation' | 'star';
  category?: string;
  elevation: number;
  azimuth: number;
  distance?: number;
  speed?: number;
  magnitude?: number;
  color?: string;
  icon?: string;
  stars?: ConstellationStar[];
  lines?: number[][];
}

export interface ConstellationStar {
  name: string;
  ra: number;
  dec: number;
  mag: number;
  elevation?: number;
  azimuth?: number;
}

export interface ZenithUpdate {
  objects: ZenithObject[];
  observer: { lat: number; lon: number };
  time: string;
  objectCount: number;
}

export interface CelestialFact {
  _id: string;
  objectId: string;
  objectName: string;
  objectType: string;
  facts: string[];
  description: string;
  magnitude?: number;
  icon: string;
  color: string;
}

export interface SavedLocation {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}
