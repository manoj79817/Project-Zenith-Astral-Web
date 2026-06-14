'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ZenithObject, CelestialFact } from '@/types';

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  object: ZenithObject | null;
  fact: CelestialFact | null;
}

export default function DetailPanel({
  isOpen,
  onClose,
  object,
  fact,
}: DetailPanelProps) {
  if (!object) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{object.icon || '✨'}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {object.name}
                    </h2>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{
                        backgroundColor: (object.color || '#444') + '30',
                        color: object.color || '#aaa',
                        border: `1px solid ${(object.color || '#444')}40`,
                      }}
                    >
                      {object.type}
                      {object.category ? ` — ${object.category}` : ''}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close detail panel"
                >
                  ✕
                </button>
              </div>

              {/* Live Stats */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Elevation"
                  value={`${object.elevation.toFixed(1)}°`}
                  color={object.color}
                />
                <StatCard
                  label="Azimuth"
                  value={`${object.azimuth.toFixed(1)}°`}
                  color={object.color}
                />
                {object.distance !== undefined && (
                  <StatCard
                    label="Distance"
                    value={
                      object.type === 'satellite'
                        ? `${object.distance.toLocaleString()} km`
                        : `${object.distance} AU`
                    }
                    color={object.color}
                  />
                )}
                {object.speed !== undefined && (
                  <StatCard
                    label="Speed"
                    value={`${object.speed.toFixed(1)} km/s`}
                    color={object.color}
                  />
                )}
                {object.magnitude !== undefined && (
                  <StatCard
                    label="Magnitude"
                    value={`${object.magnitude}`}
                    color={object.color}
                  />
                )}
              </div>

              {/* Description */}
              {fact && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">
                      About
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {fact.description}
                    </p>
                  </div>

                  {/* Fun Facts */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">
                      ✨ Did You Know?
                    </h3>
                    <div className="space-y-2">
                      {fact.facts.map((f, i) => (
                        <motion.div
                          key={i}
                          className="flex gap-2 text-sm text-gray-400"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <span className="text-cyan-500 shrink-0">•</span>
                          <span>{f}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!fact && (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-sm animate-pulse">
                    Loading facts...
                  </div>
                </div>
              )}

              {/* Constellation Stars */}
              {object.type === 'constellation' && object.stars && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">
                    ⭐ Stars
                  </h3>
                  <div className="space-y-1">
                    {object.stars
                      .filter((s) => s.elevation !== undefined && s.elevation > 0)
                      .sort((a, b) => (b.elevation || 0) - (a.elevation || 0))
                      .map((star) => (
                        <div
                          key={star.name}
                          className="flex justify-between text-xs text-gray-400 py-1 border-b border-white/5"
                        >
                          <span>{star.name}</span>
                          <span>
                            {star.elevation?.toFixed(1)}° | mag {star.mag}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{
        backgroundColor: (color || '#444') + '10',
        border: `1px solid ${(color || '#444')}20`,
      }}
    >
      <p className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p
        className="text-lg font-semibold font-mono"
        style={{ color: color || '#fff' }}
      >
        {value}
      </p>
    </div>
  );
}
