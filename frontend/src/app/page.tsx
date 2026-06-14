'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import Starfield from '@/components/Starfield';

export default function Home() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleExplore = useCallback(() => {
    setIsTransitioning(true);

    // Try to get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          router.push(`/explore?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`);
        },
        () => {
          // Denied or error — proceed without coords
          router.push('/explore');
        },
        { timeout: 5000 }
      );
    } else {
      router.push('/explore');
    }
  }, [router]);

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <Starfield />

      {/* Content overlay */}
      <motion.div
        className="relative z-10 text-center px-6 max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: isTransitioning ? 0 : 1, y: isTransitioning ? -50 : 0 }}
        transition={{ duration: isTransitioning ? 0.6 : 1.2, ease: 'easeOut' }}
      >
        {/* Decorative orbital ring */}
        <motion.div
          className="absolute inset-0 -top-20 flex items-center justify-center pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="w-[500px] h-[500px] rounded-full border border-cyan-500/10"
            style={{
              background:
                'radial-gradient(circle, transparent 48%, rgba(0,212,255,0.03) 50%, transparent 52%)',
            }}
          />
        </motion.div>

        {/* Main title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold leading-none tracking-tight mb-2">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, #00d4ff 0%, #7b68ee 30%, #d4a843 60%, #00d4ff 100%)',
                backgroundSize: '200% auto',
                animation: 'shimmer 4s linear infinite',
              }}
            >
              Project Zenith
            </span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          className="text-xl sm:text-2xl md:text-3xl font-light tracking-[0.3em] uppercase mt-4 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          style={{
            color: '#d4a843',
            textShadow: '0 0 30px rgba(212, 168, 67, 0.3)',
          }}
        >
          The Celestial Eye
        </motion.p>

        {/* Tagline */}
        <motion.p
          className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          See the cosmos above any point on Earth in real time.
          <br />
          Track satellites, planets, and constellations at your zenith.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          onClick={handleExplore}
          disabled={isTransitioning}
          className="group relative inline-flex items-center gap-3 px-10 py-4 text-lg font-semibold rounded-full
            bg-gradient-to-r from-cyan-500/20 to-blue-600/20
            border border-cyan-400/40 text-cyan-300
            hover:border-cyan-400/80 hover:text-white
            transition-all duration-500 cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Start exploring the sky"
          id="explore-cta"
        >
          {/* Hover glow */}
          <span className="absolute inset-0 rounded-full bg-cyan-400/0 group-hover:bg-cyan-400/10 transition-all duration-500" />
          <span className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
            }}
          />

          <span className="relative">🔭</span>
          <span className="relative">Explore the Sky Above You</span>

          <motion.span
            className="relative"
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            →
          </motion.span>
        </motion.button>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 2.5, duration: 1 }}
        >
          <motion.div
            className="w-6 h-10 rounded-full border border-white/20 flex justify-center pt-2"
            aria-hidden="true"
          >
            <motion.div
              className="w-1 h-2 bg-cyan-400/60 rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* CSS animation for shimmer */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </main>
  );
}
