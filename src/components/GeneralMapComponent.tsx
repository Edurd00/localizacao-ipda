'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import {
  Filter,
  Layers,
  Search,
  Building2,
  ExternalLink,
  MapPin,
  X,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  GitBranch,
  Lock,
} from 'lucide-react';
import { Igreja } from '@/lib/db';
import { Toaster, toast } from 'sonner';

// Strict Church classification by porte based on 'desc_igreja'
export function getPorte(desc: string): string {
  const normalized = desc.toUpperCase();
  if (normalized.includes('ESTADUAL')) return 'ESTADUAL';
  if (normalized.includes('SETORIAL')) return 'SETORIAL';
  if (normalized.includes('CENTRAL')) return 'CENTRAL';
  if (normalized.includes('REGIONAL')) return 'REGIONAL';
  if (
    normalized.includes('CASA DE ORAÇÃO') ||
    normalized.includes('CASA DE ORACOA') ||
    normalized.includes('ORAÇÃO') ||
    normalized.includes('ORACAO')
  ) {
    return 'CASA DE ORAÇÃO';
  }
  if (
    normalized.includes('ALDEIA') ||
    normalized.includes('INDIGENA') ||
    normalized.includes('INDÍGENA')
  ) {
    return 'ALDEIA INDIGENA';
  }
  return 'LOCAL';
}

// Map of precise official colors (as requested for high-contrast on satellite imagery)
export const PORTE_INFO: Record<string, { name: string; color: string; label: string }> = {
  ESTADUAL: { name: 'ESTADUAL', color: '#3B82F6', label: 'Estadual (Azul)' },
  SETORIAL: { name: 'SETORIAL', color: '#EAB308', label: 'Setorial (Amarelo)' },
  CENTRAL: { name: 'CENTRAL', color: '#F97316', label: 'Central (Laranja)' },
  REGIONAL: { name: 'REGIONAL', color: '#22C55E', label: 'Regional (Verde)' },
  LOCAL: { name: 'LOCAL', color: '#8B5CF6', label: 'Local (Roxo Suave)' },
  'CASA DE ORAÇÃO': { name: 'CASA DE ORAÇÃO', color: '#EC4899', label: 'Casa de Oração (Rosa/Carmesim)' },
  'ALDEIA INDIGENA': { name: 'ALDEIA INDIGENA', color: '#00FFFF', label: 'Aldeia Indígena (Ciano/Turquesa)' },
};

export const REGIAO_GEOGRAFICA_MAPPING: Record<string, string[]> = {
  'Sudeste - SP': ['SP'],
  'Sudeste - MG': ['MG'],
  'Sudeste - ES e RJ': ['ES', 'RJ'],
  'Sul': ['PR', 'RS', 'SC'],
  'Norte': ['AC', 'AM', 'RO', 'PA', 'AP', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'RN', 'PE', 'PI', 'MA', 'PB', 'SE'],
  'Centro-Oeste': ['MT', 'DF', 'GO', 'MS'],
};

export const REGIAO_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  'Sudeste - SP': [[-25.3, -53.1], [-19.7, -44.1]],
  'Sudeste - MG': [[-23.0, -51.1], [-14.2, -39.8]],
  'Sudeste - ES e RJ': [[-23.4, -44.9], [-17.8, -39.6]],
  'Sul': [[-33.8, -57.6], [-22.5, -48.0]],
  'Norte': [[-13.7, -74.0], [5.3, -46.0]],
  'Nordeste': [[-18.4, -48.8], [-1.0, -34.7]],
  'Centro-Oeste': [[-24.0, -61.6], [-12.5, -46.0]],
  'ALL': [[-33.8, -74.0], [5.3, -34.7]],
};

export const REGIAO_TO_ESTADUAIS: Record<string, string[]> = {
  'Sudeste - SP': ["Grande Sao Paulo - SP", "Interior - SP"],
  'Sudeste - MG': ["Regiao Minas Gerais"],
  'Sudeste - ES e RJ': ["Regiao Rio de Janeiro / Espirito Santo"],
  'Sul': ["Regiao Sul"],
  'Norte': ["Regiao Norte"],
  'Nordeste': ["Regiao Nordeste"],
  'Centro-Oeste': ["Regiao Centro-Oeste"],
};

export const REGOES_ESTADUAIS = {
  "Grande Sao Paulo - SP": [
    { nome: "Sede Mundial", totvs: "" },
    { nome: "Franco da Rocha - SP", totvs: "16332" },
    { nome: "Guarulhos - SP", totvs: "16245" },
    { nome: "Itaquaquecetuba - SP", totvs: "15937" },
    { nome: "Maua - SP", totvs: "9289" },
    { nome: "Mogi das Cruzes - SP", totvs: "15968" },
    { nome: "Santo Andre - SP", totvs: "9318" },
    { nome: "Sao Bernardo do Campo - SP", totvs: "9325" },
    { nome: "Sao Mateus - SP", totvs: "16037" },
    { nome: "Campo Limpo - SP", totvs: "16588" },
    { nome: "Santo Amaro - SP", totvs: "16883" },
    { nome: "Osasco - SP", totvs: "16501" }
  ],
  "Interior - SP": [
    { nome: "Bauru - SP", totvs: "13753" },
    { nome: "Campinas - SP", totvs: "13901" },
    { nome: "Itapeva - SP", totvs: "14339" },
    { nome: "Ribeirao Preto - SP", totvs: "14463" },
    { nome: "Jundiai - SP", totvs: "14661" },
    { nome: "Marilia - SP", totvs: "14756" },
    { nome: "Piracicaba - SP", totvs: "15104" },
    { nome: "Presidente Prudente - SP", totvs: "15213" },
    { nome: "Registro - SP", totvs: "15252" },
    { nome: "Sao Jose do Rio Preto - SP", totvs: "15449" },
    { nome: "Sao Jose dos Campos - SP", totvs: "15463" },
    { nome: "Sorocaba - SP", totvs: "15551" }
  ],
  "Litoral - SP": [
    { nome: "Santos - SP", totvs: "15392" }
  ],
  "Espirito Santo": [
    { nome: "Estadual Vitoria - ES", totvs: "17250" },
    { nome: "Estadual Linhares - ES", totvs: "9740" }
  ],
  "Rio de Janeiro": [
    { nome: "Estadual Sao Goncalo - RJ", totvs: "12528" },
    { nome: "Estadual Campos dos Goytacazes - RJ", totvs: "12720" },
    { nome: "Estadual Duque de Caxias - RJ", totvs: "12765" },
    { nome: "Estadual Niteroi - RJ", totvs: "13061" },
    { nome: "Estadual Nova Iguacu - RJ", totvs: "13103" },
    { nome: "Estadual Petropolis - RJ", totvs: "13166" },
    { nome: "Estadual Senador Pompeu - RJ", totvs: "17263" },
    { nome: "Estadual Campo Grande - RJ", totvs: "12704" }
  ],
  "Minas Gerais": [
    { nome: "Estadual Gameleira - Cabana - MG", totvs: "10248" },
    { nome: "Estadual Belo Horizonte - Guaicurus - MG", totvs: "10848" },
    { nome: "Estadual Governador Valadares - MG", totvs: "10808" },
    { nome: "Estadual Juiz de Fora - MG", totvs: "11074" },
    { nome: "Estadual Muriae - MG", totvs: "11548" },
    { nome: "Estadual Uberlandia - MG", totvs: "12374" },
    { nome: "Estadual Montes Claros - MG", totvs: "11502" }
  ],
  "Norte": [
    { nome: "AC - Cruzeiro do Sul", totvs: "7468" },
    { nome: "AC - Rio Branco", totvs: "17290" },
    { nome: "AM - Manaus", totvs: "17290" },
    { nome: "AM - Tabatinga", totvs: "7874" },
    { nome: "AM - Tefe", totvs: "7881" },
    { nome: "AM - Tonantins", totvs: "7897" },
    { nome: "PA - Breves", totvs: "8141" },
    { nome: "PA - Itaituba", totvs: "8339" },
    { nome: "PA - Maraba", totvs: "8431" },
    { nome: "PA - Belem", totvs: "17268" },
    { nome: "PA - Santarem", totvs: "8706" },
    { nome: "RO - Ji Parana", totvs: "8901" },
    { nome: "RO - Porto Velho", totvs: "8933" },
    { nome: "TO - Palmas", totvs: "9162" },
    { nome: "AP - Macapa", totvs: "7932" },
    { nome: "RR - Boa Vista", totvs: "17226" }
  ],
  "Nordeste": [
    { nome: "Maceio", totvs: "4760" },
    { nome: "Salvador", totvs: "5624" },
    { nome: "Teixeira de Freitas", totvs: "5786" },
    { nome: "Vitoria da Conquista", totvs: "5851" },
    { nome: "Juazeiro do Norte", totvs: "6047" },
    { nome: "Fortaleza", totvs: "6082" },
    { nome: "Sobral", totvs: "6388" },
    { nome: "Balsas", totvs: "6430" },
    { nome: "Imperatriz", totvs: "6456" },
    { nome: "Sao Luis", totvs: "6547" },
    { nome: "Campina Grande", totvs: "6595" },
    { nome: "Joao Pessoa", totvs: "6642" },
    { nome: "Petrolina", totvs: "6895" },
    { nome: "Natal", totvs: "7167" },
    { nome: "Aracaju", totvs: "17229" },
    { nome: "Recife", totvs: "17273" },
    { nome: "Teresina", totvs: "17274" }
  ],
  "Centro-Oeste": [
    { nome: "Estadual Brasilia - DF", totvs: "3408" },
    { nome: "Estadual Goiania - GO", totvs: "3575" },
    { nome: "Estadual Campo Grande - MS", totvs: "4232" },
    { nome: "Estadual Confresa - MT", totvs: "4533" },
    { nome: "Estadual Cuiaba - MT", totvs: "4554" }
  ],
  "Regiao Sul": [
    { nome: "Estadual Cascavel - PR", totvs: "241" },
    { nome: "Estadual Curitiba - PR", totvs: "363" },
    { nome: "Estadual Guarapuava - PR", totvs: "509" },
    { nome: "Estadual Londrina - PR", totvs: "748" },
    { nome: "Estadual Ponta Grossa - PR", totvs: "988" },
    { nome: "Estadual Caxias do Sul - RS", totvs: "1554" },
    { nome: "Estadual Passo Fundo - RS", totvs: "1944" },
    { nome: "Estadual Pelotas - RS", totvs: "1976" },
    { nome: "Estadual Santana do Livramento - RS", totvs: "2093" },
    { nome: "Estadual Porto Alegre - RS", totvs: "17262" },
    { nome: "Estadual Santa Maria - RS", totvs: "17591" },
    { nome: "Estadual Chapeco - SC", totvs: "2584" },
    { nome: "Estadual Florianopolis - SC", totvs: "2933" },
    { nome: "Estadual Lages - SC", totvs: "3033" },
    { nome: "Estadual Joinville - SC", totvs: "3122" }
  ]
};

