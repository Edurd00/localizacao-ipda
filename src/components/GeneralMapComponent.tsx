'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, Polyline } from 'react-leaflet';
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

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function normalizeTotvs(code: string | number | null | undefined): string {
  if (code === null || code === undefined) return '';
  return code.toString().trim().replace(/^0+/, '');
}

// Strict Church classification by porte based on 'desc_igreja'
export function getPorte(desc: string, porteField?: string | null): string {
  if (porteField && porteField.trim() !== '') {
    return porteField;
  }
  const normalized = (desc || '').toUpperCase();
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
  ESTADUAL: { name: 'ESTADUAL', color: '#8CAEE0', label: 'Estadual (Azul Claro)' },
  SETORIAL: { name: 'SETORIAL', color: '#FFFF00', label: 'Setorial (Amarelo)' },
  CENTRAL: { name: 'CENTRAL', color: '#F4A27E', label: 'Central (Laranja/Salmão)' },
  REGIONAL: { name: 'REGIONAL', color: '#A2C898', label: 'Regional (Verde Oliva Soft)' },
  LOCAL: { name: 'LOCAL', color: '#A6A6A6', label: 'Local (Cinza)' },
  'CASA DE ORAÇÃO': { name: 'CASA DE ORAÇÃO', color: '#D8A2C8', label: 'Casa de Oração (Rosa Pastel)' },
  'ALDEIA INDIGENA': { name: 'ALDEIA INDIGENA', color: '#00FFFF', label: 'Aldeia Indígena (Ciano)' },
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
  'Sudeste - SP': ["Grande Sao Paulo - SP", "Interior - SP", "Litoral - SP"],
  'Sudeste - MG': ["Minas Gerais"],
  'Sudeste - ES e RJ': ["Rio de Janeiro", "Espirito Santo"],
  'Sul': ["Regiao Sul"],
  'Norte': ["Norte"],
  'Nordeste': ["Nordeste"],
  'Centro-Oeste': ["Centro-Oeste"],
};

export const ESTADUAIS_POR_REGIAO: Record<string, string[]> = {
  "Grande Sao Paulo - SP": [
    "SEDE MUNDIAL",
    "FRANCO DA ROCHA - SP (T 16332)",
    "GUARULHOS - SP (T 16245)",
    "ITAQUAQUECETUBA - SP (T 15937)",
    "MAUA - SP (T 9289)",
    "MOGI DAS CRUZES - SP (T 15968)",
    "SANTO ANDRE - SP (T 9318)",
    "SAO BERNARDO DO CAMPO - SP (T 9325)",
    "SAO MATEUS - SP (T 16037)",
    "CAMPO LIMPO - SP (T 16588)",
    "SANTO AMARO - SP (T 16883)",
    "OSASCO - SP (T 16501)"
  ],
  "Interior - SP": [
    "BAURU - SP (T 13753)",
    "CAMPINAS - SP (T 13901)",
    "ITAPEVA - SP (T 14339)",
    "RIBEIRAO PRETO - SP (T 14463)",
    "JUNDIAI - SP (T 14661)",
    "MARILIA - SP (T 14756)",
    "PIRACICABA - SP (T 15104)",
    "PRESIDENTE PRUDENTE - SP (T 15213)",
    "REGISTRO - SP (T 15252)",
    "SAO JOSE DO RIO PRETO - SP (T 15449)",
    "SAO JOSE DOS CAMPOS - SP (T 15463)",
    "SOROCABA - SP (T 15551)"
  ],
  "Litoral - SP": [
    "SANTOS - SP (T 15392)"
  ],
  "Espirito Santo": [
    "ESTADUAL VITORIA - ES (T 17250)",
    "ESTADUAL LINHARES - ES (T 9740)"
  ],
  "Rio de Janeiro": [
    "ESTADUAL SAO GONCALO - RJ (T 12528)",
    "ESTADUAL CAMPOS DOS GOYTACAZES - RJ (T 12720)",
    "ESTADUAL DUQUE DE CAXIAS - RJ (T 12765)",
    "ESTADUAL NITEROI - RJ (T 13061)",
    "ESTADUAL NOVA IGUACU - RJ (T 13103)",
    "ESTADUAL PETROPOLIS - RJ (T 13166)",
    "ESTADUAL SENADOR POMPEU - RJ (T 17263)",
    "ESTADUAL CAMPO GRANDE - RJ (T 12704)"
  ],
  "Minas Gerais": [
    "ESTADUAL GAMELEIRA - CABANA - MG (T 10248)",
    "ESTADUAL BELO HORIZONTE - GUAICURUS - MG (T 10848)",
    "ESTADUAL GOVERNADOR VALADARES - MG (T 10808)",
    "ESTADUAL JUIZ DE FORA - MG (T 11074)",
    "ESTADUAL MURIAE - MG (T 11548)",
    "ESTADUAL UBERLANDIA - MG (T 12374)",
    "ESTADUAL MONTES CLAROS - MG (T 11502)"
  ],
  "Norte": [
    "AC - CRUZEIRO DO SUL (T 7468)",
    "AC - RIO BRANCO (T 17290)",
    "AM - MANAUS (T 17290)",
    "AM - TABATINGA (T 7874)",
    "AM - TEFE (T 7881)",
    "AM - TONANTINS (T 7897)",
    "PA - BREVES (T 8141)",
    "PA - ITAITUBA (T 8339)",
    "PA - MARABA (T 8431)",
    "PA - BELEM (T 17268)",
    "PA - SANTAREM (T 8706)",
    "RO - JI PARANA (T 8901)",
    "RO - PORTO VELHO (T 8933)",
    "TO - PALMAS (T 9162)",
    "AP - MACAPA (T 7932)",
    "RR - BOA VISTA (T 17226)"
  ],
  "Nordeste": [
    "MACEIO (T 4760)",
    "SALVADOR (T 5624)",
    "TEIXEIRA DE FREITAS (T 5786)",
    "VITORIA DA CONQUISTA (T 5851)",
    "JUAZEIRO DO NORTE (T 6047)",
    "FORTALEZA (T 6082)",
    "SOBRAL (T 6388)",
    "BALSAS (T 6430)",
    "IMPERATRIZ (T 6456)",
    "SAO LUIS (T 6547)",
    "CAMPINA GRANDE (T 6595)",
    "JOAO PESSOA (T 6642)",
    "PETROLINA (T 6895)",
    "NATAL (T 7167)",
    "ARACAJU (T 17229)",
    "RECIFE (T 17273)",
    "TERESINA (T 17274)"
  ],
  "Centro-Oeste": [
    "ESTADUAL BRASILIA - DF (T 3408)",
    "ESTADUAL GOIANIA - GO (T 3575)",
    "ESTADUAL CAMPO GRANDE - MS (T 4232)",
    "ESTADUAL CONFRESA - MT (T 4533)",
    "ESTADUAL CUIABA - MT (T 4554)"
  ],
  "Regiao Sul": [
    "ESTADUAL CASCAVEL - PR (T 241)",
    "ESTADUAL CURITIBA - PR (T 363)",
    "ESTADUAL GUARAPUAVA - PR (T 509)",
    "ESTADUAL LONDRINA - PR (T 748)",
    "ESTADUAL PONTA GROSSA - PR (T 988)",
    "ESTADUAL CAXIAS DO SUL - RS (T 1554)",
    "ESTADUAL PASSO FUNDO - RS (T 1944)",
    "ESTADUAL PELOTAS - RS (T 1976)",
    "ESTADUAL SANTANA DO LIVRAMENTO - RS (T 2093)",
    "ESTADUAL PORTO ALEGRE - RS (T 17262)",
    "ESTADUAL SANTA MARIA - RS (T 17591)",
    "ESTADUAL CHAPECO - SC (T 2584)",
    "ESTADUAL FLORIANOPOLIS - SC (T 2933)",
    "ESTADUAL LAGES - SC (T 3033)",
    "ESTADUAL JOINVILLE - SC (T 3122)"
  ]
};

