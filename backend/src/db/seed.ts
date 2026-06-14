import { CelestialFact } from '../models';
import { isMockStore } from './connection';
import { mockStore } from './mockStore';

const seedFacts = [
  {
    objectId: 'iss',
    objectName: 'International Space Station',
    objectType: 'satellite' as const,
    facts: [
      'The ISS orbits Earth every ~92 minutes at 17,500 mph.',
      'It has been continuously inhabited since November 2000.',
      'The ISS is the size of a football field and weighs ~420,000 kg.',
      'Astronauts experience 16 sunrises and sunsets every day.',
    ],
    description: 'The largest human-made object in low Earth orbit, serving as a microgravity research laboratory.',
    magnitude: -3.5,
    icon: '🛰️',
    color: '#00d4ff',
  },
  {
    objectId: 'sun',
    objectName: 'Sun',
    objectType: 'sun' as const,
    facts: [
      'The Sun is 4.6 billion years old and halfway through its life.',
      'It takes sunlight 8 minutes and 20 seconds to reach Earth.',
      'The Sun accounts for 99.86% of the Solar System\'s mass.',
      'Its surface temperature is about 5,500°C (9,932°F).',
    ],
    description: 'Our star — a G-type main-sequence star at the center of the Solar System.',
    magnitude: -26.74,
    icon: '☀️',
    color: '#ffd700',
  },
  {
    objectId: 'moon',
    objectName: 'Moon',
    objectType: 'moon' as const,
    facts: [
      'The Moon is drifting away from Earth at ~3.8 cm per year.',
      'It\'s the fifth-largest natural satellite in the Solar System.',
      'The same side of the Moon always faces Earth (tidal locking).',
      'Only 12 humans have ever walked on its surface.',
    ],
    description: 'Earth\'s only natural satellite, influencing tides and stabilizing our planet\'s axial tilt.',
    magnitude: -12.7,
    icon: '🌙',
    color: '#c0c0c0',
  },
  {
    objectId: 'mercury',
    objectName: 'Mercury',
    objectType: 'planet' as const,
    facts: [
      'Mercury is the smallest planet in our Solar System.',
      'A day on Mercury lasts 59 Earth days.',
      'Despite being closest to the Sun, Venus is hotter due to its atmosphere.',
    ],
    description: 'The smallest and fastest planet, orbiting the Sun in just 88 days.',
    magnitude: -1.9,
    icon: '🪐',
    color: '#b5a089',
  },
  {
    objectId: 'venus',
    objectName: 'Venus',
    objectType: 'planet' as const,
    facts: [
      'Venus rotates backwards compared to most planets.',
      'A day on Venus is longer than its year.',
      'Venus is the hottest planet with surface temperatures reaching 465°C.',
    ],
    description: 'The brightest planet in our sky, shrouded in thick sulfuric acid clouds.',
    magnitude: -4.6,
    icon: '🪐',
    color: '#e8cda0',
  },
  {
    objectId: 'mars',
    objectName: 'Mars',
    objectType: 'planet' as const,
    facts: [
      'Mars has the tallest volcano in the Solar System: Olympus Mons (21 km).',
      'A Martian day is only 37 minutes longer than an Earth day.',
      'Mars has two small moons: Phobos and Deimos.',
    ],
    description: 'The Red Planet — a primary target for human colonization.',
    magnitude: -2.9,
    icon: '🔴',
    color: '#c1440e',
  },
  {
    objectId: 'jupiter',
    objectName: 'Jupiter',
    objectType: 'planet' as const,
    facts: [
      'Jupiter\'s Great Red Spot is a storm larger than Earth, raging for 350+ years.',
      'Jupiter has at least 95 known moons.',
      'It has the shortest day of all planets — just under 10 hours.',
    ],
    description: 'The Solar System\'s gas giant king, with a mass 2.5× all other planets combined.',
    magnitude: -2.7,
    icon: '🟤',
    color: '#c88b3a',
  },
  {
    objectId: 'saturn',
    objectName: 'Saturn',
    objectType: 'planet' as const,
    facts: [
      'Saturn\'s rings are mostly ice particles, from tiny grains to house-sized chunks.',
      'Saturn is so low-density it would float in water (hypothetically).',
      'Its moon Titan has a thick atmosphere and liquid methane lakes.',
    ],
    description: 'The ringed jewel of our Solar System, visible even with a small telescope.',
    magnitude: 0.7,
    icon: '💫',
    color: '#ead6a6',
  },
  {
    objectId: 'orion',
    objectName: 'Orion',
    objectType: 'constellation' as const,
    facts: [
      'Orion\'s Belt consists of three bright stars: Alnitak, Alnilam, and Mintaka.',
      'The Orion Nebula (M42) is a stellar nursery visible to the naked eye.',
      'Betelgeuse, Orion\'s shoulder star, may explode as a supernova within 100,000 years.',
    ],
    description: 'The Hunter — one of the most recognizable constellations visible from both hemispheres.',
    icon: '⭐',
    color: '#87ceeb',
  },
  {
    objectId: 'ursa_major',
    objectName: 'Ursa Major',
    objectType: 'constellation' as const,
    facts: [
      'Contains the Big Dipper asterism, used for navigation for thousands of years.',
      'Two stars in the Big Dipper point to Polaris, the North Star.',
      'It\'s the third-largest constellation in the sky.',
    ],
    description: 'The Great Bear — home to the famous Big Dipper pattern.',
    icon: '🐻',
    color: '#9bb0d4',
  },
  {
    objectId: 'cassiopeia',
    objectName: 'Cassiopeia',
    objectType: 'constellation' as const,
    facts: [
      'Shaped like a "W" or "M" depending on its position in the sky.',
      'Named after a vain queen from Greek mythology.',
      'It\'s circumpolar — visible year-round from northern latitudes.',
    ],
    description: 'The distinctive W-shaped constellation opposite the Big Dipper from Polaris.',
    icon: '👑',
    color: '#b8a9c9',
  },
  {
    objectId: 'scorpius',
    objectName: 'Scorpius',
    objectType: 'constellation' as const,
    facts: [
      'Antares, its brightest star, is a red supergiant 700× the Sun\'s diameter.',
      'In Greek mythology, this scorpion killed Orion, so they\'re on opposite sides of the sky.',
      'Contains many bright star clusters visible with binoculars.',
    ],
    description: 'The Scorpion — a zodiac constellation best seen in summer from northern latitudes.',
    icon: '🦂',
    color: '#e74c3c',
  },
  {
    objectId: 'leo',
    objectName: 'Leo',
    objectType: 'constellation' as const,
    facts: [
      'Regulus, Leo\'s brightest star, is 79 light-years from Earth.',
      'The Leonid meteor shower originates from this constellation each November.',
      'Leo is one of the oldest recognized constellations.',
    ],
    description: 'The Lion — a zodiac constellation prominent in the spring sky.',
    icon: '🦁',
    color: '#f39c12',
  },
  {
    objectId: 'cygnus',
    objectName: 'Cygnus',
    objectType: 'constellation' as const,
    facts: [
      'Contains the Northern Cross asterism.',
      'Deneb, its brightest star, is one of the most luminous stars known (~200,000× Sun).',
      'The Cygnus X-1 black hole was the first widely accepted black hole discovery.',
    ],
    description: 'The Swan — flying along the Milky Way, containing the famous Northern Cross.',
    icon: '🦢',
    color: '#87ceeb',
  },
  {
    objectId: 'gemini',
    objectName: 'Gemini',
    objectType: 'constellation' as const,
    facts: [
      'Named after the mythological twins Castor and Pollux.',
      'The Geminid meteor shower peaks each December from this constellation.',
      'Castor is actually a system of six stars orbiting each other.',
    ],
    description: 'The Twins — a zodiac constellation with two bright stars marking the twins\' heads.',
    icon: '👯',
    color: '#00bcd4',
  },
  {
    objectId: 'lyra',
    objectName: 'Lyra',
    objectType: 'constellation' as const,
    facts: [
      'Vega, its brightest star, was the northern pole star ~12,000 years ago and will be again.',
      'The Ring Nebula (M57) in Lyra is a famous planetary nebula.',
      'Vega is only 25 light-years away and one of the brightest stars in our sky.',
    ],
    description: 'The Lyre — a small but prominent constellation containing brilliant Vega.',
    icon: '🎵',
    color: '#e0e7ff',
  },
  {
    objectId: 'aquarius',
    objectName: 'Aquarius',
    objectType: 'constellation' as const,
    facts: [
      'One of the oldest recognized constellations, dating back to Babylonian times.',
      'Contains the Helix Nebula, the closest planetary nebula to Earth.',
      'The Age of Aquarius is an astrological concept linked to the precession of equinoxes.',
    ],
    description: 'The Water Bearer — a zodiac constellation spread across a large area of sky.',
    icon: '🏺',
    color: '#4fc3f7',
  },
  {
    objectId: 'taurus',
    objectName: 'Taurus',
    objectType: 'constellation' as const,
    facts: [
      'Contains the Pleiades (M45), one of the most famous star clusters.',
      'The Crab Nebula (M1) in Taurus is the remnant of a supernova seen in 1054 AD.',
      'Aldebaran, its brightest star, is an orange giant 65 light-years away.',
    ],
    description: 'The Bull — a zodiac constellation featuring the bright eye of Aldebaran.',
    icon: '🐂',
    color: '#ff7043',
  },
  {
    objectId: 'canis_major',
    objectName: 'Canis Major',
    objectType: 'constellation' as const,
    facts: [
      'Contains Sirius, the brightest star in the night sky.',
      'Sirius is only 8.6 light-years away — one of our closest stellar neighbors.',
      'Ancient Egyptians based their calendar on Sirius\'s heliacal rising.',
    ],
    description: 'The Great Dog — following Orion across the sky, led by brilliant Sirius.',
    icon: '🐕',
    color: '#bbdefb',
  },
  {
    objectId: 'andromeda_const',
    objectName: 'Andromeda',
    objectType: 'constellation' as const,
    facts: [
      'Contains the Andromeda Galaxy (M31), the nearest large galaxy at 2.5 million light-years.',
      'M31 is the most distant object visible to the naked eye.',
      'The Andromeda Galaxy will collide with the Milky Way in ~4.5 billion years.',
    ],
    description: 'The Chained Maiden — home to the Andromeda Galaxy, our cosmic neighbor.',
    icon: '🌌',
    color: '#ce93d8',
  },
];

export const seedDatabase = async (): Promise<void> => {
  if (isMockStore()) {
    console.log('[Seed] Seeding mock store with celestial facts...');
    const mockFacts = seedFacts.map((f, i) => ({
      _id: `fact_${i + 1}`,
      ...f,
    }));
    mockStore.setFacts(mockFacts);
    console.log(`[Seed] ✅ Loaded ${mockFacts.length} celestial facts into mock store`);
    return;
  }

  try {
    const existingCount = await CelestialFact.countDocuments();
    if (existingCount >= seedFacts.length) {
      console.log(`[Seed] Database already has ${existingCount} facts — skipping seed`);
      return;
    }

    await CelestialFact.deleteMany({});
    await CelestialFact.insertMany(seedFacts);
    console.log(`[Seed] ✅ Seeded ${seedFacts.length} celestial facts into MongoDB`);
  } catch (error) {
    console.error('[Seed] ❌ Failed to seed database:', error);
  }
};
