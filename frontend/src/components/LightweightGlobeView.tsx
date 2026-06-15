'use client';

import { useEffect, useRef } from 'react';

interface GlobeViewProps {
  location: { lat: number; lon: number; name: string } | null;
  onLocationSelect: (lat: number, lon: number, name: string) => void;
  onScanLocation: () => void;
}

function projectPoint(lat: number, lon: number, rotation: number, radius: number) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = ((lon + rotation) * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const x = radius * cosLat * Math.sin(lonRad);
  const y = -radius * Math.sin(latRad);
  const z = cosLat * Math.cos(lonRad);

  return { x, y, visible: z > -0.08 };
}

export default function LightweightGlobeView({
  location,
  onLocationSelect,
  onScanLocation,
}: GlobeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let animationId = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawGreatCircle = (
      points: Array<{ lat: number; lon: number }>,
      rotation: number,
      cx: number,
      cy: number,
      radius: number
    ) => {
      let drawing = false;
      ctx.beginPath();

      for (const point of points) {
        const projected = projectPoint(point.lat, point.lon, rotation, radius);
        if (!projected.visible) {
          drawing = false;
          continue;
        }

        const x = cx + projected.x;
        const y = cy + projected.y;
        if (!drawing) {
          ctx.moveTo(x, y);
          drawing = true;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.32;
      const rotation = frame * 0.04;

      ctx.clearRect(0, 0, width, height);

      const space = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.65);
      space.addColorStop(0, '#09172a');
      space.addColorStop(0.62, '#050a14');
      space.addColorStop(1, '#02040a');
      ctx.fillStyle = space;
      ctx.fillRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.45);
      glow.addColorStop(0, 'rgba(0, 212, 255, 0.18)');
      glow.addColorStop(0.58, 'rgba(0, 88, 160, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      const earth = ctx.createRadialGradient(
        cx - radius * 0.32,
        cy - radius * 0.34,
        radius * 0.08,
        cx,
        cy,
        radius
      );
      earth.addColorStop(0, '#1dd8ff');
      earth.addColorStop(0.32, '#0d5c9f');
      earth.addColorStop(0.72, '#092a4d');
      earth.addColorStop(1, '#020815');
      ctx.fillStyle = earth;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = 'rgba(163, 229, 255, 0.2)';
      ctx.lineWidth = 1;

      for (let lat = -60; lat <= 60; lat += 30) {
        const points = Array.from({ length: 145 }, (_, i) => ({
          lat,
          lon: -180 + i * 2.5,
        }));
        drawGreatCircle(points, rotation, cx, cy, radius);
      }

      for (let lon = -180; lon < 180; lon += 30) {
        const points = Array.from({ length: 73 }, (_, i) => ({
          lat: -90 + i * 2.5,
          lon,
        }));
        drawGreatCircle(points, rotation, cx, cy, radius);
      }

      ctx.fillStyle = 'rgba(60, 180, 130, 0.34)';
      for (const land of [
        { lat: 22, lon: 78, w: 34, h: 24 },
        { lat: 7, lon: 20, w: 46, h: 36 },
        { lat: 48, lon: 12, w: 32, h: 18 },
        { lat: -15, lon: 134, w: 34, h: 20 },
        { lat: -15, lon: -60, w: 28, h: 42 },
        { lat: 42, lon: -100, w: 48, h: 24 },
      ]) {
        const point = projectPoint(land.lat, land.lon, rotation, radius);
        if (!point.visible) continue;
        ctx.beginPath();
        ctx.ellipse(cx + point.x, cy + point.y, land.w, land.h, 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

      const selected = locationRef.current;
      if (selected) {
        const marker = projectPoint(selected.lat, selected.lon, rotation, radius);
        if (marker.visible) {
          const x = cx + marker.x;
          const y = cy + marker.y;
          ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(x, y, 18 + Math.sin(frame * 0.08) * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#00d4ff';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      ctx.restore();

      ctx.strokeStyle = 'rgba(170, 230, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      frame += 1;
      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.32;
    const x = event.clientX - rect.left - cx;
    const y = event.clientY - rect.top - cy;
    const distance = Math.hypot(x, y);

    if (distance > radius) return;

    const lat = Math.max(-90, Math.min(90, -(Math.asin(y / radius) * 180) / Math.PI));
    const lon = Math.max(-180, Math.min(180, (Math.atan2(x, Math.sqrt(radius * radius - distance * distance)) * 180) / Math.PI));
    onLocationSelect(lat, lon, `${lat.toFixed(4)} deg, ${lon.toFixed(4)} deg`);
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        aria-label="Interactive globe view"
      />

      {location && (
        <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
          <div className="rounded-full border border-cyan-500/30 bg-black/70 px-4 py-2 text-sm text-white backdrop-blur">
            {location.name}
          </div>
          <button
            onClick={onScanLocation}
            className="rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 font-bold text-white shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all hover:from-cyan-500 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(0,212,255,0.6)]"
          >
            Scan This Location
          </button>
        </div>
      )}
    </div>
  );
}