export const REGOES_ESTADUAIS = Object.keys(ESTADUAIS_POR_REGIAO).reduce((acc, key) => {
  acc[key] = ESTADUAIS_POR_REGIAO[key].map((item) => {
    const match = item.match(/(.*?)\s*\(T\s*(\d+)\)/i);
    if (match) {
      return { nome: match[1].trim(), totvs: match[2].trim() };
    }
    return {
      nome: item.trim(),
      totvs: item.trim() === "SEDE MUNDIAL" ? "SEDE_MUNDIAL" : ""
    };
  });
  return acc;
}, {} as Record<string, { nome: string; totvs: string }[]>);

// Component to recenter/refocus map programmatically when filters change
function MapController({
  center,
  zoom,
  flyToTarget,
  onFlyToComplete,
  region,
  hasActiveRouteOrMesh,
}: {
  center: [number, number];
  zoom: number;
  flyToTarget: { center: [number, number]; zoom: number; totvs: string } | null;
  onFlyToComplete: () => void;
  region: string;
  hasActiveRouteOrMesh: boolean;
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
    } else if (region === 'ALL' && !hasActiveRouteOrMesh) {
      map.setView(center, zoom, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [center, zoom, flyToTarget, map, onFlyToComplete, region, hasActiveRouteOrMesh]);
  return null;
}

// Component to dynamically fit bounds of the selected Region Filter
function RegionBoundsController({
  region,
  igrejas,
  hasActiveRouteOrMesh,
}: {
  region: string;
  igrejas: Igreja[];
  hasActiveRouteOrMesh: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!region || region === 'ALL' || hasActiveRouteOrMesh) return;

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
  }, [region, igrejas, map, hasActiveRouteOrMesh]);
  return null;
}