// Component to recenter/refocus map programmatically when filters change
function MapController({
  center,
  zoom,
  flyToTarget,
  onFlyToComplete,
}: {
  center: [number, number];
  zoom: number;
  flyToTarget: { center: [number, number]; zoom: number; totvs: string } | null;
  onFlyToComplete: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (flyToTarget) {
      map.flyTo(flyToTarget.center, flyToTarget.zoom, {
        animate: true,
        duration: 1.5,
      });
      const timer = setTimeout(() => {
        onFlyToComplete();
      }, 1600);
      return () => clearTimeout(timer);
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, flyToTarget, map, onFlyToComplete]);
  return null;
}

// Component to dynamically fit bounds of the selected Region Filter
function RegionBoundsController({ region, igrejas }: { region: string; igrejas: Igreja[] }) {
  const map = useMap();
  useEffect(() => {
    if (!region) return;

    if (region === 'ALL') {
      const validChurches = igrejas.filter((ig) => ig.latitude && ig.longitude);
      if (validChurches.length > 0) {
        const points = validChurches.map((ig) => [ig.latitude!, ig.longitude!] as [number, number]);
        map.fitBounds(points, {
          padding: [50, 50],
          maxZoom: 6,
          animate: true,
          duration: 1.2,
        });
      } else {
        // Fallback to static Brazil Bounding Box
        map.fitBounds(REGIAO_BOUNDS['ALL'], {
          padding: [50, 50],
          animate: true,
          duration: 1.2,
        });
      }
    } else {
      const staticBounds = REGIAO_BOUNDS[region];
      if (staticBounds) {
        map.fitBounds(staticBounds, {
          padding: [50, 50],
          animate: true,
          duration: 1.2,
        });
      } else {
        const ufs = REGIAO_GEOGRAFICA_MAPPING[region];
        if (ufs && ufs.length > 0) {
          const regionChurches = igrejas.filter(
            (ig) => ufs.includes(ig.estado) && ig.latitude && ig.longitude
          );
          if (regionChurches.length > 0) {
            const points = regionChurches.map((ig) => [ig.latitude!, ig.longitude!] as [number, number]);
            map.fitBounds(points, {
              padding: [50, 50],
              maxZoom: 12,
              animate: true,
              duration: 1.2,
            });
          }
        }
      }
    }
  }, [region, igrejas, map]);
  return null;
}

// Component to dynamically fit bounds of connection paths, routes, or comparison routes
function MapBoundsController({
  bounds,
  routePath,
  routeAtual,
  routeCandidataA,
  routeCandidataB,
}: {
  bounds: any[] | null;
  routePath: [number, number][] | null;
  routeAtual: [number, number][] | null;
  routeCandidataA: [number, number][] | null;
  routeCandidataB: [number, number][] | null;
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];
    if (routePath && routePath.length >= 2) {
      points.push(...routePath);
    }
    if (routeAtual && routeAtual.length >= 2) {
      points.push(...routeAtual);
    }
    if (routeCandidataA && routeCandidataA.length >= 2) {
      points.push(...routeCandidataA);
    }
    if (routeCandidataB && routeCandidataB.length >= 2) {
      points.push(...routeCandidataB);
    }

    if (points.length >= 2) {
      map.fitBounds(points, {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
        duration: 1.2,
      });
      return;
    }

    if (bounds && bounds.length > 0) {
      // Safely flatten any 2D segment arrays to a single flat LatLngExpression list
      const flatPoints: [number, number][] = [];

      const processItem = (item: any) => {
        if (Array.isArray(item) && typeof item[0] === 'number' && typeof item[1] === 'number') {
          flatPoints.push(item as [number, number]);
        } else if (Array.isArray(item)) {
          item.forEach(processItem);
        }
      };

      bounds.forEach(processItem);

      if (flatPoints.length >= 2) {
        map.fitBounds(flatPoints, {
          padding: [50, 50],
          maxZoom: 15,
          animate: true,
          duration: 1.2,
        });
      }
    }
  }, [bounds, routePath, routeAtual, routeCandidataA, routeCandidataB, map]);
  return null;
}

export interface RouteMeta {
  distance: string; // in km
  duration: string; // formatted time
  originName: string;
  destinationName: string;
  originCoords: [number, number];
  destinationCoords: [number, number];
}

