'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapComponentProps {
  latitude: number;
  longitude: number;
  onChangeCoords: (lat: number, lng: number) => void;
}

// Updater component to recenter map when latitude/longitude changes from outside
function ChangeMapView({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, map.getZoom());
  }, [coords, map]);
  return null;
}

export default function MapComponent({ latitude, longitude, onChangeCoords }: MapComponentProps) {
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('satellite');

  // Custom marker icon using an elegant inline SVG pin to avoid broken Leaflet default assets
  const customIcon = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return L.divIcon({
      html: `
        <div class="relative flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-9 h-9 text-rose-600 drop-shadow-lg">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
          <div class="absolute -top-1 w-2 h-2 rounded-full bg-white"></div>
        </div>
      `,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  }, []);

  const markerRef = useRef<L.Marker | null>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onChangeCoords(
            parseFloat(latLng.lat.toFixed(6)),
            parseFloat(latLng.lng.toFixed(6))
          );
        }
      },
    }),
    [onChangeCoords]
  );

  const position: [number, number] = [latitude, longitude];

  return (
    <div className="relative w-full h-full min-h-[400px] md:min-h-0 rounded-xl overflow-hidden border border-zinc-200 shadow-inner bg-zinc-100">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <ChangeMapView coords={position} />

        {mapType === 'satellite' ? (
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {customIcon && (
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
            icon={customIcon}
          />
        )}
      </MapContainer>

      {/* Layer selector overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex bg-white rounded-lg shadow-md border border-zinc-200 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`px-3 py-2 font-medium transition-all ${
            mapType === 'satellite'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          Satélite Esri
        </button>
        <button
          type="button"
          onClick={() => setMapType('osm')}
          className={`px-3 py-2 font-medium transition-all ${
            mapType === 'osm'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          Mapa (OSM)
        </button>
      </div>
    </div>
  );
}
