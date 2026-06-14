'use client';

import '@/lib/cesium-init';
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { Viewer, Scene, Globe, CameraFlyTo, Entity, PointGraphics, LabelGraphics } from 'resium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

interface GlobeViewProps {
  location: { lat: number; lon: number; name: string } | null;
  onLocationSelect: (lat: number, lon: number, name: string) => void;
  onScanLocation: () => void;
}

export default function GlobeView({ location, onLocationSelect, onScanLocation }: GlobeViewProps) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  
  useEffect(() => {
    Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || '';
  }, []);

  const handleClick = (movement: any) => {
    if (!viewerRef.current || !movement.position) return;
    const scene = viewerRef.current.scene;
    const ellipsoid = scene.globe.ellipsoid;
    const cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
    
    if (cartesian) {
      const cartographic = ellipsoid.cartesianToCartographic(cartesian);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      onLocationSelect(lat, lon, `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
    }
  };

  return (
    <div className="relative w-full h-full">
      <Viewer
        ref={(e) => {
          if (e && e.cesiumElement) {
            viewerRef.current = e.cesiumElement;
          }
        }}
        full
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        infoBox={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        selectionIndicator={false}
        onClick={handleClick}
        requestRenderMode={true}
        maximumRenderTimeChange={Infinity}
      >
        <Globe
          enableLighting={true} // Day/Night terminator shading
          baseColor={Cesium.Color.BLACK}
        />
        <Scene backgroundColor={Cesium.Color.BLACK} />
        
        {location && (
          <>
            <CameraFlyTo
              destination={Cesium.Cartesian3.fromDegrees(location.lon, location.lat, 15000000)}
              duration={2}
            />
            <Entity
              position={Cesium.Cartesian3.fromDegrees(location.lon, location.lat)}
              name={location.name}
              description="Selected location for Zenith tracking"
            >
              <PointGraphics color={Cesium.Color.CYAN} pixelSize={10} outlineColor={Cesium.Color.WHITE} outlineWidth={2} />
              <LabelGraphics
                text={location.name}
                font="14px sans-serif"
                fillColor={Cesium.Color.WHITE}
                outlineColor={Cesium.Color.BLACK}
                outlineWidth={2}
                style={Cesium.LabelStyle.FILL_AND_OUTLINE}
                pixelOffset={new Cesium.Cartesian2(0, -20)}
              />
            </Entity>
          </>
        )}
      </Viewer>

      {location && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center gap-3">
          <div className="bg-black/70 backdrop-blur text-white px-4 py-2 rounded-full border border-cyan-500/30 text-sm">
            📍 {location.name}
          </div>
          <button
            onClick={onScanLocation}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-full shadow-[0_0_15px_rgba(0,212,255,0.4)] hover:shadow-[0_0_25px_rgba(0,212,255,0.6)] transition-all"
          >
            Scan This Location
          </button>
        </div>
      )}
    </div>
  );
}