// Component to dynamically fit bounds of connection paths, routes, or comparison routes
function MapBoundsController({
  bounds,
  routePath,
  routeAtual,
  routeCandidataA,
  routeCandidataB,
  routeMeta,
  comparisonMode,
  fixedDest,
  sedeCandidataA,
  sedeCandidataB,
  igrejas,
  connectionPathSource,
  activeChainCodes,
}: {
  bounds: any[] | null;
  routePath: [number, number][] | null;
  routeAtual: [number, number][] | null;
  routeCandidataA: [number, number][] | null;
  routeCandidataB: [number, number][] | null;
  routeMeta: RouteMeta | null;
  comparisonMode: boolean;
  fixedDest: Igreja | null;
  sedeCandidataA: Igreja | null;
  sedeCandidataB: Igreja | null;
  igrejas: Igreja[];
  connectionPathSource: string | null;
  activeChainCodes: string[];
}) {
  const map = useMap();
  useEffect(() => {
    // 1. If we have standard route active (routeMeta)
    if (routeMeta && routeMeta.originCoords && routeMeta.destinationCoords) {
      const routeBounds: [number, number][] = [
        routeMeta.originCoords,
        routeMeta.destinationCoords,
      ];
      map.fitBounds(routeBounds, {
        padding: [80, 80],
        animate: true,
        duration: 1,
      });
      return;
    }

    // 2. If comparison mode is active
    if (comparisonMode && fixedDest && fixedDest.latitude && fixedDest.longitude) {
      const points: [number, number][] = [];
      points.push([fixedDest.latitude, fixedDest.longitude]);

      // Find parent of fixedDest
      const parent = fixedDest.codigo_totvs_pai
        ? igrejas.find((p) => p.codigo_totvs === fixedDest.codigo_totvs_pai)
        : null;
      if (parent && parent.latitude && parent.longitude) {
        points.push([parent.latitude, parent.longitude]);
      }

      if (sedeCandidataA && sedeCandidataA.latitude && sedeCandidataA.longitude) {
        points.push([sedeCandidataA.latitude, sedeCandidataA.longitude]);
      }

      if (sedeCandidataB && sedeCandidataB.latitude && sedeCandidataB.longitude) {
        points.push([sedeCandidataB.latitude, sedeCandidataB.longitude]);
      }

      // We need at least 2 distinct points to fit bounds
      if (points.length >= 2) {
        map.fitBounds(points as any, {
          padding: [80, 80],
          animate: true,
          duration: 1,
        });
        return;
      }
    }

    // 3. If Connection Mesh (Malha de Conexão) is active
    if (connectionPathSource && activeChainCodes.length > 0) {
      const sourceChurch = igrejas.find((ig) => ig.codigo_totvs === connectionPathSource);
      const sourcePorte = sourceChurch ? (sourceChurch.porte || getPorte(sourceChurch.desc_igreja, sourceChurch.porte)) : 'LOCAL';
      const isLowLevel = sourcePorte === 'LOCAL' || sourcePorte === 'CASA DE ORAÇÃO' || sourcePorte === 'ALDEIA INDIGENA';
      const selectedPadding = isLowLevel ? [80, 80] : [60, 60];

      const meshCoords: [number, number][] = [];
      activeChainCodes.forEach((totvs) => {
        const found = igrejas.find((ig) => ig.codigo_totvs === totvs);
        if (found && found.latitude && found.longitude) {
          meshCoords.push([found.latitude, found.longitude]);
        }
      });

      if (meshCoords.length >= 1) {
        // Enforce soft fitBounds centering the entire active family tree teia
        const boundsObj = L.latLngBounds(meshCoords);
        map.fitBounds(boundsObj, {
          padding: selectedPadding as any,
          maxZoom: 14,
          animate: true,
          duration: 0.8,
        });
        return;
      }
    }

    // 4. Fallback to existing logic for connection paths or raw points if any
    if (bounds && bounds.length > 0) {
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
  }, [
    bounds,
    routePath,
    routeAtual,
    routeCandidataA,
    routeCandidataB,
    routeMeta,
    comparisonMode,
    fixedDest,
    sedeCandidataA,
    sedeCandidataB,
    igrejas,
    connectionPathSource,
    activeChainCodes,
    map,
  ]);
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

  const renderChurchTooltip = (ig: Igreja) => {
    const porte = ig.porte || getPorte(ig.desc_igreja, ig.porte);
    return (
      <Tooltip direction="top" offset={[0, -20]} opacity={0.95} permanent={false}>
        <div className="p-1.5 space-y-1 font-sans text-xs">
          <p className="font-bold text-zinc-950 leading-tight">{ig.desc_igreja}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-700 px-1 py-0.5 rounded border border-zinc-200">
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
      </Tooltip>
    );
  };

  // Helper function to render uniform descriptive Leaflet popups
  const renderChurchPopup = (ig: Igreja) => {
    const porte = ig.porte || getPorte(ig.desc_igreja, ig.porte);
    const parentChurch = ig.codigo_totvs_pai
      ? igrejas.find((p) => p.codigo_totvs === ig.codigo_totvs_pai)
      : null;

    return (
      <Popup className="custom-popup-styled !max-w-[340px] w-[340px]">
        <div className="p-3.5 space-y-2 font-sans">
          {/* Title banner */}
          <div className="border-b border-slate-150 pb-2">
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {ig.desc_igreja}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
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
          <div className="space-y-1.5 text-xs text-slate-500">
            {ig.tipo_imovel && (
              <p className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  <span className="font-semibold text-slate-400">Tipo de Imóvel:</span>{' '}
                  <span className="font-bold text-slate-800">{ig.tipo_imovel}</span>
                </span>
              </p>
            )}

            <p className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold text-slate-400">Endereço:</span>{' '}
                <span className="text-slate-800 font-medium">
                  {ig.endereco}
                  {ig.bairro ? `, ${ig.bairro}` : ''}, {ig.municipio} - {ig.estado}
                  {ig.cep ? ` (${ig.cep})` : ''}
                </span>
              </span>
            </p>

            {/* Coligada Hierarchical Info */}
            {ig.codigo_totvs_pai && (
              <p className="flex items-start gap-1.5 text-[11px] bg-slate-50 p-1.5 rounded-md border border-slate-100">
                <GitBranch className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                <span>
                  <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wider">Coligada a:</span>
                  <strong className="text-slate-800 font-bold block leading-tight">
                    {parentChurch ? parentChurch.desc_igreja : 'Igreja Superior'}
                  </strong>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Código: {ig.codigo_totvs_pai}
                  </span>
                </span>
              </p>
            )}

            {((ig as any).validado_em || ig.updated_at) && (
              <p className="text-[10px] text-slate-400">
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
              <p className="text-[10px] text-slate-400">
                <span className="font-semibold">Validador:</span> {ig.usuario_validador || (ig as any).validado_por}
              </p>
            )}
          </div>

          {/* Compact 2x2 + 1 Grid Action Panel */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {comparisonMode ? (
                // IF COMPARISON MODE IS ACTIVE
                fixedDest?.codigo_totvs === ig.codigo_totvs ? (
                  // AND THIS CHURCH IS THE TARGET/DESTINO
                  <>
                    {/* Row 1 is the compact status card spanning across 2 columns */}
                    <div className="col-span-2 h-9 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-center gap-1">
                      <span>📍 Alvo de Análise</span>
                    </div>

                    {/* Row 2: [ 📐 Cancelar Comp. ] | [ 🔗 Ver Malha ] */}
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonMode(false);
                        setFixedDest(null);
                        setSedeCandidataA(null);
                        setSedeCandidataB(null);
                        toast.info('Modo comparativo desativado.');
                      }}
                      className="h-9 text-xs font-semibold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors flex items-center justify-center gap-1 w-full"
                    >
                      <span>📐 Cancelar Comp.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTraceConnectionMesh(ig)}
                      className={`h-9 text-xs font-semibold border rounded-lg transition-colors flex items-center justify-center gap-1 w-full ${
                        connectionPathSource === ig.codigo_totvs
                          ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{connectionPathSource === ig.codigo_totvs ? '❌ Ocultar Malha' : '🔗 Ver Malha'}</span>
                    </button>
                  </>
                ) : (
                  // AND THIS CHURCH IS A CANDIDATE OR OTHER
                  <>
                    {/* Row 1: [ 🟢 Sede Cand. A ] | [ 🔵 Sede Cand. B ] */}
                    <button
                      type="button"
                      onClick={() => {
                        setSedeCandidataA(ig);
                        toast.success(`Sede Candidata A definida: ${ig.desc_igreja}`);
                      }}
                      className={`h-9 text-xs font-semibold border rounded-lg transition-colors flex items-center justify-center gap-1 w-full ${
                        sedeCandidataA?.codigo_totvs === ig.codigo_totvs
                          ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <span>🟢 Sede Cand. A</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSedeCandidataB(ig);
                        toast.success(`Sede Candidata B definida: ${ig.desc_igreja}`);
                      }}
                      className={`h-9 text-xs font-semibold border rounded-lg transition-colors flex items-center justify-center gap-1 w-full ${
                        sedeCandidataB?.codigo_totvs === ig.codigo_totvs
                          ? 'border-cyan-500 bg-cyan-500 text-white hover:bg-cyan-600'
                          : 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      <span>🔵 Sede Cand. B</span>
                    </button>

                    {/* Row 2: [ 📐 Comparar Rotas ] | [ 🔗 Ver Malha ] */}
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonMode(true);
                        setFixedDest(ig);
                        setSedeCandidataA(null);
                        setSedeCandidataB(null);
                        toast.success(`Novo destino definido: "${ig.desc_igreja}". Selecione as candidatas A e B.`);
                      }}
                      className="h-9 text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1 w-full"
                    >
                      <span>📐 Comparar Rotas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTraceConnectionMesh(ig)}
                      className={`h-9 text-xs font-semibold border rounded-lg transition-colors flex items-center justify-center gap-1 w-full ${
                        connectionPathSource === ig.codigo_totvs
                          ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{connectionPathSource === ig.codigo_totvs ? '❌ Ocultar Malha' : '🔗 Ver Malha'}</span>
                    </button>
                  </>
                )
              ) : (
                // IF COMPARISON MODE IS NOT ACTIVE (DEFAULT VIEW)
                <>
                  {/* Row 1, Column 1: [ 🚗 Rota Superior ] */}
                  <button
                    type="button"
                    disabled={!(ig.codigo_totvs_pai && parentChurch)}
                    onClick={() => fetchTerrestrialRoute(ig, parentChurch!)}
                    className="h-9 text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 disabled:cursor-not-allowed text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1 w-full"
                    title={ig.codigo_totvs_pai && parentChurch ? "Traçar rota rodoviária real até a igreja superior coligada" : "Esta igreja não possui coligação superior registrada"}
                  >
                    <span>🚗 Rota Superior</span>
                  </button>

                  {/* Row 1, Column 2: [ 📍 Definir Origem ] or [ 🏁 Traçar Rota ] or [ ❌ Cancelar ] */}
                  {!customRouteOrigin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomRouteOrigin(ig);
                        toast.success(`Origem definida: ${ig.desc_igreja}. Abra o popup da igreja de destino e clique em "Traçar Rota terrestre".`);
                      }}
                      className="h-9 text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1 w-full"
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
                      className="h-9 text-xs font-semibold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors flex items-center justify-center gap-1 w-full"
                    >
                      <span>🏁 Traçar Rota</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomRouteOrigin(null);
                        toast.info('Origem de rota redefinida.');
                      }}
                      className="h-9 text-xs font-semibold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg transition-colors flex items-center justify-center gap-1 w-full"
                    >
                      <span>❌ Cancelar</span>
                    </button>
                  )}

                  {/* Row 2, Column 1: [ 📐 Comparar Rotas ] */}
                  <button
                    type="button"
                    onClick={() => {
                      setComparisonMode(true);
                      setFixedDest(ig);
                      setSedeCandidataA(null);
                      setSedeCandidataB(null);
                      toast.success(`Modo Comparativo Ativo! "${ig.desc_igreja}" definido como Destino. Agora clique em outras igrejas para selecionar as Candidatas A e B.`);
                    }}
                    className="h-9 text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1 w-full"
                  >
                    <span>📐 Comparar Rotas</span>
                  </button>

                  {/* Row 2, Column 2: [ 🔗 Ver Malha ] */}
                  <button
                    type="button"
                    onClick={() => handleTraceConnectionMesh(ig)}
                    className={`h-9 text-xs font-semibold border rounded-lg transition-colors flex items-center justify-center gap-1 w-full ${
                      connectionPathSource === ig.codigo_totvs
                        ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{connectionPathSource === ig.codigo_totvs ? '❌ Ocultar Malha' : '🔗 Ver Malha'}</span>
                  </button>
                </>
              )}
            </div>

            {/* Row 3 (Ação Principal em Destaque): [ 🗺️ Abrir no Google Maps ↗ ] */}
            <a
              href={ig.link_google_maps || `https://www.google.com/maps?q=${ig.latitude},${ig.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 w-full shadow-xs"
            >
              <span>🗺️ Abrir no Google Maps ↗</span>
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
  const [porteLegendMobileOpen, setPorteLegendMobileOpen] = useState(false);

  // Toggle collapsible Filters Popover (Desktop and Mobile)
  const [showFilters, setShowFilters] = useState(false);

  // Fetch validated churches on mount
  const fetchValidatedChurches = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch('/api/igrejas/validadas');
      const data = await res.json();
      if (data.success) {
        setIgrejas(data.igrejas || []);
      } else {
        if (!silent) {
          setError(data.error || 'Erro ao carregar igrejas.');
        }
      }
    } catch (err) {
      console.error('Error fetching validated churches:', err);
      if (!silent) {
        setError('Erro ao se conectar com o servidor.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchValidatedChurches();
  }, []);

  // Handle ?totvs=CODE query parameter on load
  useEffect(() => {
    if (igrejas.length > 0 && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const totvsParam = params.get('totvs');
      if (totvsParam) {
        const normalizedParam = normalizeTotvs(totvsParam);
        const found = igrejas.find((ig) => normalizeTotvs(ig.codigo_totvs) === normalizedParam);
        if (found && found.latitude && found.longitude) {
          setFlyToTarget({
            center: [found.latitude, found.longitude],
            zoom: 15,
            totvs: found.codigo_totvs,
          });
        }
      }
    }
  }, [igrejas]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchValidatedChurches(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  // Compute filtered churches list in-realtime with exact match prioritization
  const filteredIgrejas = useMemo(() => {
    const rawFiltered = igrejas.filter((ig) => {
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
        const typeNormalized = normalizeText(ig.tipo_imovel || '');
        if (selectedTipoImovel === 'PROPRIO') {
          if (!typeNormalized.includes('PROP')) {
            return false;
          }
        } else if (selectedTipoImovel === 'ALUGADO') {
          if (!typeNormalized.includes('ALUG')) {
            return false;
          }
        } else if (selectedTipoImovel === 'CEDIDO') {
          if (typeNormalized.includes('PROP') || typeNormalized.includes('ALUG')) {
            return false;
          }
        }
      }

      // 4. Size/Porte filter
      const porte = ig.porte || getPorte(ig.desc_igreja, ig.porte);
      if (selectedPortes.length > 0 && !selectedPortes.includes(porte)) {
        return false;
      }

      // 5. Search Text Filter (TOTVS or Name)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const normQueryTotvs = normalizeTotvs(query);
        const normIgTotvs = normalizeTotvs(ig.codigo_totvs);

        const codeMatch = normIgTotvs === normQueryTotvs || ig.codigo_totvs.toLowerCase().includes(query);
        const nameMatch = ig.desc_igreja.toLowerCase().includes(query);
        const addressMatch = (ig.endereco || '').toLowerCase().includes(query);
        const cityMatch = (ig.municipio || '').toLowerCase().includes(query);
        if (!codeMatch && !nameMatch && !addressMatch && !cityMatch) {
          return false;
        }
      }

      return true;
    });

    // Exact Match First Sorting & Secondary Text Match Fallback logic
    if (searchQuery.trim()) {
      const termNorm = normalizeTotvs(searchQuery);
      const isSearchNumeric = /^\d+$/.test(termNorm);

      // 1. If searching numerically, check for exact TOTVS match
      if (isSearchNumeric) {
        const exactMatch = rawFiltered.find((ig) => normalizeTotvs(ig.codigo_totvs) === termNorm);
        if (exactMatch) {
          return [exactMatch];
        }
      }

      // 2. Otherwise sort exact TOTVS code matches to the absolute top, fallback secondary matches
      return [...rawFiltered].sort((a, b) => {
        const aNorm = normalizeTotvs(a.codigo_totvs);
        const bNorm = normalizeTotvs(b.codigo_totvs);

        const aExact = aNorm === termNorm;
        const bExact = bNorm === termNorm;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.desc_igreja.localeCompare(b.desc_igreja);
      });
    }

    return rawFiltered;
  }, [igrejas, selectedRegionGeo, selectedUF, selectedTipoImovel, selectedPortes, searchQuery]);

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
    if (!found && (totvs === "SEDE_MUNDIAL" || totvs === "")) {
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

      const startPorte = startChurch.porte || getPorte(startChurch.desc_igreja, startChurch.porte);

      // A) Climb up to the root (ESTADUAL) to collect all upstream/ancestor nodes
      const ancestryChain = [startChurch];
      const climbVisited = new Set();
      let currentUp = startChurch;
      while (currentUp.codigo_totvs_pai) {
        if (climbVisited.has(currentUp.codigo_totvs)) {
          break; // Avoid cycle
        }
        climbVisited.add(currentUp.codigo_totvs);
        const parent = igrejas.find((ig) => ig.codigo_totvs === currentUp.codigo_totvs_pai);
        if (!parent) {
          break;
        }
        ancestryChain.push(parent);
        currentUp = parent;
      }

      // Root church is the last element of the ancestry chain
      const rootChurch = ancestryChain[ancestryChain.length - 1];

      if (startPorte === 'LOCAL' || startPorte === 'CASA DE ORAÇÃO' || startPorte === 'ALDEIA INDIGENA') {
        // Rule 1: LOW-LEVEL PORTE - ONLY DIRECT ANCESTRY PATH (UPSTREAM)
        ancestryChain.forEach((ig) => chainCodes.add(ig.codigo_totvs));
      } else if (startPorte === 'REGIONAL' || startPorte === 'CENTRAL' || startPorte === 'SETORIAL') {
        // Rule 2: INTERMEDIATE PORTE - ANCESTRY (UPSTREAM) + DIRECT DESCENDANTS SUB-TREE (DOWNSTREAM)
        // 1. Add full ancestry path to root
        ancestryChain.forEach((ig) => chainCodes.add(ig.codigo_totvs));

        // 2. Add sub-tree of descendants starting from the selected intermediate church (startChurch)
        const queue = [startChurch.codigo_totvs];
        const visitedDescendants = new Set([startChurch.codigo_totvs]);

        while (queue.length > 0) {
          const currentCode = queue.shift();
          const directChildren = igrejas.filter(
            (ig) => ig.codigo_totvs_pai === currentCode && !visitedDescendants.has(ig.codigo_totvs)
          );
          for (const child of directChildren) {
            visitedDescendants.add(child.codigo_totvs);
            chainCodes.add(child.codigo_totvs);
            queue.push(child.codigo_totvs);
          }
        }
      } else {
        // Rule 3: ESTADUAL (or ROOT) PORTE - FULL commands network downstream under its command
        chainCodes.add(rootChurch.codigo_totvs);
        const queue = [rootChurch.codigo_totvs];
        const visitedDescendants = new Set([rootChurch.codigo_totvs]);

        while (queue.length > 0) {
          const currentCode = queue.shift();
          const directChildren = igrejas.filter(
            (ig) => ig.codigo_totvs_pai === currentCode && !visitedDescendants.has(ig.codigo_totvs)
          );
          for (const child of directChildren) {
            visitedDescendants.add(child.codigo_totvs);
            chainCodes.add(child.codigo_totvs);
            queue.push(child.codigo_totvs);
          }
        }
      }

      // B) For each church in the processing set, trace a segment line ONLY to its direct parent if the parent is also in chainCodes
      chainCodes.forEach((codigoTotvs) => {
        const daughter = igrejas.find((ig) => ig.codigo_totvs === codigoTotvs);

        if (daughter && daughter.codigo_totvs_pai) {
          if (chainCodes.has(daughter.codigo_totvs_pai)) {
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
        <div class="relative flex flex-col items-center justify-center cursor-pointer" style="width: ${w}px; height: ${h}px; cursor: pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${info.color}" stroke="#FFFFFF" stroke-width="2.8" style="width: ${w}px; height: ${h}px; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.6)); cursor: pointer;" class="z-20 cursor-pointer">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </div>
      `,
      className: 'cursor-pointer',
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
        <div class="relative flex flex-col items-center justify-center cursor-pointer" style="width: ${w}px; height: ${h}px; cursor: pointer;">
          <div class="absolute rounded-full bg-transparent border-2 border-dashed ${ringAnim} pointer-events-none" style="border-color: ${ringColor}; width: ${w + 10}px; height: ${h + 10}px;"></div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${info.color}" stroke="#FFFFFF" stroke-width="2.8" style="width: ${w}px; height: ${h}px; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.7)); cursor: pointer;" class="z-50 cursor-pointer">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </div>
      `,
      className: 'cursor-pointer',
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
      <header className="absolute top-2 left-1/2 -translate-x-1/2 w-[95%] md:w-[90%] max-w-6xl mx-auto mt-2 md:mt-3 z-[1020] bg-white/85 backdrop-blur-md border border-zinc-200 shadow-xl rounded-2xl md:rounded-full p-3 flex flex-col md:flex-row items-center justify-between gap-3 transition-all duration-300">
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
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 min-h-[44px] ${
              showFilters
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filtros</span>
          </button>

          <a
            href="/organizacao"
            className="p-1.5 bg-white text-zinc-650 hover:text-zinc-950 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all flex items-center justify-center shrink-0 gap-1.5 px-3"
            title="Ver Estrutura Organizacional"
          >
            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-xs font-semibold hidden sm:inline">🏛️ Organização</span>
          </a>

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
            onClick={() => fetchValidatedChurches()}
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
        <>
          {/* Backdrop overlay on mobile */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1025] md:hidden"
            onClick={() => setShowFilters(false)}
          />
          <section className="fixed bottom-0 left-0 right-0 md:absolute md:top-20 md:right-4 md:bottom-auto md:left-auto w-full md:max-w-sm rounded-t-3xl md:rounded-2xl bg-white md:bg-white/95 backdrop-blur-md border-t md:border border-zinc-200 shadow-2xl md:shadow-xl p-5 md:p-4 space-y-4 z-[1030] md:z-[1015] max-h-[85vh] overflow-y-auto md:overflow-visible flex flex-col transition-all duration-300 animate-in slide-in-from-bottom md:slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                🎛️ Painel de Filtros Rápidos
              </span>
              <button
                onClick={() => setShowFilters(false)}
                className="text-zinc-400 hover:text-zinc-600 p-2.5 hover:bg-zinc-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5" />
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
                        {est.nome} {est.totvs && est.totvs !== 'SEDE_MUNDIAL' ? `(${est.totvs})` : ''}
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
                  <option value="CEDIDO">Cedido/Outros</option>
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
      </>
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
              onClick={() => fetchValidatedChurches()}
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
              preferCanvas={true}
              zoomAnimation={true}
              fadeAnimation={true}
              className="w-full h-full z-10"
            >
              <MapController
                center={mapCenter}
                zoom={mapZoom}
                flyToTarget={flyToTarget}
                region={selectedRegionGeo}
                hasActiveRouteOrMesh={!!routeMeta || comparisonMode || !!connectionPathSource}
                onFlyToComplete={() => {
                  if (flyToTarget) {
                    const targetTotvs = flyToTarget.totvs;
                    // Trigger popup of the focused marker after flyTo is done
                    const markerInstance = markerRefs.current[targetTotvs];
                    if (markerInstance) {
                      markerInstance.openPopup();
                    } else {
                      // fallback: if not in ref, or if it is "Sede Mundial" without a totvs, check for Sede Mundial
                      if (targetTotvs === "" || targetTotvs === "SEDE_MUNDIAL") {
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

              <RegionBoundsController
                region={selectedRegionGeo}
                igrejas={igrejas}
                hasActiveRouteOrMesh={!!routeMeta || comparisonMode || !!connectionPathSource}
              />

              <MapBoundsController
                bounds={selectedConnectionPath}
                routePath={routePath}
                routeAtual={routeAtual}
                routeCandidataA={routeCandidataA}
                routeCandidataB={routeCandidataB}
                routeMeta={routeMeta}
                comparisonMode={comparisonMode}
                fixedDest={fixedDest}
                sedeCandidataA={sedeCandidataA}
                sedeCandidataB={sedeCandidataB}
                igrejas={igrejas}
                connectionPathSource={connectionPathSource}
                activeChainCodes={activeChainCodes}
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
                    const porte = ig.porte || getPorte(ig.desc_igreja, ig.porte);
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
                        {renderChurchTooltip(ig)}
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
                {/* When connection mesh is active, completely hide non-participating markers/clusters */}
                {(!connectionPathSource
                  ? filteredIgrejas
                  : []
                )
                  .filter((ig) => !activeChainCodes.includes(ig.codigo_totvs))
                  .map((ig) => {
                    const isSedeMundial = ig.desc_igreja.toUpperCase().includes("SEDE MUNDIAL");
                    const porte = ig.porte || getPorte(ig.desc_igreja, ig.porte);
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
                        {renderChurchTooltip(ig)}
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
            <div className="hidden md:block absolute bottom-[280px] left-6 z-[1000] bg-white border border-zinc-200 rounded-2xl shadow-xl max-w-xs transition-all duration-300 overflow-hidden">
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

            {/* Floating OSRM Route Comparison Card (Responsive: Bottom Sheet on Mobile, Floating Card on Desktop) */}
            {comparisonMode && fixedDest && (
              <>
                {/* Backdrop overlay on mobile */}
                <div
                  className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1025] md:hidden"
                  onClick={() => {
                    setComparisonMode(false);
                    setFixedDest(null);
                  }}
                />
                <div className="fixed bottom-0 left-0 right-0 top-auto md:absolute md:top-24 md:right-6 md:bottom-auto md:left-auto w-full md:w-96 rounded-t-3xl md:rounded-2xl border-t md:border border-zinc-200 bg-white shadow-2xl p-5 space-y-4 z-[1030] max-h-[85vh] overflow-y-auto duration-300 animate-in slide-in-from-bottom md:slide-in-from-top-2 flex flex-col">
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-2.5 gap-4 shrink-0">
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
                      className="text-zinc-400 hover:text-zinc-650 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-zinc-100 rounded-full transition-all"
                      title="Fechar Comparador"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs shrink-0">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Igreja Alvo (Destino)</span>
                    <span className="font-bold text-zinc-900 block truncate" title={fixedDest.desc_igreja}>{fixedDest.desc_igreja}</span>
                  </div>

                  {/* Comparative Table */}
                  <div className="space-y-3 pt-2.5 border-t border-zinc-100 overflow-y-auto">
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
                            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1 min-h-[44px]"
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
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-zinc-800 font-bold block truncate max-w-[180px]" title={sedeCandidataA.desc_igreja}>
                              {sedeCandidataA.desc_igreja}
                            </span>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${sedeCandidataA.latitude},${sedeCandidataA.longitude}&destination=${fixedDest.latitude},${fixedDest.longitude}&travelmode=transit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1 min-h-[44px]"
                              title="Ver linhas de ônibus municipais/urbanos, rodoviárias e custos no Google Maps"
                            >
                              <span>🚌 Ônibus</span>
                            </a>
                          </div>

                          {/* Ganho calculations */}
                          {metaAtual && metaCandidataA && (
                            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
                              {metaAtual.distance - metaCandidataA.distance > 0 ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-250 text-center">
                                  🟢 {(metaAtual.distance - metaCandidataA.distance).toFixed(1)}km mais perto
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-full border border-rose-250 text-center">
                                  🔴 {Math.abs(metaAtual.distance - metaCandidataA.distance).toFixed(1)}km mais longe
                                </span>
                              )}

                              {/* Transfer Action button */}
                              {isAuthenticated ? (
                                <button
                                  type="button"
                                  onClick={() => handleTransferColigacao(sedeCandidataA)}
                                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all border border-indigo-750 shadow-xs flex items-center justify-center gap-1.5 min-h-[44px]"
                                  title="Gravar nova vinculação hierárquica no banco de dados Neon"
                                >
                                  <span>🔄 Transferir Coligação para esta Sede</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-zinc-400 font-black italic bg-zinc-100 border border-zinc-200 px-3 py-2 rounded-xl text-center" title="Faça login como administrador para alterar a coligação">
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
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-zinc-800 font-bold block truncate max-w-[180px]" title={sedeCandidataB.desc_igreja}>
                              {sedeCandidataB.desc_igreja}
                            </span>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${sedeCandidataB.latitude},${sedeCandidataB.longitude}&destination=${fixedDest.latitude},${fixedDest.longitude}&travelmode=transit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1 min-h-[44px]"
                              title="Ver linhas de ônibus municipais/urbanos, rodoviárias e custos no Google Maps"
                            >
                              <span>🚌 Ônibus</span>
                            </a>
                          </div>

                          {/* Ganho calculations */}
                          {metaAtual && metaCandidataB && (
                            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
                              {metaAtual.distance - metaCandidataB.distance > 0 ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-250 text-center">
                                  🟢 {(metaAtual.distance - metaCandidataB.distance).toFixed(1)}km mais perto
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-full border border-rose-250 text-center">
                                  🔴 {Math.abs(metaAtual.distance - metaCandidataB.distance).toFixed(1)}km mais longe
                                </span>
                              )}

                              {/* Transfer Action button */}
                              {isAuthenticated ? (
                                <button
                                  type="button"
                                  onClick={() => handleTransferColigacao(sedeCandidataB)}
                                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all border border-indigo-750 shadow-xs flex items-center justify-center gap-1.5 min-h-[44px]"
                                  title="Gravar nova vinculação hierárquica no banco de dados Neon"
                                >
                                  <span>🔄 Transferir Coligação para esta Sede</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-zinc-400 font-black italic bg-zinc-100 border border-zinc-200 px-3 py-2 rounded-xl text-center" title="Faça login como administrador para alterar a coligação">
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
                  <div className="pt-2 border-t border-zinc-100 text-[9px] text-zinc-500 leading-normal shrink-0">
                    <span>ℹ️ Nota: A disponibilidade de transporte público (ônibus/trem) depende do cadastramento das linhas municipais na região. Para áreas rurais ou isoladas, o sistema indicará a rota por veículo próprio.</span>
                  </div>
                </div>
              </>
            )}

            {/* Floating OSRM Route Details Card (Responsive: Bottom Sheet on Mobile, Floating Card on Desktop) */}
            {routeMeta && (
              <>
                {/* Backdrop overlay on mobile */}
                <div
                  className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1025] md:hidden"
                  onClick={() => {
                    setRoutePath(null);
                    setRouteMeta(null);
                    setActiveRouteOrigin(null);
                    setActiveRouteDest(null);
                  }}
                />
                <div className="fixed bottom-0 left-0 right-0 top-auto md:absolute md:bottom-6 md:right-6 md:left-auto w-full md:w-80 rounded-t-3xl md:rounded-2xl border-t md:border border-zinc-200 bg-white/95 backdrop-blur-md p-5 shadow-2xl space-y-3 z-[1030] max-h-[85vh] overflow-y-auto duration-300 animate-in slide-in-from-bottom md:slide-in-from-bottom-2 flex flex-col">
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-2 gap-4 shrink-0">
                    <div className="flex items-center gap-1.5 text-zinc-900">
                      <span className="text-sm">🚗</span>
                      <h3 className="text-xs font-black uppercase tracking-wider">
                        Rota Ativa
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
                      className="text-zinc-400 hover:text-zinc-650 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-zinc-100 rounded-full transition-all"
                      title="Limpar Rota"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs pt-1 overflow-y-auto">
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

                  <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2 shrink-0">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${routeMeta.originCoords[0]},${routeMeta.originCoords[1]}&destination=${routeMeta.destinationCoords[0]},${routeMeta.destinationCoords[1]}&travelmode=transit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-250 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs min-h-[44px]"
                      title="Ver linhas de ônibus intermunicipais/urbanos, rodoviárias mais próximas, horários e custos de passagem para este destino específico"
                    >
                      <span>🚌 Ver Opções de Ônibus / Transporte Público</span>
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${routeMeta.originCoords[0]},${routeMeta.originCoords[1]}&destination=${routeMeta.destinationCoords[0]},${routeMeta.destinationCoords[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm min-h-[44px]"
                    >
                      <span>Abrir GPS / Google Maps ↗</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </>
            )}

            {/* Desktop-only Floating Legend Card (Lower Left Corner) */}
            <div className="hidden md:block absolute bottom-6 left-6 z-[1000] bg-white border border-zinc-200 rounded-2xl p-4 shadow-xl max-w-xs space-y-3">
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

            {/* Mobile-only Minimized Floating Legend Button */}
            <div className="absolute bottom-6 left-6 z-[1000] md:hidden">
              <button
                onClick={() => setPorteLegendMobileOpen(true)}
                className="bg-white border border-zinc-200 rounded-full py-2.5 px-4 shadow-lg text-xs font-bold text-zinc-800 flex items-center gap-1.5 min-h-[44px] min-w-[44px] hover:bg-zinc-50 active:bg-zinc-100 transition-all"
              >
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Legenda</span>
              </button>
            </div>

            {/* Mobile-only Bottom Sheet for Legends */}
            {porteLegendMobileOpen && (
              <>
                {/* Backdrop overlay */}
                <div
                  className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1025] md:hidden"
                  onClick={() => setPorteLegendMobileOpen(false)}
                />
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 rounded-t-3xl shadow-2xl p-6 z-[1030] max-h-[85vh] overflow-y-auto space-y-6 md:hidden animate-in slide-in-from-bottom duration-300 flex flex-col">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2 shrink-0">
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4.5 w-4.5 text-indigo-600" />
                      Legendas do Mapa
                    </h3>
                    <button
                      onClick={() => setPorteLegendMobileOpen(false)}
                      className="text-zinc-400 hover:text-zinc-650 p-2.5 hover:bg-zinc-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-5 overflow-y-auto">
                    <div>
                      <h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                        <span>⭐</span> Portes Oficiais
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-zinc-750">
                        {Object.values(PORTE_INFO).map((item) => (
                          <div key={item.name} className="flex items-center space-x-2">
                            <span
                              className="w-4 h-4 rounded-md border border-zinc-300 shadow-xs inline-block shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="uppercase tracking-wide font-mono text-zinc-800 text-[10px]">
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-4">
                      <h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                        <span>🎨</span> Cores de Agrupamento (Regiões/UF)
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-zinc-750">
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-md border border-zinc-300 bg-[#F59E0B] shrink-0" />
                          <span>SP</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-md border border-zinc-300 bg-[#EA580C] shrink-0" />
                          <span>MG</span>
                        </div>
                        <div className="flex items-center space-x-2 col-span-2">
                          <span className="w-4 h-4 rounded-md border border-zinc-300 bg-[#DC2626] shrink-0" />
                          <span>ES / RJ</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-md border border-zinc-300 bg-[#2563EB] shrink-0" />
                          <span>Sul</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-md border border-zinc-300 bg-[#059669] shrink-0" />
                          <span>Norte</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-md border border-zinc-300 bg-[#7C3AED] shrink-0" />
                          <span>Nordeste</span>
                        </div>
                        <div className="flex items-center space-x-2 col-span-2">
                          <span className="w-4 h-4 rounded-md border border-zinc-300 bg-[#0891B2] shrink-0" />
                          <span>Centro-Oeste</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
