'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import SpreadsheetUpload from '@/components/SpreadsheetUpload';
import MapWrapper from '@/components/MapWrapper';
import DashboardView from '@/components/DashboardView';
import { Igreja } from '@/lib/db';
import { normalizeUF, isResultInState } from '@/lib/geocoding';
import {
  Filter,
  Check,
  AlertTriangle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ExternalLink,
  User,
  Info,
  Layers,
  Zap,
  Loader2,
  Search,
  X,
  BarChart3,
  Sparkles,
  Link,
  Clipboard,
} from 'lucide-react';

export function limparEndereco(endereco: string): string {
  if (!endereco) return '';
  let limpo = endereco;

  // 1. Remove expressions like "ANTIGO ENDERECO:" / "ANTIGO ENDEREÇO:" (case-insensitive)
  limpo = limpo.replace(/antigo\s+endere[cç]o:?\s*/gi, '');

  // 2. Remove text between parentheses
  limpo = limpo.replace(/\([^)]*\)/g, '');

  // 3. Remove S/N or SN (case-insensitive, handle borders)
  limpo = limpo.replace(/,\s*[sS]\/?[nN]\b/g, '');
  limpo = limpo.replace(/\b[sS]\/?[nN]\b/g, '');

  // 4. Double space and comma cleaning
  limpo = limpo.replace(/\s+/g, ' ');
  limpo = limpo.trim().replace(/^,|,$/g, '').trim();

  return limpo;
}

/**
  * 100% Free ViaCEP integration to enrich address details by CEP.
  */
async function fetchViaCEP(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string } | null> {
  if (!cep) return null;
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && !data.erro) {
      return {
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        localidade: data.localidade || '',
        uf: data.uf || '',
      };
    }
  } catch (err) {
    console.error(`ViaCEP error for CEP ${cep}:`, err);
  }
  return null;
}

interface GeocodeResult {
  lat: number;
  lon: number;
  returnedState?: string;
}

/**
  * 100% Free Geocoding API Cascade with Rigid Geographic UF State Lock:
  * 1. OpenStreetMap (Nominatim API) with countrycodes=br & addressdetails=1
  * 2. Photon Komoot API (OSM Fallback)
  */
