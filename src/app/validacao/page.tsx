'use client';

export const dynamic = 'force-dynamic';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import SpreadsheetUpload from '@/components/SpreadsheetUpload';
import MapWrapper from '@/components/MapWrapper';
import DashboardView from '@/components/DashboardView';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Igreja } from '@/lib/db';
import { normalizeUF, isResultInState } from '@/lib/geocoding';
import {
  Filter,
  Check,
  AlertTriangle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  GitBranch,
  Power,
  Sun,
  Moon,
  RefreshCw,
} from 'lucide-react';

function getPorte(desc: string, porteField?: string | null): string {
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

export default function ValidacaoPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'validation' | 'dashboard' | 'upload'>('validation');
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);

  const handleForceReloadDatabase = async () => {
    setSyncLoading(true);
    try {
      fetch('/api/revalidate', { method: 'POST' }).catch(() => {});

      const res = await fetch(`/api/igrejas/validadas?refresh=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) throw new Error('Erro ao buscar validadas');

      const data = await res.json();
      const churchList = Array.isArray(data)
        ? data
        : (data.igrejas || data.data || []);

      if (Array.isArray(churchList)) {
        setIgrejas(churchList);
        setFilterStatus('ALL');
        setFilterEstado('ALL');
        setFilterRegiao('ALL');
        toast.success(`Banco atualizado com sucesso! Total de ${churchList.length} igrejas validadas carregadas.`);
      }
    } catch (error) {
      console.error('Erro ao recarregar banco completo:', error);
      toast.error('Erro ao conectar ao banco de dados.');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncPublicMap = handleForceReloadDatabase;

  // Load tab and status from query params if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'dashboard' || tab === 'upload' || tab === 'validation') {
        setActiveTab(tab as any);
      }

      const statusParam = params.get('status');
      if (statusParam) {
        let mappedStatus = statusParam;
        if (statusParam === 'REVISAO_ENDERECO') {
          mappedStatus = 'PENDENTE_REVISAO';
        }
        setFilterStatus(mappedStatus);
        setActiveTab('validation');
      }
    }
  }, []);

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
  const [filterRegiao, setFilterRegiao] = useState<string>('ALL');
  const [filterEstado, setFilterEstado] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('PENDENTE');
  const [filterPorte, setFilterPorte] = useState<string>('ALL');

  // Selected church index in the current filtered list
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Form states for the current church under validation
  const [latInput, setLatInput] = useState<string>('');
  const [lngInput, setLngInput] = useState<string>('');
  const [operator, setOperator] = useState<string>('');

  // Fallback Geocoding Cascade states
  const [precision, setPrecision] = useState<'EXACT' | 'APPROX' | 'APPROX_MUNICIPIO' | 'NOT_FOUND'>('NOT_FOUND');

  // Revision Rejection states
  const [showRejectRevisionConfirm, setShowRejectRevisionConfirm] = useState<boolean>(false);
  const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);

  // Dirigente Link Extractor state
  const [dirigenteLink, setDirigenteLink] = useState<string>('');
  const [dirigenteLoading, setDirigenteLoading] = useState<boolean>(false);

  const REGIAO_GEOGRAFICA_MAPPING: Record<string, string[]> = {
    'Sudeste - SP': ['SP'],
    'Sudeste - MG': ['MG'],
    'Sudeste - ES e RJ': ['ES', 'RJ'],
    'Sul': ['PR', 'RS', 'SC'],
    'Norte': ['AC', 'AM', 'RO', 'PA', 'AP', 'RR', 'TO'],
    'Nordeste': ['AL', 'BA', 'CE', 'RN', 'PE', 'PI', 'MA', 'PB', 'SE'],
    'Centro-Oeste': ['MT', 'DF', 'GO', 'MS'],
  };

  const handleRegiaoChange = (val: string) => {
    setFilterRegiao(val);
    if (val !== 'ALL') {
      const allowedUFs = REGIAO_GEOGRAFICA_MAPPING[val] || [];
      if (filterEstado !== 'ALL' && !allowedUFs.includes(filterEstado)) {
        setFilterEstado('ALL');
      }
    }
  };

  // Reset isRevalidating when selected church changes
  useEffect(() => {
    setIsRevalidating(false);
  }, [currentIndex]);

  const handleRejectRevision = async () => {
    if (!currentIgreja) return;
    try {
      const response = await fetch('/api/igrejas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_totvs: currentIgreja.codigo_totvs,
          status: 'VALIDADO',
          usuario_validador: operator.trim() || 'Validador',
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao rejeitar alteração no servidor');
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`Alteração para a igreja ${currentIgreja.codigo_totvs} rejeitada com sucesso. O endereço e as coordenadas validadas foram mantidos.`);

        // Remove from local list and keep state synchronized in memory
        setIgrejas((prev) => prev.filter((ig) => ig.codigo_totvs !== currentIgreja.codigo_totvs));
        setCurrentIndex((prev) => {
          const newLength = filteredIgrejasList.length - 1;
          if (newLength <= 0) return -1;
          return Math.min(prev, newLength - 1);
        });
      } else {
        toast.error('Falha ao rejeitar alteração: ' + (result.error || 'Erro desconhecido.'));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao rejeitar alteração: ' + errMsg);
    }
  };

  // Reset currentIndex whenever search query or filters change
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery, filterRegiao, filterEstado, filterStatus, filterPorte]);

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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Sessão encerrada.');
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      toast.error('Erro ao deslogar.');
    }
  };

  // Extract coordinates from a Google Maps link (or WhatsApp message) sent by the church leader
  const handleProcessDirigenteLink = async () => {
    if (dirigenteLoading) return;
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

      // Accept both { lat, lng } (our API) and { latitude, longitude } (legacy)
      const lat = data.lat ?? data.latitude;
      const lng = data.lng ?? data.longitude;

      if (data.success && typeof lat === 'number' && typeof lng === 'number') {
        setLatInput(String(lat));
        setLngInput(String(lng));
        setPrecision('EXACT');
        setDirigenteLink('');
        if (data.expanded_url) {
          console.info('[Dirigente Link] Expanded URL:', data.expanded_url);
        }
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
      // For api query, if a Region is selected, we fetch all, then filter client-side. Or if filterEstado is selected, use that.
      if (filterEstado && filterEstado !== 'ALL') {
        query.set('estado', filterEstado);
      } else if (filterRegiao && filterRegiao !== 'ALL') {
        // Fetch all, then client-side filter
      }
      if (filterStatus && filterStatus !== 'ALL') {
        query.set('status', filterStatus);
      }
      query.set('t', Date.now().toString());

      const res = await fetch(`/api/igrejas?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        let list: Igreja[] = data.igrejas || [];

        // Client-side Region filtering on fetched list
        if (filterRegiao && filterRegiao !== 'ALL') {
          const allowedUFs = REGIAO_GEOGRAFICA_MAPPING[filterRegiao] || [];
          list = list.filter((ig) => allowedUFs.includes(ig.estado));
        }

        setIgrejas(list);

        // Filter states list by allowed region states if a region is active
        let availableStates = data.states || [];
        if (filterRegiao && filterRegiao !== 'ALL') {
          const allowedUFs = REGIAO_GEOGRAFICA_MAPPING[filterRegiao] || [];
          availableStates = availableStates.filter((st: string) => allowedUFs.includes(st));
        }
        setStates(availableStates);

        if (list.length > 0) {
          // Compute the filtered list of churches using current filters (Região, Estado, Porte)
          const newFiltered = list.filter((ig) => {
            if (filterRegiao && filterRegiao !== 'ALL') {
              const allowedUFs = REGIAO_GEOGRAFICA_MAPPING[filterRegiao] || [];
              if (!allowedUFs.includes(ig.estado)) return false;
            }
            if (filterEstado && filterEstado !== 'ALL' && ig.estado !== filterEstado) {
              return false;
            }
            const porte = ig.porte || getPorte(ig.desc_igreja, ig.porte);
            if (filterPorte !== 'ALL' && porte !== filterPorte) {
              return false;
            }
            return true;
          });

          if (newFiltered.length > 0) {
            if (forceSelectCode) {
              const idx = newFiltered.findIndex((ig: Igreja) => ig.codigo_totvs === forceSelectCode);
              setCurrentIndex(idx !== -1 ? idx : 0);
            } else if (preserveIndex) {
              setCurrentIndex((prev) => {
                const safeIndex = Math.min(prev, newFiltered.length - 1);
                return Math.max(0, safeIndex);
              });
            } else {
              const firstPendingIdx = newFiltered.findIndex((ig: Igreja) => ig.status === 'PENDENTE');
              setCurrentIndex(firstPendingIdx !== -1 ? firstPendingIdx : 0);
            }
          } else {
            setCurrentIndex(-1);
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
  }, [filterRegiao, filterEstado, filterStatus, filterPorte]);

  // Initial fetch and fetch on filter change
  useEffect(() => {
    fetchIgrejas();
  }, [fetchIgrejas]);

  // Compute filtered churches list in-realtime
  const filteredIgrejasList = React.useMemo(() => {
    return igrejas.filter((ig) => {
      if (filterRegiao && filterRegiao !== 'ALL') {
        const allowedUFs = REGIAO_GEOGRAFICA_MAPPING[filterRegiao] || [];
        if (!allowedUFs.includes(ig.estado)) return false;
      }
      if (filterEstado && filterEstado !== 'ALL' && ig.estado !== filterEstado) {
        return false;
      }
      const porte = ig.porte || getPorte(ig.desc_igreja, ig.porte);
      if (filterPorte !== 'ALL' && porte !== filterPorte) return false;

      // Real-time search query filtering
      const term = searchQuery.trim().toLowerCase();
      if (term !== '') {
        const matchesSearch =
          String(ig.codigo_totvs || '').toLowerCase().includes(term) ||
          String(ig.desc_igreja || '').toLowerCase().includes(term) ||
          String(ig.municipio || '').toLowerCase().includes(term) ||
          String(ig.bairro || '').toLowerCase().includes(term) ||
          String(ig.endereco || '').toLowerCase().includes(term);

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [igrejas, filterRegiao, filterEstado, filterPorte, searchQuery]);

  // Current church being validated
  const currentIgreja = filteredIgrejasList[currentIndex];
  const isLocked = currentIgreja?.status === 'VALIDADO' && !isRevalidating;

  // Quick search handler
  const handleSearchChurch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = searchQuery.trim().toLowerCase();
    if (!term) return;

    const idx = filteredIgrejasList.findIndex(
      (ig) =>
        String(ig.codigo_totvs || '').toLowerCase() === term ||
        String(ig.codigo_totvs || '').toLowerCase().includes(term) ||
        String(ig.desc_igreja || '').toLowerCase().includes(term) ||
        String(ig.endereco || '').toLowerCase().includes(term) ||
        String(ig.municipio || '').toLowerCase().includes(term)
    );

    if (idx !== -1) {
      setCurrentIndex(idx);
      setActiveTab('validation');
      toast.success(`Igreja localizada: ${filteredIgrejasList[idx].desc_igreja} (Código ${filteredIgrejasList[idx].codigo_totvs})`);
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
    const pendingWithoutCoords = filteredIgrejasList.filter(
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

  const handleReactivateChurch = async () => {
    if (!currentIgreja) return;

    try {
      const response = await fetch('/api/coligacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_totvs: currentIgreja.codigo_totvs,
          status: 'PENDENTE',
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao reativar no servidor');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Igreja ${currentIgreja.codigo_totvs} reativada com sucesso! Status atualizado para PENDENTE.`);

        // Remove from local list and keep state synchronized in memory
        setIgrejas((prev) => prev.filter((ig) => ig.codigo_totvs !== currentIgreja.codigo_totvs));
        setCurrentIndex((prev) => {
          const newLength = filteredIgrejasList.length - 1;
          if (newLength <= 0) return -1;
          return Math.min(prev, newLength - 1);
        });
      } else {
        toast.error('Falha ao reativar: ' + (result.error || 'Erro desconhecido.'));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Falha ao reativar a igreja. Tente novamente: ' + errMsg);
    }
  };

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
          codigo_totvs: currentIgreja?.codigo_totvs,
          latitude: finalLat,
          longitude: finalLng,
          status: statusOverride,
          usuario_validador: operator.trim(),
          link_google_maps: generatedGoogleMapsLink,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar no servidor');
      }

      const result = await response.json();

      if (result.success) {
        if (statusOverride === 'VALIDADO') {
          toast.success(`Igreja ${currentIgreja?.codigo_totvs} validada com sucesso!`);
        } else {
          toast.warning(`Igreja ${currentIgreja?.codigo_totvs} marcada com Dúvida para revisão.`);
        }

        // Remove from local list and keep state synchronized in memory
        setIgrejas((prev) => prev.filter((ig) => ig.codigo_totvs !== currentIgreja.codigo_totvs));
        setCurrentIndex((prev) => {
          const newLength = filteredIgrejasList.length - 1;
          if (newLength <= 0) return -1;
          return Math.min(prev, newLength - 1);
        });
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
    (currentIgreja?.latitude === null ||
      currentIgreja?.longitude === null ||
      currentIgreja?.latitude === 0 ||
      currentIgreja?.longitude === 0);

  const pendingWithoutCoordsCount = filteredIgrejasList.filter(
    (ig) =>
      ig.latitude === null ||
      ig.longitude === null ||
      ig.latitude === 0 ||
      ig.longitude === 0
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 flex flex-col font-sans text-zinc-900 dark:text-slate-100 transition-colors duration-200">
      {/* Toast Notification Container */}
      <Toaster position="top-right" richColors closeButton />

      {/* Reject revision custom confirmation dialog */}
      <ConfirmDialog
        isOpen={showRejectRevisionConfirm}
        title="Rejeitar Alteração em Revisão"
        message={`Deseja realmente rejeitar as alterações em revisão para a igreja "${currentIgreja?.desc_igreja}"? O status de validação será restaurado e as coordenadas originais serão mantidas intactas.`}
        confirmLabel="Confirmar Rejeição"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          setShowRejectRevisionConfirm(false);
          await handleRejectRevision();
        }}
        onCancel={() => setShowRejectRevisionConfirm(false)}
        isDanger={true}
      />

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
      <header className="relative z-[9999] h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 sticky top-0 shadow-xs transition-colors duration-200 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center h-full w-full">
            {/* Logo & Branding */}
            <div className="flex items-center space-x-3 shrink-0">
              <img
                src="/img/logo.png"
                alt="Localização IPDA"
                className="h-10 w-auto object-contain shadow-sm"
              />
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  GEO-VALIG IPDA <span className="text-[10px] bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-slate-700 font-bold">12K</span>
                </h1>
                <p className="text-[9px] text-zinc-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Validação e Geolocalização</p>
              </div>
            </div>

            {/* Grouped Administrative Navigation Dropdowns */}
            <div className="flex bg-zinc-100 dark:bg-slate-800 p-1 rounded-xl border border-zinc-200 dark:border-slate-700 gap-1 items-center font-semibold text-xs">
              <a
                href="/"
                className="px-3 py-1.5 rounded-lg text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50 transition-all"
              >
                🗺️ Mapa Geral
              </a>

              {/* Item 2: Validação & Gestão Dropdown */}
              <div className="relative group">
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                    activeTab === 'validation'
                      ? 'bg-white dark:bg-slate-700 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/50 dark:border-slate-650 font-bold'
                      : 'text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span>📍 Validação & Gestão</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-[9999] p-1 divide-y divide-zinc-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => setActiveTab('validation')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg block"
                  >
                    📍 Validação de Igrejas
                  </button>
                  <a
                    href="/gestao"
                    className="block px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
                  >
                    👥 Gestão de Contatos
                  </a>
                  <a
                    href="/coligacoes"
                    className="block px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
                  >
                    🌳 Coligações
                  </a>
                </div>
              </div>

              {/* Item 3: Inteligência & BI Dropdown */}
              <div className="relative group">
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-white dark:bg-slate-700 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/50 dark:border-slate-650 font-bold'
                      : 'text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span>📊 Inteligência & BI</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-[9999] p-1 divide-y divide-zinc-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg block"
                  >
                    📊 Dashboard de Status
                  </button>
                  <a
                    href="/relatorios"
                    className="block px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
                  >
                    📊 Relatórios Hierárquicos
                  </a>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('upload')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/50 dark:border-slate-650 font-bold'
                    : 'text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span>📥 Importar</span>
              </button>
            </div>

            {/* Right side compact actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncPublicMap}
                disabled={syncLoading}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full transition-all shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px]"
                title="Sincronizar Mapa Público (Forçar revalidação de cache)"
              >
                <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
              </button>

              <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                title="Sair do painel administrativo"
              >
                <Power className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sair</span>
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
            onSyncPublicMap={handleSyncPublicMap}
            syncLoading={syncLoading}
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
            {/* Filter Bar (Refactored Grid layout with no line breaks) */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-colors duration-200">

              {/* QUICK SEARCH BAR (Flexible Grid layout) */}
              <form onSubmit={handleSearchChurch} className="relative flex items-center flex-1 min-w-[220px] shrink-0">
                <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-zinc-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por TOTVS, Nome ou Rua..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-8 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-750 font-medium transition-colors duration-200"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-3 text-zinc-400 hover:text-zinc-650 dark:hover:text-slate-350 p-0.5 flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {/* State selector */}
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg p-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-32 transition-colors duration-200"
              >
                <option value="ALL">Todos Estados</option>
                {states.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Status selector */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg p-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-36 transition-colors duration-200"
              >
                <option value="ALL">Todos Status</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="VALIDADO">Validados</option>
                <option value="DUVIDA">Dúvidas</option>
                <option value="PENDENTE_REVISAO">Revisões</option>
                <option value="DESATIVADO">Inativas</option>
              </select>

              {/* Porte selector */}
              <select
                value={filterPorte}
                onChange={(e) => setFilterPorte(e.target.value)}
                className="h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg p-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-44 transition-colors duration-200"
              >
                <option value="ALL">Todos os Portes</option>
                <option value="ESTADUAL">🔵 ESTADUAL</option>
                <option value="SETORIAL">🟡 SETORIAL</option>
                <option value="CENTRAL">🟠 CENTRAL</option>
                <option value="REGIONAL">🟢 REGIONAL</option>
                <option value="LOCAL">⚪ LOCAL</option>
                <option value="CASA DE ORAÇÃO">🟣 CASA DE ORAÇÃO</option>
                <option value="ALDEIA INDIGENA">🟢 ALDEIA INDÍGENA</option>
              </select>

              {/* Action & Stats counter (Aligned to the Right) */}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  disabled={batchLoading || loading || filteredIgrejasList.length === 0}
                  className="h-10 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Localizar automaticamente igrejas sem coordenadas via APIs gratuitas com trava por estado (UF)"
                >
                  {batchLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                      <span>{batchProgress?.current}/{batchProgress?.total}...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
                      <span>Auto-Localizar Pendentes</span>
                    </>
                  )}
                </button>

                <div className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700">
                  {filteredIgrejasList.length} {filteredIgrejasList.length === 1 ? 'igreja' : 'igrejas'}
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
            ) : !currentIgreja ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-2xl shadow-sm text-center px-4">
                <Sparkles className="h-12 w-12 text-indigo-600 mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-zinc-850">Parabéns! Todas as igrejas deste filtro foram validadas.</h3>
                <p className="text-xs text-zinc-500 max-w-md mt-1">
                  Não restam registros pendentes com os critérios selecionados. Altere os filtros superiores para continuar validando ou acesse as outras seções do painel.
                </p>
                <button
                  onClick={() => {
                    setFilterEstado('ALL');
                    setFilterStatus('ALL');
                    setFilterPorte('ALL');
                  }}
                  className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-all"
                >
                  Ver Todas as Igrejas
                </button>
              </div>
            ) : (
              /* SPLIT SCREEN WORKSPACE */
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[600px] items-stretch">
                {/* LEFT COLUMN: Data Validation Details (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm justify-between transition-colors duration-200">
                  <div>
                    {/* Header: Navigation & Status Badge */}
                    <div className="flex justify-between items-center mb-5 pb-4 border-b border-zinc-100 dark:border-slate-800">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setCurrentIndex((prev) => {
                            const newIndex = prev > 0 ? prev - 1 : filteredIgrejasList.length - 1;
                            return Math.min(newIndex, filteredIgrejasList.length - 1);
                          })}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                          title="Anterior"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-xs font-bold text-zinc-700 dark:text-slate-350 font-mono">
                          {currentIndex + 1} / {filteredIgrejasList.length}
                        </span>
                        <button
                          onClick={() => setCurrentIndex((prev) => {
                            const newIndex = prev < filteredIgrejasList.length - 1 ? prev + 1 : 0;
                            return Math.min(newIndex, filteredIgrejasList.length - 1);
                          })}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                          title="Próxima"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Status pill badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          (currentIgreja?.status as string) === 'VALIDADO'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : (currentIgreja?.status as string) === 'DUVIDA'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : (currentIgreja?.status as string) === 'PENDENTE_REVISAO'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : (currentIgreja?.status as string) === 'DESATIVADO'
                            ? 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {(currentIgreja?.status as string) === 'PENDENTE'
                          ? 'Pendente'
                          : (currentIgreja?.status as string) === 'VALIDADO'
                          ? 'Validado'
                          : (currentIgreja?.status as string) === 'PENDENTE_REVISAO'
                          ? 'Revisão Pendente'
                          : (currentIgreja?.status as string) === 'DESATIVADO'
                          ? 'Inativa'
                          : 'Dúvida'}
                      </span>
                    </div>

                    {/* Church Primary Info */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-wider">Código TOTVS</p>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white font-mono mt-0.5">{currentIgreja?.codigo_totvs}</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-wider">Descrição da Igreja</p>
                            <p className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">{currentIgreja?.desc_igreja}</p>
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
                                  🟢 Localização exata por POI/link ({currentIgreja?.estado})
                                </span>
                              )}
                              {precision === 'APPROX' && (
                                <span className="inline-flex items-center text-xs bg-amber-50 text-amber-800 font-bold px-3 py-1.5 rounded-lg border border-amber-250 leading-normal">
                                  🟡 Localização por rua ({currentIgreja?.estado}). Ajuste o pin sobre a igreja.
                                </span>
                              )}
                              {precision === 'APPROX_MUNICIPIO' && (
                                <span className="inline-flex items-center text-xs bg-orange-50 text-orange-850 font-bold px-3 py-1.5 rounded-lg border border-orange-200 leading-normal">
                                  🟠 Localizado no município de {currentIgreja?.municipio} ({currentIgreja?.estado}). Posicione o pin.
                                </span>
                              )}
                              {precision === 'NOT_FOUND' && (
                                <span className="inline-flex items-center text-xs bg-rose-50 text-rose-800 font-bold px-3 py-1.5 rounded-lg border border-rose-200 leading-normal">
                                  🔴 Não localizado na UF {currentIgreja?.estado}. Arraste o pin no mapa
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {currentIgreja?.tipo_imovel && (
                          <span className="inline-block text-[10px] bg-zinc-100 text-zinc-700 font-medium px-2 py-0.5 rounded border border-zinc-200 mt-2.5">
                            {currentIgreja?.tipo_imovel}
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Endereço Completo</p>
                        <p className="text-xs text-zinc-700 leading-relaxed mt-1">
                          {currentIgreja?.endereco || 'Endereço não cadastrado'}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-zinc-500 font-medium">
                          {currentIgreja?.bairro && (
                            <div>
                              <span className="text-[10px] block font-bold text-zinc-400">Bairro</span>
                              {currentIgreja?.bairro}
                            </div>
                          )}
                          {currentIgreja?.municipio && (
                            <div>
                              <span className="text-[10px] block font-bold text-zinc-400">Município / Estado</span>
                              {currentIgreja?.municipio} - {currentIgreja?.estado}
                            </div>
                          )}
                          {currentIgreja?.cep && (
                            <div>
                              <span className="text-[10px] block font-bold text-zinc-400">CEP</span>
                              {currentIgreja?.cep}
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
                            disabled={dirigenteLoading}
                            onChange={(e) => setDirigenteLink(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !dirigenteLoading && handleProcessDirigenteLink()}
                            placeholder="Cole o link ou mensagem aqui..."
                            className="pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none text-xs rounded-lg w-full font-medium placeholder:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                          Coordenadas Geográficas (Grau Decimal)
                        </h4>
                        {currentIgreja?.status === 'VALIDADO' && !isRevalidating && (
                          <button
                            type="button"
                            onClick={() => setIsRevalidating(true)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                          >
                            <span>🔄 Re-validar Endereço</span>
                          </button>
                        )}
                      </div>

                      {hasNoInitialCoordinates && (
                        <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs flex items-start gap-2 border border-amber-200">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-semibold">Coordenadas iniciais não encontradas</p>
                            <p className="text-[10px] opacity-90 mt-0.5">
                              Exibindo marcador aproximado na UF {currentIgreja?.estado}. Arraste o pin no mapa para fixar a localização correta.
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
                            disabled={isLocked}
                            onChange={(e) => {
                              setLatInput(e.target.value);
                              setPrecision('EXACT');
                            }}
                            className="bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs rounded-lg p-2.5 w-full font-mono mt-1 disabled:opacity-60"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 block">LONGITUDE</label>
                          <input
                            type="number"
                            step="any"
                            value={lngInput}
                            disabled={isLocked}
                            onChange={(e) => {
                              setLngInput(e.target.value);
                              setPrecision('EXACT');
                            }}
                            className="bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs rounded-lg p-2.5 w-full font-mono mt-1 disabled:opacity-60"
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
                        Nome do Operador (Validador Autorizado)
                      </label>
                      <select
                        value={operator}
                        onChange={(e) => handleOperatorChange(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs rounded-lg p-2.5 w-full mt-1.5 font-semibold text-zinc-800 dark:text-slate-100"
                      >
                        <option value="">Selecione o validador para assinar...</option>
                        <option value="Luiz Eduardo">Luiz Eduardo</option>
                        <option value="Caio Rodrigues">Caio Rodrigues</option>
                        <option value="Guilherme de Almeida">Guilherme de Almeida</option>
                        <option value="Christian Azevedo">Christian Azevedo</option>
                        <option value="Mayara Ruanny">Mayara Ruanny</option>
                        <option value="Fernanda Brito">Fernanda Brito</option>
                        <option value="Flaviane Marvilla">Flaviane Marvilla</option>
                      </select>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3">
                      {currentIgreja?.status === 'DESATIVADO' ? (
                        <button
                          type="button"
                          onClick={handleReactivateChurch}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] shadow-md"
                        >
                          <Check className="h-4 w-4" />
                          <span>Reativar Igreja</span>
                        </button>
                      ) : (
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
                      )}

                      {/* Reject revision button when status is in revision */}
                      {(currentIgreja?.status === 'PENDENTE_REVISAO' || currentIgreja?.status === 'REVISAO_ENDERECO') && (
                        <button
                          type="button"
                          onClick={() => setShowRejectRevisionConfirm(true)}
                          className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] shadow-2xs"
                        >
                          <X className="h-4 w-4" />
                          <span>Rejeitar Alteração em Revisão</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Leaflet Interactive Map (7 cols) */}
                <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm min-h-[450px] lg:min-h-0 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
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
                      draggable={!isLocked}
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