export default function GeneralMapComponent() {
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OSRM terrestrial route states
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);
  const [routeMeta, setRouteMeta] = useState<RouteMeta | null>(null);
  const [customRouteOrigin, setCustomRouteOrigin] = useState<Igreja | null>(null);

  const [activeRouteOrigin, setActiveRouteOrigin] = useState<Igreja | null>(null);
  const [activeRouteDest, setActiveRouteDest] = useState<Igreja | null>(null);
  const [travelMode, setTravelMode] = useState<'car' | 'motorcycle' | 'foot'>('car');

  const handleToggleTravelMode = (mode: 'car' | 'motorcycle' | 'foot') => {
    setTravelMode(mode);
    if (activeRouteOrigin && activeRouteDest) {
      const osrmProfile = mode === 'foot' ? 'foot' : 'driving';
      fetchTerrestrialRoute(activeRouteOrigin, activeRouteDest, osrmProfile);
    }
  };

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch((err) => console.error('Error checking auth session:', err));
  }, []);

  // Comparison Module states
  const [comparisonMode, setComparisonMode] = useState(false);
  const [fixedDest, setFixedDest] = useState<Igreja | null>(null);
  const [sedeCandidataA, setSedeCandidataA] = useState<Igreja | null>(null);
  const [sedeCandidataB, setSedeCandidataB] = useState<Igreja | null>(null);

  const [routeAtual, setRouteAtual] = useState<[number, number][] | null>(null);
  const [routeCandidataA, setRouteCandidataA] = useState<[number, number][] | null>(null);
  const [routeCandidataB, setRouteCandidataB] = useState<[number, number][] | null>(null);

  const [metaAtual, setMetaAtual] = useState<{ distance: number; duration: string } | null>(null);
  const [metaCandidataA, setMetaCandidataA] = useState<{ distance: number; duration: string } | null>(null);
  const [metaCandidataB, setMetaCandidataB] = useState<{ distance: number; duration: string } | null>(null);

  const fetchComparisonRoute = async (origin: Igreja, type: 'atual' | 'A' | 'B') => {
    if (!fixedDest || !origin.latitude || !origin.longitude || !fixedDest.latitude || !fixedDest.longitude) {
      return;
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${fixedDest.longitude},${fixedDest.latitude}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM Error');
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
        const distanceKm = parseFloat((route.distance / 1000).toFixed(1));

        const durationSeconds = route.duration;
        let durationFormatted = '';
        if (durationSeconds >= 3600) {
          const hours = Math.floor(durationSeconds / 3600);
          const mins = Math.round((durationSeconds % 3600) / 60);
          durationFormatted = `${hours}h ${mins}m`;
        } else {
          durationFormatted = `${Math.round(durationSeconds / 60)}m`;
        }

        if (type === 'atual') {
          setRouteAtual(coords);
          setMetaAtual({ distance: distanceKm, duration: durationFormatted });
        } else if (type === 'A') {
          setRouteCandidataA(coords);
          setMetaCandidataA({ distance: distanceKm, duration: durationFormatted });
        } else if (type === 'B') {
          setRouteCandidataB(coords);
          setMetaCandidataB({ distance: distanceKm, duration: durationFormatted });
        }
      }
    } catch (err) {
      console.error('Error fetching comparison route:', err);
    }
  };

  useEffect(() => {
    if (fixedDest) {
      const parent = igrejas.find((p) => p.codigo_totvs === fixedDest.codigo_totvs_pai);
      if (parent) {
        fetchComparisonRoute(parent, 'atual');
      } else {
        setRouteAtual(null);
        setMetaAtual(null);
      }
    } else {
      setRouteAtual(null);
      setMetaAtual(null);
      setRouteCandidataA(null);
      setMetaCandidataA(null);
      setRouteCandidataB(null);
      setMetaCandidataB(null);
      setSedeCandidataA(null);
      setSedeCandidataB(null);
    }
  }, [fixedDest, igrejas]);

  useEffect(() => {
    if (sedeCandidataA) {
      fetchComparisonRoute(sedeCandidataA, 'A');
    } else {
      setRouteCandidataA(null);
      setMetaCandidataA(null);
    }
  }, [sedeCandidataA]);

  useEffect(() => {
    if (sedeCandidataB) {
      fetchComparisonRoute(sedeCandidataB, 'B');
    } else {
      setRouteCandidataB(null);
      setMetaCandidataB(null);
    }
  }, [sedeCandidataB]);

  const handleTransferColigacao = async (candidata: Igreja) => {
    if (!fixedDest) return;
    const confirmTransfer = window.confirm(
      `Deseja realmente transferir a coligação de "${fixedDest.desc_igreja}" para a nova sede "${candidata.desc_igreja}"?`
    );
    if (!confirmTransfer) return;

    try {
      const res = await fetch('/api/coligacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_totvs: fixedDest.codigo_totvs,
          codigo_totvs_pai: candidata.codigo_totvs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Coligação transferida com sucesso! Nova Sede: ${candidata.desc_igreja}`);
        setComparisonMode(false);
        setFixedDest(null);
        await fetchValidatedChurches();
      } else {
        toast.error(data.error || 'Erro ao realizar a transferência.');
      }
    } catch (err) {
      console.error('Error transferring coligacao:', err);
      toast.error('Erro ao transferir coligação.');
    }
  };

  const fetchTerrestrialRoute = async (origin: Igreja, dest: Igreja, profile: 'driving' | 'foot' = 'driving') => {
    if (!origin.latitude || !origin.longitude || !dest.latitude || !dest.longitude) {
      toast.error('Uma das igrejas selecionadas não possui coordenadas de geolocalização válidas.');
      return;
    }

    const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`;

    toast.info('Calculando trajeto terrestre real via OSRM...');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM API Error');
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);

        const distanceKm = (route.distance / 1000).toFixed(1);

        const durationSeconds = route.duration;
        let durationFormatted = '';
        if (durationSeconds >= 3600) {
          const hours = Math.floor(durationSeconds / 3600);
          const mins = Math.round((durationSeconds % 3600) / 60);
          durationFormatted = `${hours}h ${mins}min`;
        } else {
          durationFormatted = `${Math.round(durationSeconds / 60)} min`;
        }

        setRoutePath(coords);
        setRouteMeta({
          distance: distanceKm,
          duration: durationFormatted,
          originName: origin.desc_igreja,
          destinationName: dest.desc_igreja,
          originCoords: [origin.latitude, origin.longitude],
          destinationCoords: [dest.latitude, dest.longitude],
        });
        setActiveRouteOrigin(origin);
        setActiveRouteDest(dest);
        if (profile === 'foot') {
          setTravelMode('foot');
        } else if (travelMode === 'foot') {
          setTravelMode('car');
        }

        toast.success('Rota terrestre traçada com sucesso!');
      } else {
        toast.error('Não foi possível encontrar uma rota terrestre viável entre essas igrejas.');
      }
    } catch (err) {
      console.error('Error fetching OSRM route:', err);
      toast.error('Erro ao conectar com o motor de roteamento terrestre. Tente novamente mais tarde.');
    }
  };

  // Helper function to render uniform descriptive Leaflet popups
  const renderChurchPopup = (ig: Igreja) => {
    const porte = getPorte(ig.desc_igreja);
    const parentChurch = ig.codigo_totvs_pai
      ? igrejas.find((p) => p.codigo_totvs === ig.codigo_totvs_pai)
      : null;

    return (
      <Popup className="custom-popup-styled max-w-xs sm:max-w-sm">
        <div className="p-2 space-y-3 font-sans">
          {/* Title banner */}
          <div className="border-b border-zinc-150 pb-2">
            <h3 className="text-xs font-bold text-zinc-900 leading-tight">
              {ig.desc_igreja}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200">
                TOTVS: {ig.codigo_totvs}
              </span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border text-white"
                style={{
                  backgroundColor: PORTE_INFO[porte]?.color || '#A6A6A6',
                  borderColor: 'rgba(0,0,0,0.1)',
                }}
              >
                {porte}
              </span>
            </div>
          </div>

          {/* Quick details */}
          <div className="space-y-1.5 text-[11px] text-zinc-700">
            {ig.tipo_imovel && (
              <p className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="font-semibold text-zinc-500">Tipo de Imóvel:</span>
                <span className="font-bold text-zinc-950">{ig.tipo_imovel}</span>
              </p>
            )}

            <p className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold text-zinc-500">Endereço:</span>{' '}
                <strong className="text-zinc-950 font-semibold">
                  {ig.endereco}
                  {ig.bairro ? `, ${ig.bairro}` : ''}, {ig.municipio} - {ig.estado}
                </strong>{' '}
                {ig.cep ? `(${ig.cep})` : ''}
              </span>
            </p>

            {/* Coligada Hierarchical Info */}
            {ig.codigo_totvs_pai && (
              <p className="flex items-start gap-1.5 text-[11px] bg-zinc-50 p-1.5 rounded-md border border-zinc-200">
                <GitBranch className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                <span>
                  <span className="font-bold text-zinc-500 block text-[9px] uppercase tracking-wider">Coligada a:</span>
                  <strong className="text-zinc-900 font-bold block leading-tight">
                    {parentChurch ? parentChurch.desc_igreja : 'Igreja Superior'}
                  </strong>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Código: {ig.codigo_totvs_pai}
                  </span>
                </span>
              </p>
            )}

            {((ig as any).validado_em || ig.updated_at) && (
              <p className="text-[10px] text-zinc-500">
                <span className="font-semibold">Data de Validação:</span>{' '}
                {new Date((ig as any).validado_em || ig.updated_at!).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}

            {(ig.usuario_validador || (ig as any).validado_por) && (
              <p className="text-[10px] text-zinc-500">
                <span className="font-semibold">Validador:</span> {ig.usuario_validador || (ig as any).validado_por}
              </p>
            )}
          </div>

          {/* Terrestrial Route calculation & Comparison buttons */}
          <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2">
            {/* Standard route triggers */}
            <div className="flex flex-wrap items-center gap-1.5">
              {ig.codigo_totvs_pai && parentChurch && (
                <button
                  type="button"
                  onClick={() => fetchTerrestrialRoute(ig, parentChurch)}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                  title="Traçar rota rodoviária real até a igreja superior coligada"
                >
                  <span>🚗 Rota até Superior</span>
                </button>
              )}

              {!customRouteOrigin ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomRouteOrigin(ig);
                    toast.success(`Origem definida: ${ig.desc_igreja}. Abra o popup da igreja de destino e clique em "Traçar Rota terrestre".`);
                  }}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                >
                  <span>📍 Definir Origem</span>
                </button>
              ) : customRouteOrigin.codigo_totvs !== ig.codigo_totvs ? (
                <button
                  type="button"
                  onClick={() => {
                    fetchTerrestrialRoute(customRouteOrigin, ig);
                    setCustomRouteOrigin(null); // Reset origin after calculating
                  }}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                >
                  <span>🏁 Traçar Rota terrestre</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCustomRouteOrigin(null);
                    toast.info('Origem de rota redefinida.');
                  }}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                >
                  <span>❌ Cancelar Origem</span>
                </button>
              )}
            </div>

            {/* Comparison Module triggers */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-zinc-50">
              {comparisonMode ? (
                fixedDest?.codigo_totvs === ig.codigo_totvs ? (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                    📍 Igreja Alvo de Análise
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSedeCandidataA(ig);
                        toast.success(`Sede Candidata A definida: ${ig.desc_igreja}`);
                      }}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-lg transition-all"
                    >
                      <span>🟢 Sede Candidata A</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSedeCandidataB(ig);
                        toast.success(`Sede Candidata B definida: ${ig.desc_igreja}`);
                      }}
                      className="px-2 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-[10px] font-bold rounded-lg transition-all"
                    >
                      <span>🔵 Sede Candidata B</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonMode(true);
                        setFixedDest(ig);
                        setSedeCandidataA(null);
                        setSedeCandidataB(null);
                        toast.success(`Novo destino definido: "${ig.desc_igreja}". Selecione as candidatas A e B.`);
                      }}
                      className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                    >
                      <span>📐 Comparar Rotas de Coligação</span>
                    </button>
                  </>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setComparisonMode(true);
                    setFixedDest(ig);
                    setSedeCandidataA(null);
                    setSedeCandidataB(null);
                    toast.success(`Modo Comparativo Ativo! "${ig.desc_igreja}" definido como Destino. Agora clique em outras igrejas para selecionar as Candidatas A e B.`);
                  }}
                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                >
                  <span>📐 Comparar Rotas de Coligação</span>
                </button>
              )}
            </div>
          </div>

          {/* Google Maps Link & Connection mesh trigger */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => handleTraceConnectionMesh(ig)}
              className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                connectionPathSource === ig.codigo_totvs
                  ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              {connectionPathSource === ig.codigo_totvs ? (
                <>
                  <X className="h-3.5 w-3.5 text-rose-600" />
                  <span>[ ❌ Ocultar Malha ]</span>
                </>
              ) : (
                <>
                  <GitBranch className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Ver Malha de Conexão</span>
                </>
              )}
            </button>
            <a
              href={ig.link_google_maps || `https://www.google.com/maps?q=${ig.latitude},${ig.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 shadow-xs hover:shadow-sm"
            >
              <span>Abrir no Google Maps</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </Popup>
    );
  };

  // Map Tile layer type
  const [mapType, setMapType] = useState<'satellite' | 'osm'>('satellite');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionGeo, setSelectedRegionGeo] = useState<string>('ALL');
  const [selectedUF, setSelectedUF] = useState('ALL');
  const [selectedTipoImovel, setSelectedTipoImovel] = useState('ALL');
  const [selectedPortes, setSelectedPortes] = useState<string[]>([]);

  // Hierarchical Region & Estadual filters
  const [selectedEstadual, setSelectedEstadual] = useState<string>('');

  const handleRegionGeoChange = (val: string) => {
    setSelectedRegionGeo(val);
    setSelectedEstadual('');
    setFlyToTarget(null);
    if (val !== 'ALL') {
      const allowedUFs = REGIAO_GEOGRAFICA_MAPPING[val] || [];
      if (selectedUF !== 'ALL' && !allowedUFs.includes(selectedUF)) {
        setSelectedUF('ALL');
      }
    }
  };

  // Map focus / flyTo target state
  const [flyToTarget, setFlyToTarget] = useState<{ center: [number, number]; zoom: number; totvs: string } | null>(null);

  // Refs for markers to programmatically open popups
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  // Connection path tracking: array of coordinates for drawing polylines [ [lat, lng], [lat, lng], ... ]
  const [selectedConnectionPath, setSelectedConnectionPath] = useState<[number, number][] | null>(null);
  const [connectionPathSource, setConnectionPathSource] = useState<string | null>(null);
  const [activeChainCodes, setActiveChainCodes] = useState<string[]>([]);

  // Floating Region Legend collapsible state
  const [regionLegendOpen, setRegionLegendOpen] = useState(false);

  // Toggle collapsible Filters Popover (Desktop and Mobile)
  const [showFilters, setShowFilters] = useState(false);

  // Fetch validated churches on mount
  const fetchValidatedChurches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/igrejas/validadas');
      const data = await res.json();
      if (data.success) {
        setIgrejas(data.igrejas || []);
      } else {
        setError(data.error || 'Erro ao carregar igrejas.');
      }
    } catch (err) {
      console.error('Error fetching validated churches:', err);
      setError('Erro ao se conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidatedChurches();
  }, []);

  // Compute distinct States/UFs from loaded validated churches for filter dropdown
  const distinctUFs = useMemo(() => {
    let ufs = Array.from(new Set(igrejas.map((ig) => ig.estado).filter(Boolean)));
    if (selectedRegionGeo !== 'ALL') {
      const allowedUFs = REGIAO_GEOGRAFICA_MAPPING[selectedRegionGeo] || [];
      ufs = ufs.filter((uf) => allowedUFs.includes(uf));
    }
    return ufs.sort();
  }, [igrejas, selectedRegionGeo]);

  // Compute filtered churches list in-realtime
  const filteredIgrejas = useMemo(() => {
    return igrejas.filter((ig) => {
      // 1. Coordinates validation
      if (ig.latitude === null || ig.longitude === null || ig.latitude === 0 || ig.longitude === 0) {
        return false;
      }

      // 1b. Region filter
      if (selectedRegionGeo !== 'ALL') {
        const ufs = REGIAO_GEOGRAFICA_MAPPING[selectedRegionGeo];
        if (ufs && !ufs.includes(ig.estado)) {
          return false;
        }
      }

      // 2. State/UF filter
      if (selectedUF !== 'ALL' && ig.estado !== selectedUF) {
        return false;
      }

      // 3. Tipo Imóvel filter
      if (selectedTipoImovel !== 'ALL') {
        const typeNormalized = (ig.tipo_imovel || '').toUpperCase();
        if (selectedTipoImovel === 'PROPRIO' && !typeNormalized.includes('PRÓPRIO') && !typeNormalized.includes('PROPRIO')) {
          return false;
        }
        if (selectedTipoImovel === 'ALUGADO' && !typeNormalized.includes('ALUGADO')) {
          return false;
        }
      }

      // 4. Size/Porte filter
      const porte = getPorte(ig.desc_igreja);
      if (selectedPortes.length > 0 && !selectedPortes.includes(porte)) {
        return false;
      }

      // 5. Search Text Filter (TOTVS or Name)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const codeMatch = ig.codigo_totvs.toLowerCase().includes(query);
        const nameMatch = ig.desc_igreja.toLowerCase().includes(query);
        const addressMatch = (ig.endereco || '').toLowerCase().includes(query);
        const cityMatch = (ig.municipio || '').toLowerCase().includes(query);
        if (!codeMatch && !nameMatch && !addressMatch && !cityMatch) {
          return false;
        }
      }

      return true;
    });
  }, [igrejas, selectedUF, selectedTipoImovel, selectedPortes, searchQuery]);

  // Handle selected reference Estadual change
  const handleSelectEstadual = (totvs: string) => {
    setSelectedEstadual(totvs);
    if (!totvs) {
      setFlyToTarget(null);
      return;
    }

    // Try finding the church in full loaded list first
    let found = igrejas.find((ig) => ig.codigo_totvs === totvs);

    // Fallback search for Sede Mundial (or any other reference that might have empty totvs, or not fully matching, or special logic)
    if (!found && totvs === "") {
      // Find Sede Mundial by name
      found = igrejas.find((ig) => ig.desc_igreja.toUpperCase().includes("SEDE MUNDIAL"));
    }

    if (found && found.latitude && found.longitude) {
      setFlyToTarget({
        center: [found.latitude, found.longitude],
        zoom: 14,
        totvs: found.codigo_totvs,
      });
    } else {
      console.warn(`Estadual with TOTVS ${totvs} not found or has no coordinates.`);
    }
  };

  // Helper function to build vertical hierarchy connection line traversing recursively up and down the complete family tree
  const handleTraceConnectionMesh = (startChurch: Igreja) => {
    if (connectionPathSource === startChurch.codigo_totvs) {
      setSelectedConnectionPath(null);
      setConnectionPathSource(null);
      setActiveChainCodes([]);
      toast.info('Malha de conexões ocultada.');
      return;
    }

    // 1. Clear any previous connection line layer
    setSelectedConnectionPath(null);
    setConnectionPathSource(null);
    setActiveChainCodes([]);

    if (!startChurch.latitude || !startChurch.longitude) {
      toast.error('A igreja selecionada não possui coordenadas de geolocalização válidas.');
      return;
    }

    setTimeout(() => {
      // 1. Set to keep track of all church IDs involved in the active connection mesh
      const chainCodes = new Set<string>();
      const pathSegments: Array<[ [number, number], [number, number] ]> = [];

      // A) Build the processing group
      const isEstadual = startChurch.desc_igreja.toUpperCase().includes('ESTADUAL');

      if (isEstadual) {
        // For ESTADUAL (root node): Find all churches belonging to the same state (UF) field
        const stateChurches = igrejas.filter((ig) => ig.estado === startChurch.estado);
        stateChurches.forEach((ig) => {
          chainCodes.add(ig.codigo_totvs);
        });
      } else {
        // For child nodes (LOCAL, REGIONAL, CENTRAL, SETORIAL): Climb recursively up to the top Estadul/root
        let current: Igreja | undefined = startChurch;
        const visited = new Set<string>();

        while (current) {
          if (visited.has(current.codigo_totvs)) {
            break; // prevent infinite loop
          }
          visited.add(current.codigo_totvs);
          chainCodes.add(current.codigo_totvs);

          if (!current.codigo_totvs_pai) break;
          current = igrejas.find((ig) => ig.codigo_totvs === current!.codigo_totvs_pai);
        }
      }

      // B) For each church in the processing set, trace a segment line ONLY to its direct parent
      chainCodes.forEach((codigoTotvs) => {
        const daughter = igrejas.find((ig) => ig.codigo_totvs === codigoTotvs);

        if (daughter && daughter.codigo_totvs_pai) {
          const parent = igrejas.find((ig) => ig.codigo_totvs === daughter.codigo_totvs_pai);

          if (daughter.latitude && daughter.longitude && parent?.latitude && parent?.longitude) {
            pathSegments.push([
              [Number(daughter.latitude), Number(daughter.longitude)],
              [Number(parent.latitude), Number(parent.longitude)]
            ]);
            // Ensure parent is also included in active chain highlights
            chainCodes.add(parent.codigo_totvs);
          }
        }
      });

      // C) Update states to render segments and bounds
      if (pathSegments.length > 0) {
        setSelectedConnectionPath(pathSegments as any);
        setConnectionPathSource(startChurch.codigo_totvs);
        setActiveChainCodes(Array.from(chainCodes));
        toast.success(`Malha de conexões traçada com sucesso! (${chainCodes.size} nós conectados)`);
      } else {
        toast.error('Não foram encontradas igrejas coligadas com geolocalização validada para traçar o caminho.');
      }
    }, 50);
  };

  // Calculate dynamic map center based on filtered results, default to Brazil center
  const mapCenter = useMemo<[number, number]>(() => {
    if (filteredIgrejas.length === 1) {
      return [filteredIgrejas[0].latitude!, filteredIgrejas[0].longitude!];
    }
    // Default Brazil center coordinates
    return [-14.235, -51.925];
  }, [filteredIgrejas]);

  const mapZoom = useMemo<number>(() => {
    if (filteredIgrejas.length === 1) return 14;
    if (selectedUF !== 'ALL') return 6;
    return 4;
  }, [filteredIgrejas, selectedUF]);

  // Custom marker icon builder using exact hex colors and solid pure white border
  const getMarkerIcon = (porte: string) => {
    const info = PORTE_INFO[porte] || PORTE_INFO.LOCAL;

    // Size hierarchy: Estadual/Setorial (36px), Central/Regional (32px), Local/Others (28px)
    let w = 28;
    let h = 28;
    if (porte === 'ESTADUAL' || porte === 'SETORIAL') {
      w = 36;
      h = 36;
    } else if (porte === 'CENTRAL' || porte === 'REGIONAL') {
      w = 32;
      h = 32;
    }

    return L.divIcon({
      html: `
        <div class="relative flex flex-col items-center justify-center" style="width: ${w}px; height: ${h}px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${info.color}" stroke="#FFFFFF" stroke-width="2.8" style="width: ${w}px; height: ${h}px; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.6));" class="z-20">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </div>
      `,
      className: '',
      iconSize: [w, h],
      iconAnchor: [w / 2, h],
      popupAnchor: [0, -h],
    });
  };

  // Highlighted custom icon builder with neon pulsing outline
  const getHighlightedMarkerIcon = (porte: string, isSource: boolean) => {
    const info = PORTE_INFO[porte] || PORTE_INFO.LOCAL;

    // Highlighted sizes are slightly larger for distinct visualization
    let w = 32;
    let h = 32;
    if (porte === 'ESTADUAL' || porte === 'SETORIAL') {
      w = 40;
      h = 40;
    } else if (porte === 'CENTRAL' || porte === 'REGIONAL') {
      w = 36;
      h = 36;
    }

    const ringAnim = isSource ? 'animate-ping' : 'animate-pulse';
    const ringColor = isSource ? '#6366F1' : '#00FFFF';

    return L.divIcon({
      html: `
        <div class="relative flex flex-col items-center justify-center" style="width: ${w}px; height: ${h}px;">
          <div class="absolute rounded-full bg-transparent border-2 border-dashed ${ringAnim} pointer-events-none" style="border-color: ${ringColor}; width: ${w + 10}px; height: ${h + 10}px;"></div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${info.color}" stroke="#FFFFFF" stroke-width="2.8" style="width: ${w}px; height: ${h}px; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.7));" class="z-50">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </div>
      `,
      className: '',
      iconSize: [w, h],
      iconAnchor: [w / 2, h],
      popupAnchor: [0, -h],
    });
  };

  // Helper function to resolve cluster background colors dynamically based on State/UF of markers within each group
  const getClusterColorByState = (uf: string): string => {
    const normalized = (uf || '').toUpperCase().trim();

    if (normalized === 'SP') return '#F59E0B'; // SP: Amarelo Dourado
    if (normalized === 'MG') return '#EA580C'; // MG: Laranja
    if (normalized === 'ES' || normalized === 'RJ') return '#DC2626'; // ES e RJ: Vermelho

    if (['PR', 'RS', 'SC'].includes(normalized)) return '#2563EB'; // Sul: Azul
    if (['AC', 'AM', 'RO', 'PA', 'AP', 'RR', 'TO'].includes(normalized)) return '#059669'; // Norte: Verde
    if (['AL', 'BA', 'CE', 'RN', 'PE', 'PI', 'MA', 'PB', 'SE'].includes(normalized)) return '#7C3AED'; // Nordeste: Roxo
    if (['MT', 'DF', 'GO', 'MS'].includes(normalized)) return '#0891B2'; // Centro-Oeste: Ciano

    return '#6D28D9'; // Default solid violet fallback
  };

  // Toggle selected size/porte helper
  const handleTogglePorte = (porte: string) => {
    if (selectedPortes.includes(porte)) {
      setSelectedPortes(selectedPortes.filter((p) => p !== porte));
    } else {
      setSelectedPortes([...selectedPortes, porte]);
    }
  };

  const handleClearAllLines = () => {
    setSelectedConnectionPath(null);
    setConnectionPathSource(null);
    setActiveChainCodes([]);
    setRoutePath(null);
    setRouteMeta(null);
    setActiveRouteOrigin(null);
    setActiveRouteDest(null);
    setComparisonMode(false);
    setFixedDest(null);
    setSedeCandidataA(null);
    setSedeCandidataB(null);
    setRouteAtual(null);
    setRouteCandidataA(null);
    setRouteCandidataB(null);
    setMetaAtual(null);
    setMetaCandidataA(null);
    setMetaCandidataB(null);
    toast.success('Todas as linhas de malha e rotas foram limpas do mapa.');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRegionGeo('ALL');
    setSelectedUF('ALL');
    setSelectedTipoImovel('ALL');
    setSelectedPortes([]);
    setSelectedEstadual('');
    setFlyToTarget(null);
    setSelectedConnectionPath(null);
    setConnectionPathSource(null);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 relative">
      {/* Toast Notification Container */}
      <Toaster position="top-right" richColors closeButton />

      {/* Modern Compact Floating Header Overlay (Floating Pill Bar centered with left/right free space) */}
      <header className="absolute top-3 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl mx-auto mt-3 z-[1020] bg-white/80 backdrop-blur-md border border-zinc-200 shadow-xl rounded-full p-3 flex flex-col md:flex-row items-center justify-between gap-3 transition-all duration-300">
        {/* Left Section: Logo & Counter */}
        <div className="flex items-center justify-between w-full md:w-auto shrink-0 gap-2">
          <div className="flex items-center space-x-2">
            <img
              src="/img/logo.png"
              alt="IPDA"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h1 className="text-xs font-black text-zinc-950 tracking-tight leading-tight">
                GEO-VALIG IPDA
              </h1>
              <p className="text-[9px] text-zinc-500 font-semibold">MAPA DE VALIDAÇÃO</p>
            </div>
          </div>
          <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
            {filteredIgrejas.length} no mapa
          </span>
        </div>

        {/* Center Section: Compact Quick Search */}
        <div className="relative w-full md:max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por código TOTVS, nome, rua ou município..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-zinc-800 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-medium transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-650 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right Section: Actions & Access Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Collapsible Popover Filters Trigger Button */}
          <button
            onClick={() => {
              setShowFilters(!showFilters);
              toast.dismiss();
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showFilters
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filtros</span>
          </button>

          <a
            href="/coligacoes"
            className="p-1.5 bg-white text-zinc-650 hover:text-zinc-950 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all flex items-center justify-center shrink-0 gap-1.5 px-3"
            title="Ir para Gestão de Coligações"
          >
            <GitBranch className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-xs font-semibold hidden sm:inline">🌳 Coligações</span>
          </a>

          <a
            href="/validacao"
            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl border border-indigo-600 transition-all flex items-center justify-center shrink-0 gap-1.5 px-3 shadow-xs hover:shadow-sm"
            title="Acessar Área Restrita"
          >
            <Lock className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-bold hidden sm:inline">🔒 Área Restrita / Login</span>
          </a>

          <button
            onClick={fetchValidatedChurches}
            disabled={loading}
            className="p-1.5 bg-white text-zinc-600 hover:text-zinc-950 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
            title="Atualizar dados do banco"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Floating Collapsible Filters Popover Card */}
      {showFilters && (
        <section className="absolute top-[140px] md:top-20 right-4 z-[1015] bg-white/95 backdrop-blur-md border border-zinc-200 shadow-xl rounded-2xl p-4 w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <span className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              🎛️ Painel de Filtros Rápidos
            </span>
            <button
              onClick={() => setShowFilters(false)}
              className="text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-100 rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Coluna 1 */}
            <div className="space-y-3">
              {/* Região Geográfica */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="h-3 w-3 text-zinc-400" />
                  Região
                </label>
                <select
                  value={selectedRegionGeo}
                  onChange={(e) => handleRegionGeoChange(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] rounded-xl p-2 font-semibold focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                >
                  <option value="ALL">Todas as Regiões</option>
                  {Object.keys(REGIAO_GEOGRAFICA_MAPPING).map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estado (UF) */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-zinc-400" />
                  Estado (UF)
                </label>
                <select
                  value={selectedUF}
                  onChange={(e) => setSelectedUF(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] rounded-xl p-2 font-semibold focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                >
                  <option value="ALL">Todos os Estados</option>
                  {distinctUFs.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Coluna 2 */}
            <div className="space-y-3">
              {/* Estadual de Referência */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-zinc-400" />
                  Estadual Ref.
                </label>
                <select
                  value={selectedEstadual}
                  disabled={selectedRegionGeo === 'ALL'}
                  onChange={(e) => handleSelectEstadual(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] rounded-xl p-2 font-semibold focus:ring-1 focus:ring-indigo-500 outline-none w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione...</option>
                  {selectedRegionGeo !== 'ALL' &&
                    (REGIAO_TO_ESTADUAIS[selectedRegionGeo] || []).flatMap((subReg) =>
                      REGOES_ESTADUAIS[subReg as keyof typeof REGOES_ESTADUAIS] || []
                    ).map((est) => (
                      <option key={est.nome} value={est.totvs}>
                        {est.nome} {est.totvs ? `(${est.totvs})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Tipo de Imóvel */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-zinc-400" />
                  Imóvel
                </label>
                <select
                  value={selectedTipoImovel}
                  onChange={(e) => setSelectedTipoImovel(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-[11px] rounded-xl p-2 font-semibold focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                >
                  <option value="ALL">Todos</option>
                  <option value="PROPRIO">Próprio</option>
                  <option value="ALUGADO">Alugado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Porte / Size Multi-selection tags */}
          <div className="space-y-1.5 border-t border-zinc-100 pt-3">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-zinc-400" />
              Porte da Igreja (Classificação)
            </label>
            <div className="flex flex-wrap gap-1">
              {Object.values(PORTE_INFO).map((item) => {
                const active = selectedPortes.includes(item.name);
                return (
                  <button
                    key={item.name}
                    onClick={() => handleTogglePorte(item.name)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all flex items-center gap-1 ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full border border-black/10 inline-block"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Filter Button */}
          {(selectedRegionGeo !== 'ALL' || selectedEstadual || selectedUF !== 'ALL' || selectedTipoImovel !== 'ALL' || selectedPortes.length > 0 || searchQuery) && (
            <div className="pt-2 border-t border-zinc-150 flex justify-end">
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-xl flex items-center gap-1 transition-all shadow-2xs"
              >
                <X className="h-3.5 w-3.5" />
                <span>Limpar Filtros</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* Main Workspace Map Block */}
      <div className="flex-1 w-full h-full relative z-10">
        {loading ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4">
            <svg className="animate-spin h-9 w-9 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <h3 className="text-sm font-bold text-zinc-800">Carregando igrejas validadas...</h3>
            <p className="text-xs text-zinc-500 mt-1">Carregando dados consolidados diretamente do Neon DB.</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3 bg-rose-50 rounded-full border border-rose-100 text-rose-600 mb-4">
              <X className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Falha ao buscar dados</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">{error}</p>
            <button
              onClick={fetchValidatedChurches}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-md hover:bg-indigo-700 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={true}
              className="w-full h-full z-10"
            >
              <MapController
                center={mapCenter}
                zoom={mapZoom}
                flyToTarget={flyToTarget}
                onFlyToComplete={() => {
                  if (flyToTarget) {
                    const targetTotvs = flyToTarget.totvs;
                    // Trigger popup of the focused marker after flyTo is done
                    const markerInstance = markerRefs.current[targetTotvs];
                    if (markerInstance) {
                      markerInstance.openPopup();
                    } else {
                      // fallback: if not in ref, or if it is "Sede Mundial" without a totvs, check for Sede Mundial
                      if (targetTotvs === "") {
                        const smMarker = Object.values(markerRefs.current).find(
                          (m) => m && m.options?.alt === "Sede Mundial"
                        );
                        if (smMarker) {
                          smMarker.openPopup();
                        }
                      }
                    }
                  }
                }}
              />

              <RegionBoundsController region={selectedRegionGeo} igrejas={igrejas} />

              <MapBoundsController
                bounds={selectedConnectionPath}
                routePath={routePath}
                routeAtual={routeAtual}
                routeCandidataA={routeCandidataA}
                routeCandidataB={routeCandidataB}
              />

              {/* Terrestrial OSRM route path overlay if calculated */}
              {routePath && (
                <>
                  {/* Outer thicker shadow line */}
                  <Polyline
                    positions={routePath}
                    color="#1E40AF"
                    weight={8}
                    opacity={0.3}
                  />
                  {/* Inner neon blue solid line */}
                  <Polyline
                    positions={routePath}
                    color="#3B82F6"
                    weight={5}
                    opacity={0.9}
                  />
                </>
              )}

              {/* Comparison routes if active */}
              {routeAtual && (
                <>
                  <Polyline positions={routeAtual} color="#EA580C" weight={8} opacity={0.3} />
                  <Polyline positions={routeAtual} color="#F97316" weight={5} opacity={0.9} />
                </>
              )}
              {routeCandidataA && (
                <>
                  <Polyline positions={routeCandidataA} color="#15803D" weight={8} opacity={0.3} />
                  <Polyline positions={routeCandidataA} color="#22C55E" weight={5} opacity={0.9} />
                </>
              )}
              {routeCandidataB && (
                <>
                  <Polyline positions={routeCandidataB} color="#0891B2" weight={8} opacity={0.3} />
                  <Polyline positions={routeCandidataB} color="#06B6D4" weight={5} opacity={0.9} />
                </>
              )}

              {mapType === 'satellite' ? (
                <>
                  <TileLayer
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                  <TileLayer
                    attribution="Tiles &copy; Esri"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                  />
                  <TileLayer
                    attribution="Tiles &copy; Esri"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  />
                </>
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}

              {/* Render Connection Polyline on the Map layer if calculated */}
              {selectedConnectionPath && (
                <>
                  {/* Thick solid black background stroke for 3D depth and absolute contrast over satellite backgrounds */}
                  <Polyline
                    positions={selectedConnectionPath}
                    color="#000000"
                    weight={7}
                    opacity={0.6}
                  />
                  {/* Bright neon yellow high-contrast foreground dashed line */}
                  <Polyline
                    positions={selectedConnectionPath}
                    color="#FACC15"
                    weight={4}
                    opacity={0.95}
                    dashArray="8, 8"
                  />
                </>
              )}

              {/* Highlighted active family tree path markers (rendered OUTSIDE clusters to stand out) */}
              {selectedConnectionPath &&
                igrejas
                  .filter((ig) => activeChainCodes.includes(ig.codigo_totvs) && ig.latitude && ig.longitude)
                  .map((ig) => {
                    const porte = getPorte(ig.desc_igreja);
                    const isSource = ig.codigo_totvs === connectionPathSource;
                    const icon = getHighlightedMarkerIcon(porte, isSource);
                    const isSedeMundial = ig.desc_igreja.toUpperCase().includes("SEDE MUNDIAL");

                    return (
                      <Marker
                        key={`highlighted-${ig.codigo_totvs}`}
                        position={[ig.latitude!, ig.longitude!]}
                        icon={icon}
                        alt={isSedeMundial ? "Sede Mundial" : undefined}
                        zIndexOffset={1000}
                        ref={(el) => {
                          if (el) {
                            markerRefs.current[ig.codigo_totvs] = el;
                            (el as any).estado = ig.estado;
                          } else {
                            delete markerRefs.current[ig.codigo_totvs];
                          }
                        }}
                      >
                        {renderChurchPopup(ig)}
                      </Marker>
                    );
                  })}

              {/* Marker Clustering with react-leaflet-cluster */}
              <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={(cluster: any) => {
                  const count = cluster.getChildCount();
                  let size = 35;
                  if (count > 100) {
                    size = 55;
                  } else if (count > 10) {
                    size = 45;
                  }

                  // 1. Gather UFs from all child markers in the cluster
                  const childMarkers = cluster.getAllChildMarkers();
                  const stateCounts: Record<string, number> = {};

                  childMarkers.forEach((m: any) => {
                    const uf = m.estado || '';
                    if (uf) {
                      stateCounts[uf] = (stateCounts[uf] || 0) + 1;
                    }
                  });

                  // 2. Find the majority State/UF
                  let majorityUF = '';
                  let maxCount = 0;
                  Object.keys(stateCounts).forEach((uf) => {
                    if (stateCounts[uf] > maxCount) {
                      maxCount = stateCounts[uf];
                      majorityUF = uf;
                    }
                  });

                  // 3. Resolve region-based background color
                  const bg = getClusterColorByState(majorityUF);

                  return L.divIcon({
                    html: `
                      <div style="
                        background-color: ${bg};
                        color: #ffffff;
                        font-weight: bold;
                        border-radius: 50%;
                        border: 3px solid #ffffff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5);
                        font-size: 14px;
                        width: ${size}px;
                        height: ${size}px;
                        cursor: pointer;
                        user-select: none;
                      ">
                        ${count}
                      </div>
                    `,
                    className: 'custom-cluster-icon-parent',
                    iconSize: L.point(size, size),
                    iconAnchor: [size / 2, size / 2],
                  });
                }}
              >
                {filteredIgrejas
                  .filter((ig) => !activeChainCodes.includes(ig.codigo_totvs))
                  .map((ig) => {
                    const isSedeMundial = ig.desc_igreja.toUpperCase().includes("SEDE MUNDIAL");
                    const porte = getPorte(ig.desc_igreja);
                    const icon = getMarkerIcon(porte);

                    return (
                      <Marker
                        key={ig.codigo_totvs}
                        position={[ig.latitude!, ig.longitude!]}
                        icon={icon}
                        alt={isSedeMundial ? "Sede Mundial" : undefined}
                        ref={(el) => {
                          if (el) {
                            markerRefs.current[ig.codigo_totvs] = el;
                            (el as any).estado = ig.estado;
                          } else {
                            delete markerRefs.current[ig.codigo_totvs];
                          }
                        }}
                      >
                        {renderChurchPopup(ig)}
                      </Marker>
                    );
                  })}
              </MarkerClusterGroup>
            </MapContainer>

            {/* Global floating button to clear connection lines and routes */}
            {(selectedConnectionPath !== null ||
              routePath !== null ||
              routeAtual !== null ||
              routeCandidataA !== null ||
              routeCandidataB !== null) && (
              <button
                type="button"
                onClick={handleClearAllLines}
                className="absolute top-16 right-3 z-[1005] bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black px-4 py-2.5 rounded-xl shadow-2xl border border-rose-500 hover:shadow-rose-500/20 transition-all flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300"
                title="Limpar todas as linhas de conexões e rotas ativas do mapa"
              >
                <span>🧹 [ Limpar Linhas do Mapa ]</span>
              </button>
            )}

            {/* Map Layer Overlay Selector */}
            <div className="absolute top-3 right-3 z-[1000] flex bg-white rounded-xl shadow-md border border-zinc-200 overflow-hidden text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-3 py-2 transition-all ${
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
                className={`px-3 py-2 transition-all ${
                  mapType === 'osm'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                Mapa (OSM)
              </button>
            </div>

            {/* Collapsible Regions Legend Card */}
            <div className="absolute bottom-[280px] left-6 z-[1000] bg-white border border-zinc-200 rounded-2xl shadow-xl max-w-xs transition-all duration-300 overflow-hidden">
              {regionLegendOpen ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5 gap-4">
                    <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      🎨 Regiões (Agrupamentos)
                    </h3>
                    <button
                      onClick={() => setRegionLegendOpen(false)}
                      className="text-zinc-400 hover:text-zinc-650 font-bold text-xs p-1 rounded hover:bg-zinc-100 transition-all"
                      title="Minimizar Legenda"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-semibold text-zinc-700">
                    <div className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 rounded-md border border-zinc-300 bg-[#F59E0B] shrink-0" />
                      <span>SP</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 rounded-md border border-zinc-300 bg-[#EA580C] shrink-0" />
                      <span>MG</span>
                    </div>
                    <div className="flex items-center space-x-2 col-span-2">
                      <span className="w-3.5 h-3.5 rounded-md border border-zinc-300 bg-[#DC2626] shrink-0" />
                      <span>ES / RJ</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 rounded-md border border-zinc-300 bg-[#2563EB] shrink-0" />
                      <span>Sul</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 rounded-md border border-zinc-300 bg-[#059669] shrink-0" />
                      <span>Norte</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 rounded-md border border-zinc-300 bg-[#7C3AED] shrink-0" />
                      <span>Nordeste</span>
                    </div>
                    <div className="flex items-center space-x-2 col-span-2">
                      <span className="w-3.5 h-3.5 rounded-md border border-zinc-300 bg-[#0891B2] shrink-0" />
                      <span>Centro-Oeste</span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setRegionLegendOpen(true)}
                  className="px-3 py-2 flex items-center space-x-2 text-[10px] font-bold text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 rounded-xl transition-all"
                  title="Expandir Legenda de Regiões"
                >
                  <span>🎨</span>
                  <span>Regiões (Agrupamentos)</span>
                </button>
              )}
            </div>

            {/* Floating OSRM Route Comparison Card (Upper Right / Right Corner) */}
            {comparisonMode && fixedDest && (
              <div className="absolute top-24 right-6 z-[1010] bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xl w-96 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between border-b border-zinc-150 pb-2.5 gap-4">
                  <div className="flex items-center gap-1.5 text-zinc-900">
                    <span className="text-base">📐</span>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Comparativo de Rotas e Proximidade
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setComparisonMode(false);
                      setFixedDest(null);
                      toast.info('Modo comparativo desativado.');
                    }}
                    className="text-zinc-400 hover:text-zinc-650 p-1 rounded hover:bg-zinc-100 transition-all"
                    title="Fechar Comparador"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Igreja Alvo (Destino)</span>
                  <span className="font-bold text-zinc-900 block truncate" title={fixedDest.desc_igreja}>{fixedDest.desc_igreja}</span>
                </div>

                {/* Comparative Table */}
                <div className="space-y-3 pt-2.5 border-t border-zinc-100">
                  {/* Route 1: Sede Atual */}
                  <div className="p-2.5 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        Sede Atual
                      </span>
                      {metaAtual && (
                        <span className="text-xs font-black text-zinc-800">{metaAtual.distance} km • {metaAtual.duration}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-zinc-600 font-bold block truncate max-w-[150px]">
                        {fixedDest.codigo_totvs_pai ? `TOTVS: ${fixedDest.codigo_totvs_pai}` : 'Nenhuma vinculada'}
                      </span>
                      {fixedDest.codigo_totvs_pai && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${igrejas.find(p => p.codigo_totvs === fixedDest.codigo_totvs_pai)?.latitude},${igrejas.find(p => p.codigo_totvs === fixedDest.codigo_totvs_pai)?.longitude}&destination=${fixedDest.latitude},${fixedDest.longitude}&travelmode=transit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-[8px] font-bold rounded flex items-center gap-0.5"
                          title="Ver linhas de ônibus municipais/urbanos, rodoviárias e custos no Google Maps"
                        >
                          <span>🚌 Ônibus</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Route 2: Candidata A */}
                  <div className="p-2.5 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Candidata A
                      </span>
                      {metaCandidataA && (
                        <span className="text-xs font-black text-zinc-800">{metaCandidataA.distance} km • {metaCandidataA.duration}</span>
                      )}
                    </div>
                    {sedeCandidataA ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-zinc-800 font-bold block truncate max-w-[180px]" title={sedeCandidataA.desc_igreja}>
                            {sedeCandidataA.desc_igreja}
                          </span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=${sedeCandidataA.latitude},${sedeCandidataA.longitude}&destination=${fixedDest.latitude},${fixedDest.longitude}&travelmode=transit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-[8px] font-bold rounded flex items-center gap-0.5"
                            title="Ver linhas de ônibus municipais/urbanos, rodoviárias e custos no Google Maps"
                          >
                            <span>🚌 Ônibus</span>
                          </a>
                        </div>

                        {/* Ganho calculations */}
                        {metaAtual && metaCandidataA && (
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                            {metaAtual.distance - metaCandidataA.distance > 0 ? (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-250">
                                🟢 {(metaAtual.distance - metaCandidataA.distance).toFixed(1)}km mais perto
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-250">
                                🔴 {Math.abs(metaAtual.distance - metaCandidataA.distance).toFixed(1)}km mais longe
                              </span>
                            )}

                            {/* Transfer Action button */}
                            {isAuthenticated ? (
                              <button
                                type="button"
                                onClick={() => handleTransferColigacao(sedeCandidataA)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] rounded-lg transition-all border border-indigo-750 shadow-xs flex items-center gap-1"
                                title="Gravar nova vinculação hierárquica no banco de dados Neon"
                              >
                                <span>🔄 Transferir Coligação para esta Sede</span>
                              </button>
                            ) : (
                              <span className="text-[9px] text-zinc-400 font-black italic bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md" title="Faça login como administrador para alterar a coligação">
                                🔒 Transferência bloqueada (Login requerido)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-400 block italic">Selecione no mapa para comparar</span>
                    )}
                  </div>

                  {/* Route 3: Candidata B */}
                  <div className="p-2.5 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        Candidata B
                      </span>
                      {metaCandidataB && (
                        <span className="text-xs font-black text-zinc-800">{metaCandidataB.distance} km • {metaCandidataB.duration}</span>
                      )}
                    </div>
                    {sedeCandidataB ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-zinc-800 font-bold block truncate max-w-[180px]" title={sedeCandidataB.desc_igreja}>
                            {sedeCandidataB.desc_igreja}
                          </span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=${sedeCandidataB.latitude},${sedeCandidataB.longitude}&destination=${fixedDest.latitude},${fixedDest.longitude}&travelmode=transit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-[8px] font-bold rounded flex items-center gap-0.5"
                            title="Ver linhas de ônibus municipais/urbanos, rodoviárias e custos no Google Maps"
                          >
                            <span>🚌 Ônibus</span>
                          </a>
                        </div>

                        {/* Ganho calculations */}
                        {metaAtual && metaCandidataB && (
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                            {metaAtual.distance - metaCandidataB.distance > 0 ? (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-250">
                                🟢 {(metaAtual.distance - metaCandidataB.distance).toFixed(1)}km mais perto
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-250">
                                🔴 {Math.abs(metaAtual.distance - metaCandidataB.distance).toFixed(1)}km mais longe
                              </span>
                            )}

                            {/* Transfer Action button */}
                            {isAuthenticated ? (
                              <button
                                type="button"
                                onClick={() => handleTransferColigacao(sedeCandidataB)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] rounded-lg transition-all border border-indigo-750 shadow-xs flex items-center gap-1"
                                title="Gravar nova vinculação hierárquica no banco de dados Neon"
                              >
                                <span>🔄 Transferir Coligação para esta Sede</span>
                              </button>
                            ) : (
                              <span className="text-[9px] text-zinc-400 font-black italic bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md" title="Faça login como administrador para alterar a coligação">
                                🔒 Transferência bloqueada (Login requerido)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-400 block italic">Selecione no mapa para comparar</span>
                    )}
                  </div>
                </div>

                {/* Public Transit Explanatory Note */}
                <div className="pt-2 border-t border-zinc-100 text-[9px] text-zinc-500 leading-normal">
                  <span>ℹ️ Nota: A disponibilidade de transporte público (ônibus/trem) depende do cadastramento das linhas municipais na região. Para áreas rurais ou isoladas, o sistema indicará a rota por veículo próprio.</span>
                </div>
              </div>
            )}

            {/* Floating OSRM Route Details Card (Lower Right Corner) */}
            {routeMeta && (
              <div className="absolute bottom-6 right-6 z-[1000] bg-white/95 backdrop-blur-md border border-zinc-200 rounded-2xl p-4 shadow-2xl w-80 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between border-b border-zinc-150 pb-2 gap-4">
                  <div className="flex items-center gap-1.5 text-zinc-900">
                    <span className="text-sm">
                      {travelMode === 'car' ? '🚗' : travelMode === 'motorcycle' ? '🏍️' : '🚶'}
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Rota Ativa ({travelMode === 'car' ? 'Carro' : travelMode === 'motorcycle' ? 'Moto' : 'Caminhada'})
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setRoutePath(null);
                      setRouteMeta(null);
                      setActiveRouteOrigin(null);
                      setActiveRouteDest(null);
                      toast.info('Rota terrestre removida do mapa.');
                    }}
                    className="text-zinc-400 hover:text-zinc-650 p-1 rounded hover:bg-zinc-100 transition-all"
                    title="Limpar Rota"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Travel Mode Selector Tabs */}
                <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 gap-1 justify-center">
                  <button
                    onClick={() => handleToggleTravelMode('car')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all w-1/3 flex items-center justify-center gap-1 ${
                      travelMode === 'car'
                        ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <span>🚗</span> <span className="hidden sm:inline">Carro</span>
                  </button>
                  <button
                    onClick={() => handleToggleTravelMode('motorcycle')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all w-1/3 flex items-center justify-center gap-1 ${
                      travelMode === 'motorcycle'
                        ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <span>🏍️</span> <span className="hidden sm:inline">Moto</span>
                  </button>
                  <button
                    onClick={() => handleToggleTravelMode('foot')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all w-1/3 flex items-center justify-center gap-1 ${
                      travelMode === 'foot'
                        ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <span>🚶</span> <span className="hidden sm:inline">Caminhada</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Origem</span>
                    <span className="font-bold text-zinc-800 block truncate max-w-[260px]" title={routeMeta.originName}>{routeMeta.originName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Destino</span>
                    <span className="font-bold text-zinc-800 block truncate max-w-[260px]" title={routeMeta.destinationName}>{routeMeta.destinationName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-zinc-100">
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Distância Total</span>
                      <span className="text-xs font-black text-indigo-650">{routeMeta.distance} km</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Tempo Estimado</span>
                      <span className="text-xs font-black text-indigo-650">{routeMeta.duration}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${routeMeta.originCoords[0]},${routeMeta.originCoords[1]}&destination=${routeMeta.destinationCoords[0]},${routeMeta.destinationCoords[1]}&travelmode=transit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-250 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                    title="Ver linhas de ônibus intermunicipais/urbanos, rodoviárias mais próximas, horários e custos de passagem para este destino específico"
                  >
                    <span>🚌 Ver Opções de Ônibus / Transporte Público</span>
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${routeMeta.originCoords[0]},${routeMeta.originCoords[1]}&destination=${routeMeta.destinationCoords[0]},${routeMeta.destinationCoords[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm"
                  >
                    <span>Abrir GPS / Google Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Floating Legend Card (Lower Left Corner) */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-white border border-zinc-200 rounded-2xl p-4 shadow-xl max-w-xs space-y-3">
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-1.5 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" />
                Legenda Oficial de Portes
              </h3>
              <div className="grid grid-cols-1 gap-2 text-[10px] font-semibold text-zinc-700">
                {Object.values(PORTE_INFO).map((item) => (
                  <div key={item.name} className="flex items-center space-x-2">
                    <span
                      className="w-3.5 h-3.5 rounded-md border border-zinc-300 shadow-xs inline-block shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="uppercase tracking-wide font-mono text-zinc-800 text-[9px]">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
