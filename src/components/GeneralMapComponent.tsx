'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
} from 'lucide-react';
import { Igreja } from '@/lib/db';

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

// Map of precise official colors (as requested)
export const PORTE_INFO: Record<string, { name: string; color: string; label: string }> = {
  ESTADUAL: { name: 'ESTADUAL', color: '#8FAADC', label: 'Estadual (Azul)' },
  SETORIAL: { name: 'SETORIAL', color: '#FFFF00', label: 'Setorial (Amarelo)' },
  CENTRAL: { name: 'CENTRAL', color: '#F8CBAD', label: 'Central (Laranja/Pêssego)' },
  REGIONAL: { name: 'REGIONAL', color: '#A9D08E', label: 'Regional (Verde/Menta)' },
  LOCAL: { name: 'LOCAL', color: '#A6A6A6', label: 'Local (Cinza)' },
  'CASA DE ORAÇÃO': { name: 'CASA DE ORAÇÃO', color: '#D9B8C4', label: 'Casa de Oração (Rosa/Lilás)' },
  'ALDEIA INDIGENA': { name: 'ALDEIA INDIGENA', color: '#00FFFF', label: 'Aldeia Indígena (Ciano/Turquesa)' },
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

export default function GeneralMapComponent() {
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map Tile layer type
  const [mapType, setMapType] = useState<'satellite' | 'osm'>('satellite');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUF, setSelectedUF] = useState('ALL');
  const [selectedTipoImovel, setSelectedTipoImovel] = useState('ALL');
  const [selectedPortes, setSelectedPortes] = useState<string[]>([]);

  // Hierarchical Region & Estadual filters
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedEstadual, setSelectedEstadual] = useState<string>('');

  // Map focus / flyTo target state
  const [flyToTarget, setFlyToTarget] = useState<{ center: [number, number]; zoom: number; totvs: string } | null>(null);

  // Refs for markers to programmatically open popups
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  // Toggle Filters visibility on mobile
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
    const ufs = Array.from(new Set(igrejas.map((ig) => ig.estado).filter(Boolean)));
    return ufs.sort();
  }, [igrejas]);

  // Compute filtered churches list in-realtime
  const filteredIgrejas = useMemo(() => {
    return igrejas.filter((ig) => {
      // 1. Coordinates validation
      if (ig.latitude === null || ig.longitude === null || ig.latitude === 0 || ig.longitude === 0) {
        return false;
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

  // Custom marker icon builder using exact hex colors and dark outline stroke
  const getMarkerIcon = (porte: string) => {
    const info = PORTE_INFO[porte] || PORTE_INFO.LOCAL;
    return L.divIcon({
      html: `
        <div class="relative flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${info.color}" stroke="#27272a" stroke-width="1.5" class="w-8 h-8 drop-shadow-md">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  // Toggle selected size/porte helper
  const handleTogglePorte = (porte: string) => {
    if (selectedPortes.includes(porte)) {
      setSelectedPortes(selectedPortes.filter((p) => p !== porte));
    } else {
      setSelectedPortes([...selectedPortes, porte]);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedUF('ALL');
    setSelectedTipoImovel('ALL');
    setSelectedPortes([]);
    setSelectedRegion('ALL');
    setSelectedEstadual('');
    setFlyToTarget(null);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50">
      {/* Header Panel */}
      <header className="bg-white border-b border-zinc-200 z-[1020] shadow-xs px-4 py-3 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <a
            href="/"
            className="p-2 hover:bg-zinc-100 rounded-xl transition-all border border-zinc-200 text-zinc-600 hover:text-zinc-950 flex items-center justify-center shrink-0"
            title="Voltar para a Validação"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <div>
            <h1 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              📍 Mapa Geral de Igrejas Validadas
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold border border-indigo-100">
                {filteredIgrejas.length} no mapa
              </span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-medium">
              Geolocalização oficial e monitoramento de igrejas marcadas como VALIDADAS
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por código, nome ou município..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-100 border border-zinc-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border sm:hidden flex items-center justify-center transition-all ${
              showFilters
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          <button
            onClick={fetchValidatedChurches}
            disabled={loading}
            className="p-2 bg-white text-zinc-600 hover:text-zinc-950 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
            title="Atualizar dados do banco"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Real-time Filters panel (Desktop: always visible, Mobile: expandable) */}
      <section
        className={`bg-white border-b border-zinc-200 px-4 py-3 sm:px-6 z-[1010] shadow-xs flex flex-col gap-4 ${
          showFilters ? 'flex' : 'hidden sm:flex'
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* UF Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
              Estado (UF)
            </label>
            <select
              value={selectedUF}
              onChange={(e) => setSelectedUF(e.target.value)}
              className="bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs rounded-xl p-2 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-40"
            >
              <option value="ALL">Todos os Estados</option>
              {distinctUFs.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>

          {/* Real Estate Property Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
              Imóvel
            </label>
            <select
              value={selectedTipoImovel}
              onChange={(e) => setSelectedTipoImovel(e.target.value)}
              className="bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs rounded-xl p-2 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-40"
            >
              <option value="ALL">Todos</option>
              <option value="PROPRIO">Próprio</option>
              <option value="ALUGADO">Alugado</option>
            </select>
          </div>

          {/* Hierarchical Region Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Layers className="h-3.5 w-3.5 text-zinc-400" />
              Região
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedEstadual('');
                setFlyToTarget(null);
              }}
              className="bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs rounded-xl p-2 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-44"
            >
              <option value="ALL">Todas as Regiões</option>
              {Object.keys(REGOES_ESTADUAIS).map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Hierarchical Estadual de Referência Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
              Estadual de Ref.
            </label>
            <select
              value={selectedEstadual}
              disabled={selectedRegion === 'ALL'}
              onChange={(e) => handleSelectEstadual(e.target.value)}
              className="bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs rounded-xl p-2 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-48 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Selecione uma Estadual</option>
              {selectedRegion !== 'ALL' &&
                REGOES_ESTADUAIS[selectedRegion as keyof typeof REGOES_ESTADUAIS]?.map((est) => (
                  <option key={est.nome} value={est.totvs}>
                    {est.nome} {est.totvs ? `(${est.totvs})` : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-zinc-100 pt-3">
          {/* Porte / Size Multi-selection tags */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Filter className="h-3.5 w-3.5 text-zinc-400" />
              Porte da Igreja
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {Object.values(PORTE_INFO).map((item) => {
                const active = selectedPortes.includes(item.name);
                return (
                  <button
                    key={item.name}
                    onClick={() => handleTogglePorte(item.name)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full border border-black/10 inline-block"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Filter Button */}
          {(selectedRegion !== 'ALL' || selectedEstadual || selectedUF !== 'ALL' || selectedTipoImovel !== 'ALL' || selectedPortes.length > 0 || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-xl flex items-center gap-1 self-start sm:self-center transition-all ml-auto shrink-0"
            >
              <X className="h-3 w-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </section>

      {/* Main Workspace Map Block */}
      <div className="flex-1 relative flex items-stretch">
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

              {/* Marker Clustering with react-leaflet-cluster */}
              <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={(cluster: any) => {
                  const count = cluster.getChildCount();
                  let size = 35;
                  let bg = '#6D28D9'; // Solid violet-700

                  if (count > 100) {
                    size = 55;
                    bg = '#4C1D95'; // Darker violet-900 for huge counts
                  } else if (count > 10) {
                    size = 45;
                    bg = '#5B21B6'; // Violet-800
                  }

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
                {filteredIgrejas.map((ig) => {
                  const porte = getPorte(ig.desc_igreja);
                  const icon = getMarkerIcon(porte);
                  const isSedeMundial = ig.desc_igreja.toUpperCase().includes("SEDE MUNDIAL");

                  return (
                    <Marker
                      key={ig.codigo_totvs}
                      position={[ig.latitude!, ig.longitude!]}
                      icon={icon}
                      alt={isSedeMundial ? "Sede Mundial" : undefined}
                      ref={(el) => {
                        if (el) {
                          markerRefs.current[ig.codigo_totvs] = el;
                        } else {
                          delete markerRefs.current[ig.codigo_totvs];
                        }
                      }}
                    >
                      {/* Leaflet Interactive Popup */}
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

                          {/* Google Maps Link */}
                          <div className="pt-2 border-t border-zinc-100 flex justify-end">
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
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
            </MapContainer>

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
