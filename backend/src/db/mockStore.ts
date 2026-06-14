/**
 * In-memory mock store — used when MongoDB is not available.
 * Provides the same interface as Mongoose operations for seamless fallback.
 */

interface MockLocation {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

interface MockFact {
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

interface MockSatellite {
  _id: string;
  noradId: number;
  name: string;
  tleLine1: string;
  tleLine2: string;
  category: string;
  lastUpdated: Date;
}

let locationIdCounter = 0;

class MockStore {
  private locations: MockLocation[] = [];
  private facts: MockFact[] = [];
  private satellites: MockSatellite[] = [];

  // Locations
  getLocations(): MockLocation[] {
    return [...this.locations];
  }

  addLocation(data: { name: string; latitude: number; longitude: number }): MockLocation {
    const loc: MockLocation = {
      _id: `loc_${++locationIdCounter}`,
      ...data,
      createdAt: new Date(),
    };
    this.locations.push(loc);
    return loc;
  }

  deleteLocation(id: string): boolean {
    const idx = this.locations.findIndex((l) => l._id === id);
    if (idx === -1) return false;
    this.locations.splice(idx, 1);
    return true;
  }

  // Facts
  getFacts(): MockFact[] {
    return [...this.facts];
  }

  getFactByObjectId(objectId: string): MockFact | undefined {
    return this.facts.find((f) => f.objectId === objectId);
  }

  setFacts(facts: MockFact[]): void {
    this.facts = facts;
  }

  // Satellites
  getSatellites(): MockSatellite[] {
    return [...this.satellites];
  }

  setSatellites(sats: MockSatellite[]): void {
    this.satellites = sats;
  }

  getSatelliteByNoradId(noradId: number): MockSatellite | undefined {
    return this.satellites.find((s) => s.noradId === noradId);
  }

  upsertSatellite(data: Omit<MockSatellite, '_id'>): MockSatellite {
    const existing = this.satellites.find((s) => s.noradId === data.noradId);
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }
    const sat: MockSatellite = { _id: `sat_${data.noradId}`, ...data };
    this.satellites.push(sat);
    return sat;
  }
}

export const mockStore = new MockStore();
