import dynamic from 'next/dynamic';

const DynamicGlobeView = dynamic(() => import('./LightweightGlobeView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#050a14]">
      <div className="text-cyan-400 animate-pulse text-xl">Loading Globe...</div>
    </div>
  ),
});

export default DynamicGlobeView;
