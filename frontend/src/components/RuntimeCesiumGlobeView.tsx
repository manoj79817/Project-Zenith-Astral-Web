'use client';

import { useEffect, useRef, useState } from 'react';

interface GlobeViewProps {
  location: { lat: number; lon: number; name: string } | null;
  onLocationSelect: (lat: number, lon: number, name: string) => void;
  onScanLocation: () => void;
}

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
    Cesium?: any;
    __zenithCesiumPromise?: Promise<any>;
  }
}

function loadCesium() {
  if (window.Cesium) return Promise.resolve(window.Cesium);
  if (window.__zenithCesiumPromise) return window.__zenithCesiumPromise;

  window.CESIUM_BASE_URL = '/cesium';

  window.__zenithCesiumPromise = new Promise((resolve, reject) => {
    const existingCss = document.querySelector<HTMLLinkElement>('link[data-zenith-cesium-css]');
    if (!existingCss) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/cesium/Widgets/widgets.css';
      link.dataset.zenithCesiumCss = 'true';
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-zenith-cesium]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Cesium));
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = '/cesium/Cesium.js';
    script.async = true;
    script.dataset.zenithCesium = 'true';
    script.onload = () => resolve(window.Cesium);
    script.onerror = () => reject(new Error('Failed to load Cesium runtime'));
    document.body.appendChild(script);
  });

  return window.__zenithCesiumPromise;
}

export default function RuntimeCesiumGlobeView({
  location,
  onLocationSelect,
  onScanLocation,
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    let cancelled = false;
    let clickHandler: any = null;

    const start = async () => {
      try {
        const Cesium = await loadCesium();
        if (cancelled || !containerRef.current) return;

        Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || '';

        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          fullscreenButton: false,
          vrButton: false,
          shouldAnimate: true,
          baseLayer: false,
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        });

        viewerRef.current = viewer;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.baseColor = Cesium.Color.BLACK;
        viewer.scene.backgroundColor = Cesium.Color.BLACK;
        viewer.scene.skyAtmosphere.show = true;
        viewer.scene.sun.show = true;
        viewer.scene.moon.show = true;

        try {
          const imageryProvider = await Cesium.TileMapServiceImageryProvider.fromUrl(
            '/cesium/Assets/Textures/NaturalEarthII'
          );
          viewer.imageryLayers.addImageryProvider(imageryProvider);
        } catch {
          viewer.imageryLayers.addImageryProvider(
            new Cesium.OpenStreetMapImageryProvider({
              url: 'https://tile.openstreetmap.org/',
            })
          );
        }

        clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        clickHandler.setInputAction((movement: any) => {
          const cartesian = viewer.camera.pickEllipsoid(
            movement.position,
            viewer.scene.globe.ellipsoid
          );
          if (!cartesian) return;

          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          const lon = Cesium.Math.toDegrees(cartographic.longitude);
          onLocationSelectRef.current(lat, lon, `${lat.toFixed(4)} deg, ${lon.toFixed(4)} deg`);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        if (!cancelled) setStatus('ready');
      } catch (error) {
        console.error('[Cesium] Runtime globe failed:', error);
        if (!cancelled) setStatus('error');
      }
    };

    start();

    return () => {
      cancelled = true;
      if (clickHandler && !clickHandler.isDestroyed()) clickHandler.destroy();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) viewerRef.current.destroy();
      viewerRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !location || !viewerRef.current || !window.Cesium) return;

    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    const position = Cesium.Cartesian3.fromDegrees(location.lon, location.lat, 0);

    if (!markerRef.current) {
      markerRef.current = viewer.entities.add({
        position,
        point: {
          color: Cesium.Color.CYAN,
          pixelSize: 10,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: location.name,
          font: '14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -22),
        },
      });
    } else {
      markerRef.current.position = position;
      markerRef.current.label.text = location.name;
    }

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(location.lon, location.lat, 15000000),
      duration: 1.4,
    });
  }, [location, status]);

  return (
    <div className="relative h-full w-full bg-[#050a14]">
      <div ref={containerRef} className="absolute inset-0" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050a14]">
          <div className="text-xl text-cyan-400 animate-pulse">Loading 3D Globe...</div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#050a14] px-6 text-center">
          <div className="text-lg font-semibold text-cyan-300">3D globe could not start</div>
          <div className="max-w-md text-sm text-gray-400">
            Your browser may be blocking WebGL or the Cesium runtime. You can still search for a
            location and scan the sky.
          </div>
          {location && (
            <button
              onClick={onScanLocation}
              className="rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 font-bold text-white"
            >
              Scan This Location
            </button>
          )}
        </div>
      )}

      {status === 'ready' && location && (
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