async function fetchGeocodeUnstructured(
  queryStr: string,
  targetUF?: string | null
): Promise<GeocodeResult | null> {
  if (!queryStr || queryStr.trim().length < 3) return null;

  // 1. Try Nominatim OpenStreetMap API
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&q=${encodeURIComponent(
      queryStr
    )}&limit=3`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LocalizacaoIPDA/1.0 (validador@ipda.com.br)' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const returnedState =
            item.address?.state ||
            item.address?.['ISO3166-2-lvl4'] ||
            item.address?.state_code ||
            null;

          if (!isNaN(lat) && !isNaN(lon)) {
            // Rigid State Lock Check
            if (isResultInState(lat, lon, targetUF || null, returnedState)) {
              return { lat, lon, returnedState };
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Nominatim error for query: "${queryStr}"`, err);
  }

  // 2. Fallback: Photon Komoot Free Geocoding API
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      queryStr
    )}&limit=3`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        for (const feature of data.features) {
          const coords = feature.geometry?.coordinates;
          const props = feature.properties || {};
          const returnedState = props.state || props.statecode || null;

          if (coords && coords.length >= 2) {
            const lon = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);

            if (!isNaN(lat) && !isNaN(lon)) {
              // Rigid State Lock Check
              if (isResultInState(lat, lon, targetUF || null, returnedState)) {
                return { lat, lon, returnedState };
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Photon error for query: "${queryStr}"`, err);
  }

  return null;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'validation' | 'dashboard' | 'upload'>('validation');

  // Database state
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Search Bar state
  const [searchQuery, setSearchQuery] = useState('');

  // Batch Auto-Geocoding State & Modal
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Filters
  const [filterEstado, setFilterEstado] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('PENDENTE');

  // Selected church index in the current filtered list
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Form states for the current church under validation
  const [latInput, setLatInput] = useState<string>('');
  const [lngInput, setLngInput] = useState<string>('');
  const [operator, setOperator] = useState<string>('');

  // Fallback Geocoding Cascade states
  const [precision, setPrecision] = useState<'EXACT' | 'APPROX' | 'APPROX_MUNICIPIO' | 'NOT_FOUND'>('NOT_FOUND');
  const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);

  // Dirigente Link Extractor state
  const [dirigenteLink, setDirigenteLink] = useState<string>('');
  const [dirigenteLoading, setDirigenteLoading] = useState<boolean>(false);

  // Load operator name from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOperator = localStorage.getItem('validador_operador');
      if (savedOperator) {
        setOperator(savedOperator);
      }
    }
  }, []);

  // Save operator name to localStorage when changed
  const handleOperatorChange = (val: string) => {
    setOperator(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('validador_operador', val);
    }
  };

  // Extract coordinates from a Google Maps link (or WhatsApp message) sent by the church leader
  const handleProcessDirigenteLink = async () => {
    const input = dirigenteLink.trim();
    if (!input) {
      toast.warning('Cole o link ou mensagem do dirigente antes de processar.');
      return;
    }

    setDirigenteLoading(true);
    try {
      const res = await fetch('/api/igrejas/expand-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input }),
      });
      const data = await res.json();

      if (data.success && typeof data.lat === 'number' && typeof data.lng === 'number') {
        setLatInput(String(data.lat));
        setLngInput(String(data.lng));
        setPrecision('EXACT');
        setDirigenteLink('');
        toast.success('Coordenadas extraídas do link do dirigente com sucesso! Confirme no mapa.');
      } else {
        toast.error(data.error || 'Não foi possível extrair as coordenadas do link informado.');
      }
    } catch (err) {
      console.error('Dirigente link error:', err);
      toast.error('Erro ao processar o link. Verifique sua conexão e tente novamente.');
    } finally {
      setDirigenteLoading(false);
    }
  };

  // Fetch data from API based on current filters
  const fetchIgrejas = useCallback(async (preserveIndex = false, forceSelectCode?: string) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterEstado && filterEstado !== 'ALL') {
        query.set('estado', filterEstado);
      }
      if (filterStatus && filterStatus !== 'ALL') {
        query.set('status', filterStatus);
      }

      const res = await fetch(`/api/igrejas?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        setIgrejas(data.igrejas || []);
        setStates(data.states || []);

        const list = data.igrejas || [];
        if (list.length > 0) {
          if (forceSelectCode) {
            const idx = list.findIndex((ig: Igreja) => ig.codigo_totvs === forceSelectCode);
            setCurrentIndex(idx !== -1 ? idx : 0);
          } else if (preserveIndex) {
            setCurrentIndex((prev) => {
              if (prev >= list.length) return list.length - 1;
              if (prev < 0) return 0;
              return prev;
            });
          } else {
            const firstPendingIdx = list.findIndex((ig: Igreja) => ig.status === 'PENDENTE');
            setCurrentIndex(firstPendingIdx !== -1 ? firstPendingIdx : 0);
          }
        } else {
          setCurrentIndex(-1);
        }
      }
    } catch (err) {
      console.error('Error fetching churches:', err);
      toast.error('Erro ao conectar com a base de dados de igrejas.');
    } finally {
      setLoading(false);
    }
  }, [filterEstado, filterStatus]);

  // Initial fetch and fetch on filter change
  useEffect(() => {
    fetchIgrejas();
  }, [fetchIgrejas]);

  // Current church being validated
  const currentIgreja = igrejas[currentIndex];

  // Quick search handler
  const handleSearchChurch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = searchQuery.trim().toLowerCase();
    if (!term) return;

    const idx = igrejas.findIndex(
      (ig) =>
        ig.codigo_totvs.toLowerCase() === term ||
        ig.codigo_totvs.toLowerCase().includes(term) ||
        ig.desc_igreja.toLowerCase().includes(term) ||
        ig.endereco.toLowerCase().includes(term) ||
        ig.municipio.toLowerCase().includes(term)
    );

    if (idx !== -1) {
      setCurrentIndex(idx);
      setActiveTab('validation');
      toast.success(`Igreja localizada: ${igrejas[idx].desc_igreja} (Código ${igrejas[idx].codigo_totvs})`);
    } else {
      toast.error(`Igreja com código TOTVS ou termo "${searchQuery}" não foi localizada nos filtros atuais.`);
    }
  };

  // Geocoding helper for single church object with POI variations & UF Lock
  const geocodeChurch = async (igreja: Igreja) => {
    const { endereco, bairro, municipio, estado, cep } = igreja;
    const targetUF = normalizeUF(estado);

    // 1. Existing valid non-zero coordinates with UF validation
    if (
      igreja.latitude !== null &&
      igreja.longitude !== null &&
      igreja.latitude !== 0 &&
      igreja.longitude !== 0
    ) {
      if (isResultInState(igreja.latitude, igreja.longitude, targetUF)) {
        return { lat: igreja.latitude, lng: igreja.longitude, precision: 'EXACT' as const };
      }
    }

    // 2. Google Maps link extraction with UF validation
    if (igreja.link_google_maps) {
      const link = igreja.link_google_maps;
      let match = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (!match) match = link.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (!match) match = link.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);

      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          if (isResultInState(lat, lng, targetUF)) {
            return { lat, lng, precision: 'EXACT' as const };
          }
        }
      }
    }

    // 3. ViaCEP enrichment if CEP is present and matches target UF
    const viaCepData = cep ? await fetchViaCEP(cep) : null;
    let streetFromViaCep = '';
    let bairroFromViaCep = bairro || '';
    let municipioFromViaCep = municipio || '';
    let estadoFromViaCep = estado || '';

    if (viaCepData && isResultInState(0, 0, targetUF, viaCepData.uf)) {
      streetFromViaCep = viaCepData.logradouro || '';
      bairroFromViaCep = viaCepData.bairro || bairro || '';
      municipioFromViaCep = viaCepData.localidade || municipio || '';
      estadoFromViaCep = viaCepData.uf || estado || '';
    }

    const enderecoBase = streetFromViaCep || endereco || '';
    const enderecoLimpo = limparEndereco(enderecoBase);
    const currentBairro = bairroFromViaCep || bairro || '';
    const currentMunicipio = municipioFromViaCep || municipio || '';
    const currentEstado = estadoFromViaCep || estado || '';

    const queries: { q: string; approxType: 'EXACT' | 'APPROX' | 'APPROX_MUNICIPIO' }[] = [];

    // Variação 1: "Igreja Pentecostal Deus é Amor, [Endereco Limpo], [Bairro], [Municipio] - [Estado], Brasil"
    if (enderecoLimpo) {
      queries.push({
        q: `Igreja Pentecostal Deus é Amor, ${enderecoLimpo}${currentBairro ? `, ${currentBairro}` : ''}, ${currentMunicipio} - ${currentEstado}, Brasil`,
        approxType: 'EXACT',
      });
    }

    // Variação 2: "IPDA, [Endereco Limpo], [Municipio] - [Estado], Brasil"
    if (enderecoLimpo) {
      queries.push({
        q: `IPDA, ${enderecoLimpo}, ${currentMunicipio} - ${currentEstado}, Brasil`,
        approxType: 'EXACT',
      });
    }

    // Variação 3 (Fallback sem POI): "[Endereco Limpo], [Bairro], [Municipio] - [Estado], Brasil"
    if (enderecoLimpo) {
      queries.push({
        q: `${enderecoLimpo}${currentBairro ? `, ${currentBairro}` : ''}, ${currentMunicipio} - ${currentEstado}, Brasil`,
        approxType: 'APPROX',
      });
    }

    // Variação 4 (Fallback Bairro/Cidade): "[Bairro], [Municipio] - [Estado], Brasil"
    if (currentBairro && currentMunicipio) {
      queries.push({
        q: `${currentBairro}, ${currentMunicipio} - ${currentEstado}, Brasil`,
        approxType: 'APPROX',
      });
    }

    // Variação 5 (Fallback Município): "[Municipio] - [Estado], Brasil"
    if (currentMunicipio) {
      queries.push({
        q: `${currentMunicipio} - ${currentEstado}, Brasil`,
        approxType: 'APPROX_MUNICIPIO',
      });
    }

    for (const item of queries) {
      if (!item.q || item.q.trim() === 'Brasil' || item.q.trim() === ', Brasil') continue;

      const coords = await fetchGeocodeUnstructured(item.q, targetUF);
      if (coords) {
        return { lat: coords.lat, lng: coords.lon, precision: item.approxType };
      }

      await new Promise((r) => setTimeout(r, 250));
    }

    // Default Fallback: Center of Brazil (-14.235, -51.925)
    return { lat: -14.235, lng: -51.925, precision: 'NOT_FOUND' as const };
  };

  // Automated batch geocoding runner
  const executeBatchAutoGeocode = async () => {
    setShowBatchModal(false);
    const pendingWithoutCoords = igrejas.filter(
      (ig) =>
        ig.latitude === null ||
        ig.longitude === null ||
        ig.latitude === 0 ||
        ig.longitude === 0
    );

    if (pendingWithoutCoords.length === 0) {
      toast.info('Todas as igrejas filtradas já possuem coordenadas válidas!');
      return;
    }

    setBatchLoading(true);
    setBatchProgress({ current: 0, total: pendingWithoutCoords.length });
    toast.info(`Iniciando auto-localização para ${pendingWithoutCoords.length} igrejas...`);

    let processedCount = 0;

    for (const igreja of pendingWithoutCoords) {
      processedCount++;
      setBatchProgress({ current: processedCount, total: pendingWithoutCoords.length });

      const result = await geocodeChurch(igreja);
      if (result.precision !== 'NOT_FOUND') {
        const link = `https://www.google.com/maps?q=${result.lat},${result.lng}`;
        try {
          await fetch('/api/igrejas/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codigo_totvs: igreja.codigo_totvs,
              latitude: result.lat,
              longitude: result.lng,
              link_google_maps: link,
            }),
          });
        } catch (err) {
          console.error(`Erro ao salvar igreja ${igreja.codigo_totvs}:`, err);
        }
      }
    }

    setBatchLoading(false);
    setBatchProgress(null);
    await fetchIgrejas(true);
    toast.success(`Processo concluído! ${pendingWithoutCoords.length} igrejas foram localizadas e salvas.`);
  };

  // Fallback Cascade Geocoding Effect for the active church
  useEffect(() => {
    let active = true;

    async function runGeocodingCascade() {
      if (!currentIgreja) {
        setLatInput('');
        setLngInput('');
        setPrecision('NOT_FOUND');
        return;
      }

      setGeocodingLoading(true);
      const res = await geocodeChurch(currentIgreja);

      if (active) {
        setLatInput(String(res.lat));
        setLngInput(String(res.lng));
        setPrecision(res.precision);
        setGeocodingLoading(false);
      }
    }

    runGeocodingCascade();

    return () => {
      active = false;
    };
  }, [currentIgreja, currentIndex]);

  // Handle coordinates changes from Leaflet Draggable Pin
  const handleMapCoordsChange = useCallback((lat: number, lng: number) => {
    setLatInput(String(lat));
    setLngInput(String(lng));
    setPrecision('EXACT');
  }, []);

  const parsedLat = parseFloat(latInput);
  const parsedLng = parseFloat(lngInput);
  const finalLat = isNaN(parsedLat) ? -14.235 : parsedLat;
  const finalLng = isNaN(parsedLng) ? -51.925 : parsedLng;

  // Real-time generated Google Maps link
  const generatedGoogleMapsLink = `https://www.google.com/maps?q=${finalLat},${finalLng}`;

  // Save current validation status with Sonner Toast feedback
  const handleSaveAndNext = async (statusOverride: 'VALIDADO' | 'DUVIDA') => {
    if (!currentIgreja) return;

    if (!operator.trim()) {
      toast.error('Por favor, informe seu nome de operador/validador para assinar a validação.');
      return;
    }

    try {
      const response = await fetch('/api/igrejas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_totvs: currentIgreja.codigo_totvs,
          latitude: finalLat,
          longitude: finalLng,
          status: statusOverride,
          usuario_validador: operator.trim(),
          link_google_maps: generatedGoogleMapsLink,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (statusOverride === 'VALIDADO') {
          toast.success(`Igreja ${currentIgreja.codigo_totvs} validada com sucesso!`);
        } else {
          toast.warning(`Igreja ${currentIgreja.codigo_totvs} marcada com Dúvida para revisão.`);
        }

        let nextCode: string | undefined = undefined;
        const nextPendingIdx = igrejas.findIndex(
          (ig, idx) => idx > currentIndex && ig.status === 'PENDENTE'
        );

        if (nextPendingIdx !== -1) {
          nextCode = igrejas[nextPendingIdx].codigo_totvs;
        } else {
          const nextIdx = currentIndex + 1;
          if (nextIdx < igrejas.length) {
            nextCode = igrejas[nextIdx].codigo_totvs;
          }
        }

        await fetchIgrejas(true, nextCode);
      } else {
        toast.error('Falha ao salvar os dados: ' + (result.error || 'Erro desconhecido.'));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Falha ao salvar os dados. Tente novamente: ' + errMsg);
    }
  };

  // Handlers for Dashboard View interactions
  const handleSelectStateFromDashboard = (uf: string) => {
    setFilterEstado(uf);
    setActiveTab('validation');
    toast.info(`Filtro aplicado para o Estado: ${uf}`);
  };

  const handleSelectStatusFromDashboard = (status: string) => {
    setFilterStatus(status);
    setActiveTab('validation');
    toast.info(`Filtro aplicado para Status: ${status}`);
  };

  const hasNoInitialCoordinates =
    currentIgreja &&
    (currentIgreja.latitude === null ||
      currentIgreja.longitude === null ||
      currentIgreja.latitude === 0 ||
      currentIgreja.longitude === 0);

  const pendingWithoutCoordsCount = igrejas.filter(
    (ig) =>
      ig.latitude === null ||
      ig.longitude === null ||
      ig.latitude === 0 ||
      ig.longitude === 0
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900">
      {/* Toast Notification Container */}
      <Toaster position="top-right" richColors closeButton />

      {/* Confirmation Modal for Batch Geocode */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <Sparkles className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Auto-Geocodificação Automática</h3>
                <p className="text-xs text-zinc-500 font-medium">Processamento inteligente de coordenadas</p>
              </div>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed">
              Foram encontradas <strong className="text-indigo-600 font-bold">{pendingWithoutCoordsCount} igrejas</strong> sem coordenadas no filtro atual.
              Deseja disparar a busca em cascata com trava geográfica por estado (UF)?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeBatchAutoGeocode}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <Zap className="h-3.5 w-3.5 fill-white" />
                <span>Iniciar Processamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner Navigation */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-[1001] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between h-auto sm:h-16 py-3 sm:py-0 items-center gap-3 sm:gap-0">
            {/* Logo & Branding */}
            <div className="flex items-center space-x-3 shrink-0">
              <img
                src="/img/logo.png"
                alt="Localização IPDA"
                className="h-10 w-auto object-contain rounded-md shadow-sm"
              />
              <div>
                <h1 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-1.5">
                  GEO-VALIG IPDA <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-bold">12K</span>
                </h1>
                <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Validação e Geolocalização</p>
              </div>
            </div>

            {/* QUICK SEARCH BAR */}
            <form onSubmit={handleSearchChurch} className="relative flex items-center w-full sm:w-72 lg:w-96">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por Código TOTVS, Nome ou Rua..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-100 border border-zinc-200 rounded-xl pl-8 pr-8 py-1.5 text-xs text-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium transition-all"
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
            </form>

            {/* Tab switchers (3 Tabs) */}
            <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 shrink-0">
              <button
                onClick={() => setActiveTab('validation')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center space-x-1.5 ${
                  activeTab === 'validation'
                    ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Validação</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center space-x-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center space-x-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Importar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {activeTab === 'dashboard' ? (
          <DashboardView
            igrejas={igrejas}
            states={states}
            onSelectStateAndSwitch={handleSelectStateFromDashboard}
            onSelectStatusAndSwitch={handleSelectStatusFromDashboard}
            onBatchAutoGeocode={() => setShowBatchModal(true)}
            batchLoading={batchLoading}
            batchProgress={batchProgress}
          />
        ) : activeTab === 'upload' ? (
          <div className="max-w-2xl mx-auto w-full space-y-6 py-6">
            <SpreadsheetUpload onUploadSuccess={() => fetchIgrejas(false)} />

            {/* Guide box */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-indigo-600" />
                Instruções de Mapeamento
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                O importador automatiza o mapeamento dos campos da sua planilha. Garanta que ela contenha cabeçalhos similares aos seguintes nomes:
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4 text-[11px]">
                <div className="p-2 bg-zinc-50 rounded border border-zinc-150">
                  <span className="font-semibold text-zinc-700">Codigo</span> ➔ <span className="font-mono text-indigo-700 font-semibold">codigo_totvs</span>
                </div>
                <div className="p-2 bg-zinc-50 rounded border border-zinc-150">
                  <span className="font-semibold text-zinc-700">Desc Igreja</span> ➔ <span className="font-mono text-indigo-700 font-semibold">desc_igreja</span>
                </div>
                <div className="p-2 bg-zinc-50 rounded border border-zinc-150">
                  <span className="font-semibold text-zinc-700">Tipo Imovel</span> ➔ <span className="font-mono text-indigo-700 font-semibold">tipo_imovel</span>
                </div>
                <div className="p-2 bg-zinc-50 rounded border border-zinc-150">
                  <span className="font-semibold text-zinc-700">Endereco</span> ➔ <span className="font-mono text-indigo-700 font-semibold">endereco</span>
                </div>
                <div className="p-2 bg-zinc-50 rounded border border-zinc-150">
                  <span className="font-semibold text-zinc-700">Lat e Long</span> ➔ <span className="font-mono text-indigo-700 font-semibold">latitude, longitude</span>
                </div>
                <div className="p-2 bg-zinc-50 rounded border border-zinc-150">
                  <span className="font-semibold text-zinc-700">Endereco www</span> ➔ <span className="font-mono text-indigo-700 font-semibold">link_google_maps</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VALIDATION WORKSPACE (Split Screen) */
          <div className="flex-1 flex flex-col gap-5">
            {/* Filter Bar */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-zinc-800 shrink-0">
                <Filter className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-semibold">Filtros de Pesquisa:</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* State selector */}
                <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Estado:</label>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs rounded-lg p-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-40"
                  >
                    <option value="ALL">Todos os Estados</option>
                    {states.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status selector */}
                <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status:</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs rounded-lg p-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-40"
                  >
                    <option value="ALL">Todos os Status</option>
                    <option value="PENDENTE">Pendentes</option>
                    <option value="VALIDADO">Validados</option>
                    <option value="DUVIDA">Dúvidas</option>
                  </select>
                </div>
              </div>

              {/* Action & Stats counter */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  disabled={batchLoading || loading || igrejas.length === 0}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Localizar automaticamente igrejas sem coordenadas via APIs gratuitas com trava por estado (UF)"
                >
                  {batchLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{batchProgress?.current}/{batchProgress?.total}...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
                      <span>Auto-Localizar Pendentes</span>
                    </>
                  )}
                </button>

                <div className="text-xs font-semibold text-zinc-500 px-3 py-1.5 bg-zinc-100 rounded-lg shrink-0">
                  {igrejas.length} {igrejas.length === 1 ? 'igreja' : 'igrejas'}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-2xl shadow-sm">
                <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <h3 className="text-base font-semibold text-zinc-800">Buscando igrejas...</h3>
                <p className="text-xs text-zinc-500 mt-1">Isso pode levar alguns segundos dependendo do banco de dados.</p>
              </div>
            ) : igrejas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-2xl shadow-sm text-center px-4">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-bold text-zinc-800">Nenhuma igreja encontrada</h3>
                <p className="text-sm text-zinc-500 max-w-md mt-1">
                  Não há igrejas correspondentes aos filtros selecionados. Envie uma nova planilha de igrejas na aba &quot;Importar Planilhas&quot; ou altere os filtros acima.
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-all"
                >
                  Ir para Importador
                </button>
              </div>
            ) : (
              /* SPLIT SCREEN WORKSPACE */
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[600px] items-stretch">
                {/* LEFT COLUMN: Data Validation Details (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm justify-between">
                  <div>
                    {/* Header: Navigation & Status Badge */}
                    <div className="flex justify-between items-center mb-5 pb-4 border-b border-zinc-100">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : igrejas.length - 1))}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-600 hover:text-zinc-900 transition-colors"
                          title="Anterior"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-xs font-bold text-zinc-700 font-mono">
                          {currentIndex + 1} / {igrejas.length}
                        </span>
                        <button
                          onClick={() => setCurrentIndex((prev) => (prev < igrejas.length - 1 ? prev + 1 : 0))}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-600 hover:text-zinc-900 transition-colors"
                          title="Próxima"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Status pill badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          currentIgreja.status === 'VALIDADO'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : currentIgreja.status === 'DUVIDA'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {currentIgreja.status === 'PENDENTE' ? 'Pendente' : currentIgreja.status === 'VALIDADO' ? 'Validado' : 'Dúvida'}
                      </span>
                    </div>

                    {/* Church Primary Info */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Código TOTVS</p>
                        <p className="text-sm font-semibold text-zinc-900 font-mono mt-0.5">{currentIgreja.codigo_totvs}</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição da Igreja</p>
                            <p className="text-base font-bold text-zinc-900 mt-0.5">{currentIgreja.desc_igreja}</p>
                          </div>
                        </div>

                        {/* Fallback Precision Badge */}
                        <div className="mt-2.5">
                          {geocodingLoading ? (
                            <span className="inline-flex items-center text-[10px] bg-zinc-100 text-zinc-500 font-bold px-2.5 py-1 rounded-lg border border-zinc-200 animate-pulse">
                              ⏳ Buscando geolocalização com trava UF...
                            </span>
                          ) : (
                            <>
                              {precision === 'EXACT' && (
                                <span className="inline-flex items-center text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-lg border border-emerald-200 leading-normal">
                                  🟢 Localização exata por POI/link ({currentIgreja.estado})
                                </span>
                              )}
                              {precision === 'APPROX' && (
                                <span className="inline-flex items-center text-xs bg-amber-50 text-amber-800 font-bold px-3 py-1.5 rounded-lg border border-amber-250 leading-normal">
                                  🟡 Localização por rua ({currentIgreja.estado}). Ajuste o pin sobre a igreja.
                                </span>
                              )}
                              {precision === 'APPROX_MUNICIPIO' && (
                                <span className="inline-flex items-center text-xs bg-orange-50 text-orange-850 font-bold px-3 py-1.5 rounded-lg border border-orange-200 leading-normal">
                                  🟠 Localizado no município de {currentIgreja.municipio} ({currentIgreja.estado}). Posicione o pin.
                                </span>
                              )}
                              {precision === 'NOT_FOUND' && (
                                <span className="inline-flex items-center text-xs bg-rose-50 text-rose-800 font-bold px-3 py-1.5 rounded-lg border border-rose-200 leading-normal">
                                  🔴 Não localizado na UF {currentIgreja.estado}. Arraste o pin no mapa
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {currentIgreja.tipo_imovel && (
                          <span className="inline-block text-[10px] bg-zinc-100 text-zinc-700 font-medium px-2 py-0.5 rounded border border-zinc-200 mt-2.5">
                            {currentIgreja.tipo_imovel}
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Endereço Completo</p>
                        <p className="text-xs text-zinc-700 leading-relaxed mt-1">
                          {currentIgreja.endereco || 'Endereço não cadastrado'}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-zinc-500 font-medium">
                          {currentIgreja.bairro && (
                            <div>
                              <span className="text-[10px] block font-bold text-zinc-400">Bairro</span>
                              {currentIgreja.bairro}
                            </div>
                          )}
                          {currentIgreja.municipio && (
                            <div>
                              <span className="text-[10px] block font-bold text-zinc-400">Município / Estado</span>
                              {currentIgreja.municipio} - {currentIgreja.estado}
                            </div>
                          )}
                          {currentIgreja.cep && (
                            <div>
                              <span className="text-[10px] block font-bold text-zinc-400">CEP</span>
                              {currentIgreja.cep}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ─── Dirigente Link Extractor ─── */}
                    <div className="mt-5 pt-4 border-t border-zinc-100">
                      <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <Link className="h-3.5 w-3.5 text-violet-600" />
                        Link/Mensagem do Dirigente
                      </h4>

                      <p className="text-[10px] text-zinc-500 leading-relaxed mb-2.5">
                        Cole abaixo o link do Google Maps (curto ou longo) enviado pelo dirigente via WhatsApp. O sistema
                        extrai as coordenadas automaticamente.
                      </p>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Clipboard className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                          <input
                            id="dirigente-link-input"
                            type="text"
                            value={dirigenteLink}
                            onChange={(e) => setDirigenteLink(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleProcessDirigenteLink()}
                            placeholder="Cole o link ou mensagem aqui..."
                            className="pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none text-xs rounded-lg w-full font-medium placeholder:text-zinc-400"
                          />
                        </div>
                        <button
                          id="btn-process-dirigente-link"
                          type="button"
                          onClick={handleProcessDirigenteLink}
                          disabled={dirigenteLoading || !dirigenteLink.trim()}
                          className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
                          title="Processar link e extrair coordenadas"
                        >
                          {dirigenteLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Link className="h-3.5 w-3.5" />
                          )}
                          {dirigenteLoading ? 'Processando...' : 'Processar'}
                        </button>
                      </div>

                      {/* Dirigente badge – shown when precision is EXACT and triggered by link */}
                      {precision === 'EXACT' && latInput && !dirigenteLoading && (
                        <div className="mt-2">
                          <span className="inline-flex items-center text-[10px] bg-violet-50 text-violet-800 font-bold px-2.5 py-1 rounded-lg border border-violet-200">
                            🟣 Enviado pelo Dirigente (Validado via Link)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Real-time coordinates form */}
                    <div className="mt-6 pt-5 border-t border-zinc-100 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                        Coordenadas Geográficas (Grau Decimal)
                      </h4>

                      {hasNoInitialCoordinates && (
                        <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs flex items-start gap-2 border border-amber-200">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-semibold">Coordenadas iniciais não encontradas</p>
                            <p className="text-[10px] opacity-90 mt-0.5">
                              Exibindo marcador aproximado na UF {currentIgreja.estado}. Arraste o pin no mapa para fixar a localização correta.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 block">LATITUDE</label>
                          <input
                            type="number"
                            step="any"
                            value={latInput}
                            onChange={(e) => {
                              setLatInput(e.target.value);
                              setPrecision('EXACT');
                            }}
                            className="bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs rounded-lg p-2.5 w-full font-mono mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 block">LONGITUDE</label>
                          <input
                            type="number"
                            step="any"
                            value={lngInput}
                            onChange={(e) => {
                              setLngInput(e.target.value);
                              setPrecision('EXACT');
                            }}
                            className="bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs rounded-lg p-2.5 w-full font-mono mt-1"
                          />
                        </div>
                      </div>

                      {/* Display generated dynamic link */}
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 block">Link Google Maps Gerado:</span>
                        <a
                          href={generatedGoogleMapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline mt-1 transition-colors"
                        >
                          <span>{generatedGoogleMapsLink}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Validation Form Actions */}
                  <div className="mt-6 pt-5 border-t border-zinc-100 space-y-4">
                    {/* Operator signature */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 uppercase tracking-wider">
                        <User className="h-3 w-3 text-zinc-500" />
                        Nome do Operador (Validador)
                      </label>
                      <input
                        type="text"
                        placeholder="Insira seu nome para assinar"
                        value={operator}
                        onChange={(e) => handleOperatorChange(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs rounded-lg p-2.5 w-full mt-1.5 font-medium"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveAndNext('DUVIDA')}
                        className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98]"
                      >
                        <HelpCircle className="h-4 w-4 text-zinc-600" />
                        <span>Marcar como Dúvida</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveAndNext('VALIDADO')}
                        className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition-all active:scale-[0.98]"
                      >
                        <Check className="h-4 w-4" />
                        <span>Salvar e Próxima</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Leaflet Interactive Map (7 cols) */}
                <div className="lg:col-span-7 flex flex-col bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm min-h-[450px] lg:min-h-0">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      Visualização de Satélite e Posicionador do Pin
                    </h3>
                    <div className="text-[10px] text-zinc-500 font-medium italic">
                      💡 Dica: Arraste o pin vermelho para ajustar as coordenadas
                    </div>
                  </div>

                  <div className="flex-1">
                    <MapWrapper
                      latitude={finalLat}
                      longitude={finalLng}
                      onChangeCoords={handleMapCoordsChange}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
