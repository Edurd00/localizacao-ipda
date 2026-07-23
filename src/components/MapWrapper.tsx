'use client';

import dynamic from 'next/dynamic';

interface MapWrapperProps {
  latitude: number;
  longitude: number;
  onChangeCoords: (lat: number, lng: number) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  mapType?: 'osm' | 'satellite';
  onMapTypeChange?: (mapType: 'osm' | 'satellite') => void;
}

const MapWrapper = dynamic<MapWrapperProps>(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-zinc-100 border border-zinc-200 rounded-xl">
      <div className="flex flex-col items-center space-y-2">
        <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs text-zinc-500 font-medium">Carregando mapa interativo...</p>
      </div>
    </div>
  ),
});

export default MapWrapper;
