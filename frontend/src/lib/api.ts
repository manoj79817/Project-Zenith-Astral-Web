const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://project-zenith-astral-web.onrender.com';

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function fetchZenith(lat: number, lon: number, minElevation = 20, time?: string) {
  let url = `/api/zenith?lat=${lat}&lon=${lon}&minElevation=${minElevation}`;
  if (time) url += `&time=${encodeURIComponent(time)}`;
  return apiFetch(url);
}

export async function fetchFacts() {
  return apiFetch<{ success: boolean; data: import('../types').CelestialFact[] }>('/api/facts');
}

export async function fetchFactById(objectId: string) {
  return apiFetch<{ success: boolean; data: import('../types').CelestialFact }>(`/api/facts/${objectId}`);
}

export async function fetchLocations() {
  return apiFetch<{ success: boolean; data: import('../types').SavedLocation[] }>('/api/locations');
}

export async function saveLocation(name: string, latitude: number, longitude: number) {
  return apiFetch<{ success: boolean; data: import('../types').SavedLocation }>('/api/locations', {
    method: 'POST',
    body: JSON.stringify({ name, latitude, longitude }),
  });
}

export async function deleteLocation(id: string) {
  return apiFetch(`/api/locations/${id}`, { method: 'DELETE' });
}

export async function searchNominatim(query: string): Promise<import('../types').NominatimResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
    {
      headers: { 'User-Agent': 'ProjectZenith/1.0' },
    }
  );
  return res.json();
}

export { BACKEND_URL };
