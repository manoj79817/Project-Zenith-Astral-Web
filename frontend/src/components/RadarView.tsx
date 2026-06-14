'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { ZenithObject } from '@/types';
import { motion } from 'framer-motion';

interface RadarViewProps {
  objects: ZenithObject[];
  onObjectClick: (obj: ZenithObject) => void;
  isLive: boolean;
  lastUpdate: Date | null;
}

// Convert elevation (0-90) and azimuth (0-360) to radar X,Y coordinates
// Center = zenith (90°), Edge = horizon (0°)
function toRadarCoords(
  elevation: number,
  azimuth: number,
  radius: number
): { x: number; y: number } {
  const r = ((90 - elevation) / 90) * radius;
  const angle = ((azimuth - 90) * Math.PI) / 180; // -90 so North is up
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
  };
}

export default function RadarView({
  objects,
  onObjectClick,
  isLive,
  lastUpdate,
}: RadarViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const currentPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lerpT = useRef(0);
  const hoverObj = useRef<ZenithObject | null>(null);
  const tooltipPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const size = useMemo(() => {
    if (typeof window === 'undefined') return 450;
    return Math.min(window.innerWidth - 40, 500);
  }, []);

  const radius = size / 2 - 30;

  // Update target positions when objects change
  useEffect(() => {
    prevPositions.current = new Map(currentPositions.current);
    lerpT.current = 0;

    const newPositions = new Map<string, { x: number; y: number }>();
    for (const obj of objects) {
      const pos = toRadarCoords(obj.elevation, obj.azimuth, radius);
      newPositions.set(obj.id, pos);
    }
    currentPositions.current = newPositions;
  }, [objects, radius]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    // Background
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius + 20);
    bgGrad.addColorStop(0, 'rgba(0, 30, 60, 0.8)');
    bgGrad.addColorStop(0.7, 'rgba(5, 15, 35, 0.9)');
    bgGrad.addColorStop(1, 'rgba(3, 8, 20, 0.95)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
    ctx.fill();

    // Concentric elevation rings
    const elevations = [0, 20, 40, 60, 80, 90];
    for (const elev of elevations) {
      const r = ((90 - elev) / 90) * radius;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle =
        elev === 90
          ? 'rgba(0, 212, 255, 0.5)'
          : 'rgba(100, 150, 255, 0.1)';
      ctx.lineWidth = elev === 90 ? 2 : 1;
      ctx.stroke();

      if (elev > 0 && elev < 90) {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.25)';
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText(`${elev}°`, cx + r + 3, cy - 2);
      }
    }

    // Azimuth radial lines
    const directions = [
      { angle: 0, label: 'N' },
      { angle: 90, label: 'E' },
      { angle: 180, label: 'S' },
      { angle: 270, label: 'W' },
    ];

    for (const dir of directions) {
      const angle = ((dir.angle - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      const labelR = radius + 14;
      ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        dir.label,
        cx + labelR * Math.cos(angle),
        cy + labelR * Math.sin(angle)
      );
    }

    // Zenith label
    ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
    ctx.font = '8px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ZENITH', cx, cy - 6);

    // Smooth lerp interpolation
    lerpT.current = Math.min(lerpT.current + 0.08, 1);
    const t = lerpT.current;

    // Draw objects
    for (const obj of objects) {
      const target = currentPositions.current.get(obj.id);
      const prev = prevPositions.current.get(obj.id);
      if (!target) continue;

      let x: number, y: number;
      if (prev && t < 1) {
        x = prev.x + (target.x - prev.x) * t;
        y = prev.y + (target.y - prev.y) * t;
      } else {
        x = target.x;
        y = target.y;
      }

      const px = cx + x;
      const py = cy + y;
      const color = obj.color || '#ffffff';
      const time = Date.now() / 1000;

      if (obj.type === 'satellite') {
        // Pulsing dot with glow
        const pulse = 0.7 + 0.3 * Math.sin(time * 3 + parseInt(obj.id.replace(/\D/g, '') || '0'));
        const dotSize = obj.id.includes('25544') ? 5 : 3; // ISS bigger

        // Glow
        const glow = ctx.createRadialGradient(px, py, 0, px, py, dotSize * 4);
        glow.addColorStop(0, color + '60');
        glow.addColorStop(1, color + '00');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, dotSize * 4, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(px, py, dotSize * pulse, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // ISS trail
        if (obj.id.includes('25544') && prev) {
          ctx.beginPath();
          ctx.moveTo(cx + prev.x, cy + prev.y);
          ctx.lineTo(px, py);
          ctx.strokeStyle = color + '40';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (obj.type === 'sun') {
        // Glowing sun
        const sunGlow = ctx.createRadialGradient(px, py, 0, px, py, 25);
        sunGlow.addColorStop(0, '#ffd70080');
        sunGlow.addColorStop(0.5, '#ffd70030');
        sunGlow.addColorStop(1, '#ffd70000');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(px, py, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
      } else if (obj.type === 'moon') {
        // Moon
        const moonGlow = ctx.createRadialGradient(px, py, 0, px, py, 18);
        moonGlow.addColorStop(0, '#c0c0c060');
        moonGlow.addColorStop(1, '#c0c0c000');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(px, py, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#e0e0e0';
        ctx.fill();
      } else if (obj.type === 'planet') {
        // Planet
        const planetGlow = ctx.createRadialGradient(px, py, 0, px, py, 14);
        planetGlow.addColorStop(0, color + '50');
        planetGlow.addColorStop(1, color + '00');
        ctx.fillStyle = planetGlow;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else if (obj.type === 'constellation' && obj.stars) {
        // Draw constellation lines and stars
        if (obj.lines) {
          ctx.strokeStyle = (obj.color || '#87ceeb') + '30';
          ctx.lineWidth = 0.8;
          for (const [i, j] of obj.lines) {
            const s1 = obj.stars[i];
            const s2 = obj.stars[j];
            if (!s1 || !s2 || s1.elevation === undefined || s2.elevation === undefined) continue;
            const p1 = toRadarCoords(s1.elevation, s1.azimuth!, radius);
            const p2 = toRadarCoords(s2.elevation, s2.azimuth!, radius);
            ctx.beginPath();
            ctx.moveTo(cx + p1.x, cy + p1.y);
            ctx.lineTo(cx + p2.x, cy + p2.y);
            ctx.stroke();
          }
        }

        // Stars
        for (const star of obj.stars) {
          if (star.elevation === undefined || star.elevation < 0) continue;
          const sp = toRadarCoords(star.elevation, star.azimuth!, radius);
          const starSize = Math.max(1, 3 - star.mag);
          ctx.beginPath();
          ctx.arc(cx + sp.x, cy + sp.y, starSize, 0, Math.PI * 2);
          ctx.fillStyle = (obj.color || '#87ceeb') + 'a0';
          ctx.fill();
        }

        // Constellation label
        ctx.fillStyle = (obj.color || '#87ceeb') + '80';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(obj.name, px, py - 8);
      }
    }

    // Sweep line (rotating radar effect)
    const sweepTime = Date.now() / 1000;
    const sweepAngle = (sweepTime * 0.5) % (Math.PI * 2);
    const sweepGrad = ctx.createConicGradient(sweepAngle, cx, cy);
    sweepGrad.addColorStop(0, 'rgba(0, 212, 255, 0.06)');
    sweepGrad.addColorStop(0.05, 'rgba(0, 212, 255, 0)');
    sweepGrad.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    animRef.current = requestAnimationFrame(draw);
  }, [objects, size, radius]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Handle clicks on canvas
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = size / 2;
      const cy = size / 2;

      for (const obj of objects) {
        const pos = currentPositions.current.get(obj.id);
        if (!pos) continue;
        const px = cx + pos.x;
        const py = cy + pos.y;
        const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
        if (dist < 15) {
          onObjectClick(obj);
          return;
        }
      }
    },
    [objects, size, onObjectClick]
  );

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, cursor: 'pointer' }}
        onClick={handleCanvasClick}
        aria-label="Zenith radar view showing celestial objects overhead"
      />

      {/* Live indicator */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50 text-[10px]">
        {isLive && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        )}
        <span className="text-gray-400">
          {lastUpdate
            ? `Updated ${Math.floor(
                (Date.now() - lastUpdate.getTime()) / 1000
              )}s ago`
            : 'Connecting...'}
        </span>
      </div>
    </motion.div>
  );
}
