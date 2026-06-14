'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { searchNominatim, fetchFactById, saveLocation } from '@/lib/api';
import { ZenithObject, CelestialFact, NominatimResult } from '@/types';
import Starfield from '@/components/Starfield';
import RadarView from '@/components/RadarView';
import DetailPanel from '@/components/DetailPanel';
import DynamicGlobeView from '@/components/DynamicGlobeView';

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    isConnected,
    reconnecting,
    zenithData,
    lastUpdate,
    subscribe,
    unsubscribe,
    updateTimeOffset,
  } = useSocket();

  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mode, setMode] = useState<'globe' | 'radar'>('globe');
  const [selectedObject, setSelectedObject] = useState<ZenithObject | null>(null);
  const [objectFact, setObjectFact] = useState<CelestialFact | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [discoveries, setDiscoveries] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    if (lat && lon) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (!isNaN(latNum) && !isNaN(lonNum)) {
        setLocation({ lat: latNum, lon: lonNum, name: `${latNum.toFixed(4)}°, ${lonNum.toFixed(4)}°` });
        setShowSearch(false);
      }
    } else {
      setShowSearch(true);
    }
  }, [searchParams]);

  // Subscribe when location changes
  useEffect(() => {
    if (location && isConnected && mode === 'radar') {
      subscribe(location.lat, location.lon, 20, timeOffset);
    }
    return () => {
      unsubscribe();
    };
  }, [location, isConnected, subscribe, unsubscribe, timeOffset, mode]);

  // Load discoveries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zenith-discoveries');
    if (saved) setDiscoveries(new Set(JSON.parse(saved)));
  }, []);

  // Discovery toast system
  useEffect(() => {
    if (!zenithData || mode !== 'radar') return;
    const toastMessages: Record<string, string> = {
      'sat_25544': '🛰️ You spotted the ISS!',
      'moon': '🌙 The Moon is near your zenith!',
      'sun': '☀️ The Sun is directly overhead!',
      'jupiter': '🪐 Jupiter is near your zenith!',
      'saturn': '💫 Saturn rings shine above you!',
      'venus': '✨ Venus, the morning star, is overhead!',
    };

    for (const obj of zenithData.objects) {
      if (toastMessages[obj.id] && !discoveries.has(obj.id)) {
        const newDiscoveries = new Set(discoveries);
        newDiscoveries.add(obj.id);
        setDiscoveries(newDiscoveries);
        localStorage.setItem('zenith-discoveries', JSON.stringify([...newDiscoveries]));
        setToast(toastMessages[obj.id]);
        setTimeout(() => setToast(null), 4000);
        break;
      }
    }
  }, [zenithData, discoveries, mode]);

  // Debounced search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchNominatim(query);
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        }
        setSearching(false);
      }, 400);
    },
    []
  );

  const selectLocation = useCallback(
    (lat: number, lon: number, name: string) => {
      setLocation({ lat, lon, name });
      setSearchResults([]);
      setSearchQuery('');
      setShowSearch(false);
      setMode('globe');

      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('lat', lat.toFixed(4));
      url.searchParams.set('lon', lon.toFixed(4));
      window.history.replaceState({}, '', url.toString());
    },
    []
  );

  const handleObjectClick = useCallback(async (obj: ZenithObject) => {
    setSelectedObject(obj);
    setShowDetail(true);
    try {
      const res = await fetchFactById(obj.id);
      setObjectFact(res.data);
    } catch {
      setObjectFact(null);
    }
  }, []);

  const handleSaveLocation = useCallback(async () => {
    if (!location) return;
    try {
      await saveLocation(location.name, location.lat, location.lon);
      setToast('📍 Location saved!');
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast('Failed to save location');
      setTimeout(() => setToast(null), 3000);
    }
  }, [location]);

  const handleTimeChange = useCallback(
    (offset: number) => {
      setTimeOffset(offset);
      updateTimeOffset(offset);
    },
    [updateTimeOffset]
  );

  return (
    <div className="relative min-h-screen bg-[#050a14] overflow-hidden">
      {mode === 'radar' && <Starfield />}

      {/* Top Nav */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 glass px-4 py-3"
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              🌌 Zenith
            </button>
            {location && (
              <span className="text-sm text-gray-400 hidden sm:inline">
                📍 {location.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Connection status */}
            {mode === 'radar' && (
              <div className="flex items-center gap-2 text-xs">
                <div
                  className={`w-2 h-2 rounded-full ${
                    reconnecting
                      ? 'bg-yellow-400 animate-pulse'
                      : isConnected
                      ? 'bg-green-400'
                      : 'bg-red-400'
                  }`}
                />
                <span className="text-gray-400 hidden sm:inline">
                  {reconnecting ? 'Reconnecting...' : isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            )}

            {mode === 'radar' && (
              <button
                onClick={() => setMode('globe')}
                className="text-sm px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                🌍 Back to Globe
              </button>
            )}

            <button
              onClick={() => setShowSearch(true)}
              className="text-sm px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              🔍 Search
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => location && setShowSearch(false)}
            />
            <motion.div
              className="relative w-full max-w-lg glass rounded-2xl p-6 space-y-4 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className="text-xl font-semibold text-white">
                🔍 Search Location
              </h2>
              <p className="text-sm text-gray-400">
                Type a city name or coordinates to find your sky
              </p>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="e.g. Tokyo, New York, London..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                autoFocus
                id="location-search"
                aria-label="Search for a location"
              />

              {/* Search results */}
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {searching && (
                  <div className="text-sm text-gray-400 py-2 text-center animate-pulse">
                    Searching...
                  </div>
                )}
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() =>
                      selectLocation(
                        parseFloat(result.lat),
                        parseFloat(result.lon),
                        result.display_name.split(',')[0]
                      )
                    }
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    📍 {result.display_name}
                  </button>
                ))}
              </div>

              {/* Quick locations */}
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-2">Quick picks:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'New York', lat: 40.7128, lon: -74.006 },
                    { name: 'London', lat: 51.5074, lon: -0.1278 },
                    { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
                    { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
                    { name: 'Delhi', lat: 28.6139, lon: 77.209 },
                  ].map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => selectLocation(loc.lat, loc.lon, loc.name)}
                      className="text-xs px-3 py-1.5 rounded-full border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {mode === 'globe' ? (
          <motion.div
            key="globe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pt-16 z-0"
          >
            <DynamicGlobeView
              location={location}
              onLocationSelect={(lat, lon, name) => selectLocation(lat, lon, name)}
              onScanLocation={() => setMode('radar')}
            />
          </motion.div>
        ) : (
          location && (
            <motion.div
              key="radar"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 pt-16 min-h-screen flex flex-col lg:flex-row"
            >
              {/* Radar Section */}
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                {/* Time Travel Slider */}
                <motion.div
                  className="w-full max-w-md mb-4 glass rounded-xl p-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">⏰ Time Travel</span>
                    <span className="text-xs text-cyan-400 font-mono">
                      {timeOffset === 0
                        ? 'Now'
                        : `${timeOffset > 0 ? '+' : ''}${timeOffset.toFixed(1)}h`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    step={0.5}
                    value={timeOffset}
                    onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #d4a843, #00d4ff ${
                        ((timeOffset + 6) / 12) * 100
                      }%, #1a1a3a ${((timeOffset + 6) / 12) * 100}%)`,
                    }}
                    aria-label="Time travel slider"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>-6h</span>
                    <span>Now</span>
                    <span>+6h</span>
                  </div>
                </motion.div>

                {/* Radar */}
                <RadarView
                  objects={zenithData?.objects || []}
                  onObjectClick={handleObjectClick}
                  isLive={isConnected}
                  lastUpdate={lastUpdate}
                />

                {/* Object count */}
                {zenithData && (
                  <motion.div
                    className="mt-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <span className="text-sm text-gray-400">
                      {zenithData.objectCount} object{zenithData.objectCount !== 1 ? 's' : ''} near zenith
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Object List Sidebar */}
              <motion.aside
                className="w-full lg:w-80 glass lg:min-h-screen overflow-y-auto p-4 space-y-2"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-300">Overhead Objects</h2>
                  <button
                    onClick={handleSaveLocation}
                    className="text-xs px-2 py-1 rounded-lg border border-gold-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                    title="Save this location"
                  >
                    📌 Save
                  </button>
                </div>

                {!zenithData && (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                         key={i}
                         className="h-16 rounded-lg bg-white/5 animate-pulse"
                      />
                    ))}
                  </div>
                )}

                {zenithData?.objects.map((obj) => (
                  <motion.button
                    key={obj.id}
                    onClick={() => handleObjectClick(obj)}
                    className="w-full text-left p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                    whileHover={{ scale: 1.01 }}
                    layout
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{obj.icon || '✨'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {obj.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {obj.type} • {obj.elevation.toFixed(1)}° elev
                        </p>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: obj.color || '#fff' }}
                      />
                    </div>
                  </motion.button>
                ))}

                {zenithData && zenithData.objects.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No objects near zenith right now.
                    <br />
                    Try adjusting the time slider!
                  </div>
                )}
              </motion.aside>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Detail Panel */}
      <DetailPanel
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        object={selectedObject}
        fact={objectFact}
      />

      {/* Discovery Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-6 py-3 text-sm font-medium text-white shadow-2xl"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              border: '1px solid rgba(0, 212, 255, 0.3)',
              boxShadow: '0 0 40px rgba(0, 212, 255, 0.15)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050a14] flex items-center justify-center">
          <div className="text-cyan-400 animate-pulse text-lg">Loading...</div>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
