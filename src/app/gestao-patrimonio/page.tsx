'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import {
  Search, Users, Loader2, RefreshCw, Power, ChevronLeft, ChevronRight,
  ChevronDown, Eye, Calendar, Phone, User, Package, Filter, Building2,
  CheckCircle2, Clock, MapPin, X, AlertTriangle, PieChart as PieChartIcon,
  BarChart3, CheckSquare, Sparkles, TrendingUp
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import PatrimonioDetailModal from '@/components/PatrimonioDetailModal';
import * as XLSX from 'xlsx';

const PORTE_INFO: Record<string, { name: string; color: string; label: string }> = {
  ESTADUAL: { name: 'ESTADUAL', color: '#3B82F6', label: 'Estadual' },
  SETORIAL: { name: 'SETORIAL', color: '#EAB308', label: 'Setorial' },
  CENTRAL: { name: 'CENTRAL', color: '#F97316', label: 'Central' },
  REGIONAL: { name: 'REGIONAL', color: '#22C55E', label: 'Regional' },
  LOCAL: { name: 'LOCAL', color: '#6B7280', label: 'Local' },
  'CASA DE ORAÇÃO': { name: 'CASA DE ORAÇÃO', color: '#EC4899', label: 'Casa de Oração' },
  'ALDEIA INDIGENA': { name: 'ALDEIA INDIGENA', color: '#06B6D4', label: 'Aldeia Indígena' },
};

const REGIOES = [
  { value: 'ALL', label: 'Todas as Regiões Geográficas' },
  { value: 'Norte', label: 'Norte' },
  { value: 'Nordeste', label: 'Nordeste' },
  { value: 'Centro-Oeste', label: 'Centro-Oeste' },
  { value: 'Sudeste', label: 'Sudeste' },
  { value: 'Sul', label: 'Sul' },
];

const ESTADOS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

const REGIAO_GEOGRAFICA_MAPPING: Record<string, string[]> = {
  'Sudeste': ['SP', 'MG', 'ES', 'RJ'],
  'Sul': ['PR', 'RS', 'SC'],
  'Norte': ['AC', 'AM', 'RO', 'PA', 'AP', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'RN', 'PE', 'PI', 'MA', 'PB', 'SE'],
  'Centro-Oeste': ['MT', 'DF', 'GO', 'MS'],
};

const CATEGORY_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#3B82F6',
  '#8B5CF6', '#06B6D4', '#6366F1', '#14B8A6', '#F97316'
];

export default function GestaoPatrimonioPage() {
  const [activeTab, setActiveTab] = useState<'VISAO_GERAL' | 'DASHBOARD_BI'>('VISAO_GERAL');

  const [submissoes, setSubmissoes] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Stats para Tab 1 (Visão Geral)
  const [kpiDash, setKpiDash] = useState<any>({
    total_igrejas_ativas: 0,
    submissoes_2026: 0,
    submissoes_ultimos_7_dias: 0,
    percentual_cobertura_2026: 0,
    historico_recente: [],
  });

  // Filters Tab 1
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegiao, setFilterRegiao] = useState('ALL');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [filterSede, setFilterSede] = useState('');
  const [filterPorte, setFilterPorte] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [kpiMeta, setKpiMeta] = useState({ totalIgrejas: 0, recebidos: 0, pendentes: 0, percentual: 0 });
  const [pageMeta, setPageMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  const [selectedSubmissao, setSelectedSubmissao] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Tab 2 (BI & Estatísticas)
  const [apenasRuim, setApenasRuim] = useState(false);
  const [statsBi, setStatsBi] = useState<any>({
    total_itens: 0,
    total_templos_com_submissao_2026: 0,
    media_itens_por_templo: 0,
    itens_por_conservacao: [],
    itens_por_categoria: [],
  });
  const [loadingBi, setLoadingBi] = useState(false);

  // Session check
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) window.location.href = '/login';
        else if (data.role === 'viewer') window.location.href = '/mapa-geral';
        else if (data.role) { setUserRole(data.role); if (data.nome) setUserName(data.nome); }
      }).catch(() => window.location.href = '/login');
  }, []);

  // Search input debounce
  useEffect(() => {
    const handler = setTimeout(() => { setSearchTerm(searchInput); setCurrentPage(1); }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch Dashboard Stats (Top KPIs Tab 1)
  const fetchDashKpis = useCallback(async () => {
    try {
      const res = await fetch('/api/patrimonio/dashboard');
      const json = await res.json();
      if (json.success && json.data) {
        setKpiDash(json.data);
      }
    } catch (err) {
      console.error('Erro ao buscar dashboard patrimonio:', err);
    }
  }, []);

  useEffect(() => {
    fetchDashKpis();
  }, [fetchDashKpis]);

  // Fetch List (Tab 1)
  const fetchDados = useCallback(async () => {
    if (!submissoes.length) setLoading(true);
    else setIsSyncing(true);

    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(itemsPerPage) });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (filterSede.trim()) params.set('sede', filterSede.trim());
      if (filterPorte !== 'ALL') params.set('porte', filterPorte);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);

      let finalEstado = filterEstado;
      if (filterEstado === 'ALL' && filterRegiao !== 'ALL') {
        const ufs = REGIAO_GEOGRAFICA_MAPPING[filterRegiao];
        if (ufs) finalEstado = ufs.join(',');
      }
      if (finalEstado !== 'ALL') params.set('estado', finalEstado);

      const res = await fetch(`/api/patrimonio/lista?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setSubmissoes(json.data || []);
        if (json.meta) {
          setKpiMeta({ totalIgrejas: json.meta.totalIgrejas, recebidos: json.meta.recebidos, pendentes: json.meta.pendentes, percentual: json.meta.percentual });
          setPageMeta({ total: json.meta.total, page: json.meta.page, limit: json.meta.limit, totalPages: json.meta.totalPages });
        }
      } else {
        toast.error(json.error || 'Erro ao carregar os dados.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [currentPage, searchTerm, filterRegiao, filterEstado, filterSede, filterPorte, filterStatus]);

  useEffect(() => {
    if (activeTab === 'VISAO_GERAL') {
      fetchDados();
    }
  }, [activeTab, fetchDados]);

  // Fetch BI Statistics (Tab 2)
  const fetchStatsBi = useCallback(async () => {
    setLoadingBi(true);
    try {
      const params = new URLSearchParams();
      if (apenasRuim) params.set('estado', 'RUIM');

      const res = await fetch(`/api/patrimonio/estatisticas?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setStatsBi(json.data);
      } else {
        toast.error(json.error || 'Erro ao carregar estatísticas.');
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas BI:', err);
      toast.error('Erro de conexão com o servidor.');
    } finally {
      setLoadingBi(false);
    }
  }, [apenasRuim]);

  useEffect(() => {
    if (activeTab === 'DASHBOARD_BI') {
      fetchStatsBi();
    }
  }, [activeTab, fetchStatsBi]);

  const handleExportFaltantes = () => {
    const faltantes = submissoes.filter((sub) => !sub.submissao_id);
    if (faltantes.length === 0) {
      toast.info('Nenhuma igreja com envio pendente nesta listagem.');
      return;
    }

    const dataToExport = faltantes.map((sub) => {
      const cleanPhone = sub.dirigente_telefone ? sub.dirigente_telefone.replace(/\D/g, '') : '';
      const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : '';

      return {
        TOTVS: sub.codigo_totvs || '',
        Igreja: sub.desc_igreja || '',
        UF: sub.estado || '',
        Município: sub.municipio || '',
        Dirigente: sub.dirigente_nome || 'NÃO INFORMADO',
        WhatsApp: whatsappUrl || (sub.dirigente_telefone || 'SEM CONTATO'),
        'Sede Pai': sub.codigo_totvs_pai || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faltantes');
    XLSX.writeFile(workbook, 'cobranca_patrimonio_faltantes.xlsx');
    toast.success(`Relatório com ${faltantes.length} igrejas faltantes gerado com sucesso!`);
  };

  const isRecentSubmission = (dateStr?: string | null) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      const diffDays = (Date.now() - d.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    } catch {
      return false;
    }
  };

  const formatDate = (rawDate?: string | null) => {
    if (!rawDate) return '---';
    try {
      const d = new Date(rawDate);
      return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('pt-BR');
    } catch {
      return '---';
    }
  };

  // Prepara dados de conservação para o gráfico de barras horizontais
  const getConservationColor = (consName: string) => {
    const name = (consName || '').toUpperCase();
    if (name.includes('ÓTIMO') || name.includes('OTIMO') || name.includes('BOM')) return '#10B981'; // Verde
    if (name.includes('REGULAR')) return '#F59E0B'; // Laranja
    if (name.includes('RUIM') || name.includes('REPARO')) return '#EF4444'; // Vermelho
    return '#6366F1';
  };

  const totalRuim = (statsBi.itens_por_conservacao || []).reduce((acc: number, item: any) => {
    const c = (item.conservacao || '').toUpperCase();
    if (c.includes('RUIM') || c.includes('REPARO')) return acc + (Number(item.quantidade) || 0);
    return acc;
  }, 0);

  const renderHierarquia = (parentTotvs: string, level: number): React.ReactNode => {
    const children = submissoes.filter(
      (item) =>
        String(item.codigo_totvs_pai || '').trim().toLowerCase() === String(parentTotvs || '').trim().toLowerCase() &&
        String(item.codigo_totvs || '').trim().toLowerCase() !== String(parentTotvs || '').trim().toLowerCase()
    );

    if (children.length === 0) return null;

    return (
      <>
        {children.map((sub) => (
          <div key={sub.codigo_totvs} className="flex flex-col">
            <div
              className="p-3.5 bg-white border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              style={{ paddingLeft: `${Math.max(16, level * 28)}px` }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-bold text-xs bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-zinc-700">
                  {sub.codigo_totvs}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-zinc-800">{sub.desc_igreja}</span>
                  {sub.porte && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider"
                      style={{ backgroundColor: PORTE_INFO[sub.porte]?.color || '#A6A6A6' }}
                    >
                      {sub.porte}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500">{sub.municipio} - {sub.estado}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-between md:justify-end">
                {sub.dirigente_nome ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-700 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-indigo-500" /> {sub.dirigente_nome}
                    </span>
                    {sub.dirigente_telefone && (
                      <a
                        href={`https://wa.me/55${sub.dirigente_telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full hover:bg-emerald-100 transition-colors font-bold"
                      >
                        <Phone className="h-2.5 w-2.5" /> WhatsApp
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    ⚠️ Acionar Sede
                  </span>
                )}

                {sub.submissao_id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Recebido
                    </span>
                    {isRecentSubmission(sub.data_envio) && (
                      <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                        🔥 Recente
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <X className="h-3.5 w-3.5" /> Pendente
                  </span>
                )}

                {sub.submissao_id && (
                  <button
                    onClick={() => {
                      setSelectedSubmissao(sub);
                      setIsDetailModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver Detalhes
                  </button>
                )}
              </div>
            </div>
            {renderHierarquia(sub.codigo_totvs, level + 1)}
          </div>
        ))}
      </>
    );
  };

  const renderTreeContainer = () => {
    const trimmedSede = filterSede.trim().toLowerCase();
    const rootSede = submissoes.find(
      (item) => String(item.codigo_totvs || '').trim().toLowerCase() === trimmedSede
    );

    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
              Estrutura Hierárquica da Sede: <span className="font-mono text-indigo-700">{filterSede.toUpperCase()}</span>
            </h3>
          </div>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
            {submissoes.length} {submissoes.length === 1 ? 'Igreja' : 'Igrejas na malha'}
          </span>
        </div>

        <div className="divide-y divide-zinc-100">
          {rootSede ? (
            <div className="flex flex-col">
              <div
                className="p-3.5 bg-indigo-50/30 border-b border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-semibold"
                style={{ paddingLeft: '16px' }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-black text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">
                    {rootSede.codigo_totvs}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-zinc-900">{rootSede.desc_igreja}</span>
                    {rootSede.porte && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider"
                        style={{ backgroundColor: PORTE_INFO[rootSede.porte]?.color || '#A6A6A6' }}
                      >
                        {rootSede.porte}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500">{rootSede.municipio} - {rootSede.estado}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-between md:justify-end">
                  {rootSede.dirigente_nome ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-zinc-700 flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-indigo-500" /> {rootSede.dirigente_nome}
                      </span>
                      {rootSede.dirigente_telefone && (
                        <a
                          href={`https://wa.me/55${rootSede.dirigente_telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full hover:bg-emerald-100 transition-colors font-bold"
                        >
                          <Phone className="h-2.5 w-2.5" /> WhatsApp
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                      ⚠️ Acionar Sede
                    </span>
                  )}

                  {rootSede.submissao_id ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Recebido
                    </span>
                  ) : (
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <X className="h-3.5 w-3.5" /> Pendente
                    </span>
                  )}

                  {rootSede.submissao_id && (
                    <button
                      onClick={() => {
                        setSelectedSubmissao(rootSede);
                        setIsDetailModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver Detalhes
                    </button>
                  )}
                </div>
              </div>
              {renderHierarquia(rootSede.codigo_totvs, 1)}
            </div>
          ) : (
            renderHierarquia(filterSede.trim(), 1)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="relative z-[9999] h-16 bg-white/80 border-b border-zinc-200 sticky top-0 shadow-xs flex items-center px-4 md:px-8 justify-between backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Package className="h-6 w-6 text-indigo-600"/>
          <div>
            <h1 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-1.5">GEO-VALIG IPDA <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-bold">PATRIMÔNIO</span></h1>
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Painel Administrativo de BI & Cobrança</p>
          </div>
        </div>

        {/* Grouped Administrative Navigation Dropdowns */}
        <div className="flex bg-zinc-100 dark:bg-slate-800 p-1 rounded-xl border border-zinc-200 dark:border-slate-700 gap-1 items-center font-semibold text-xs">
          <a
            href="/"
            className="px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs"
          >
            <span className="text-sm">🗺️</span>
            <span>Mapa Geral</span>
          </a>

          {userRole !== 'viewer' && (
            <div className="relative group">
              <button
                type="button"
                className="px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs"
              >
                <span className="text-sm">📍</span>
                <span>Validação & Gestão</span>
                <ChevronDown className="h-3 w-3 opacity-50 group-hover:rotate-180 transition-transform duration-200"/>
              </button>

              <div className="absolute top-full left-0 pt-2 w-64 hidden group-hover:block z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-slate-700/80 rounded-2xl shadow-xl p-2 flex flex-col gap-1 relative before:absolute before:-top-1.5 before:left-8 before:w-3 before:h-3 before:bg-white dark:before:bg-slate-900 before:border-t before:border-l before:border-zinc-200/80 dark:before:border-slate-700/80 before:rotate-45">
                  <a href="/validacao?tab=validation" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-200 transition-colors group/item">
                    <div className="bg-indigo-100/50 dark:bg-slate-700 p-2 rounded-lg group-hover/item:bg-indigo-200/50 transition-colors text-base shadow-sm">📍</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover/item:text-indigo-700 dark:group-hover/item:text-indigo-400">Validação de Igrejas</span>
                      <span className="text-[9px] text-zinc-500 dark:text-slate-400 font-medium">Aprovação de coordenadas e status</span>
                    </div>
                  </a>
                  <a href="/gestao" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-200 transition-colors group/item">
                    <div className="bg-indigo-100/50 dark:bg-slate-700 p-2 rounded-lg group-hover/item:bg-indigo-200/50 transition-colors text-base shadow-sm">👥</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover/item:text-indigo-700 dark:group-hover/item:text-indigo-400">Gestão de Contatos</span>
                      <span className="text-[9px] text-zinc-500 dark:text-slate-400 font-medium">Dirigentes e tesouraria local</span>
                    </div>
                  </a>
                  <a href="/coligacoes" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-200 transition-colors group/item">
                    <div className="bg-indigo-100/50 dark:bg-slate-700 p-2 rounded-lg group-hover/item:bg-indigo-200/50 transition-colors text-base shadow-sm">🌳</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover/item:text-indigo-700 dark:group-hover/item:text-indigo-400">Malha de Coligações</span>
                      <span className="text-[9px] text-zinc-500 dark:text-slate-400 font-medium">Estrutura hierárquica e vínculos</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Inteligência & BI Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs"
            >
              <span className="text-sm">📊</span>
              <span>Inteligência & BI</span>
              <ChevronDown className="h-3 w-3 opacity-50 group-hover:rotate-180 transition-transform duration-200"/>
            </button>

            <div className="absolute top-full left-0 pt-2 w-64 hidden group-hover:block z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-slate-700/80 rounded-2xl shadow-xl p-2 flex flex-col gap-1 relative before:absolute before:-top-1.5 before:left-8 before:w-3 before:h-3 before:bg-white dark:before:bg-slate-900 before:border-t before:border-l before:border-zinc-200/80 dark:before:border-slate-700/80 before:rotate-45">
                <a href="/validacao?tab=dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-200 transition-colors group/item">
                  <div className="bg-emerald-100/50 dark:bg-slate-700 p-2 rounded-lg group-hover/item:bg-emerald-200/50 transition-colors text-base shadow-sm">📈</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover/item:text-emerald-700 dark:group-hover/item:text-emerald-400">Dashboard Global</span>
                    <span className="text-[9px] text-zinc-500 dark:text-slate-400 font-medium">Métricas de geocodificação</span>
                  </div>
                </a>
                <a href="/relatorios" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-200 transition-colors group/item">
                  <div className="bg-emerald-100/50 dark:bg-slate-700 p-2 rounded-lg group-hover/item:bg-emerald-200/50 transition-colors text-base shadow-sm">📑</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover/item:text-emerald-700 dark:group-hover/item:text-emerald-400">Relatórios de Matriz</span>
                    <span className="text-[9px] text-zinc-500 dark:text-slate-400 font-medium">Membresia e condição pastoral</span>
                  </div>
                </a>
                <a href="/gestao-patrimonio" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-200 transition-colors group/item">
                  <div className="bg-emerald-100/50 dark:bg-slate-700 p-2 rounded-lg group-hover/item:bg-emerald-200/50 transition-colors text-base shadow-sm">🪑</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover/item:text-emerald-700 dark:group-hover/item:text-emerald-400">Gestão de Patrimônio</span>
                    <span className="text-[9px] text-zinc-500 dark:text-slate-400 font-medium">Bens e inventário das igrejas</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userName && (
            <span className="text-xs text-zinc-600 font-semibold hidden sm:inline-block bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full mr-2">
              Olá, <strong className="text-indigo-600">{userName}</strong>
            </span>
          )}
          <button onClick={() => { fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.href = '/') }} className="text-red-600 text-xs font-bold px-3 py-1.5 hover:bg-red-50 rounded-lg flex items-center gap-1 cursor-pointer"><Power className="h-3.5 w-3.5"/> Sair</button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

        {/* NAVEGAÇÃO DE SUB-ABAS DE PATRIMÔNIO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-2xs flex items-center gap-2 max-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('VISAO_GERAL')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'VISAO_GERAL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Visão Geral / Histórico de Envios</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD_BI')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DASHBOARD_BI'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PieChartIcon className="h-4 w-4" />
            <span>Dashboard de Itens & BI</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: VISÃO GERAL E HISTÓRICO DE ENVIOS                  */}
        {/* ======================================================== */}
        {activeTab === 'VISAO_GERAL' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPIs Cards Tab 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Total de Igrejas Ativas</p>
                    <h3 className="text-3xl font-black text-zinc-800 mt-1">{kpiDash.total_igrejas_ativas || kpiMeta.totalIgrejas}</h3>
                  </div>
                  <div className="p-2.5 bg-zinc-100 text-zinc-600 rounded-xl"><Building2 className="h-5 w-5"/></div>
                </div>
              </div>

              <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Preenchido em 2026</p>
                    <h3 className="text-3xl font-black text-emerald-700 mt-1">{kpiDash.submissoes_2026 || kpiMeta.recebidos}</h3>
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="h-5 w-5"/></div>
                </div>
              </div>

              <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Envios Últimos 7 Dias</p>
                    <h3 className="text-3xl font-black text-indigo-700 mt-1">{kpiDash.submissoes_ultimos_7_dias || 0}</h3>
                  </div>
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Clock className="h-5 w-5"/></div>
                </div>
              </div>

              <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">% Cobertura Patrimônio</p>
                    <h3 className="text-3xl font-black text-indigo-700 mt-1">{kpiDash.percentual_cobertura_2026 || kpiMeta.percentual}%</h3>
                  </div>
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Package className="h-5 w-5"/></div>
                </div>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-indigo-600"/>
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wide">Painel de Filtros Avançados</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportFaltantes}
                    className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    📥 Exportar Faltantes (Excel)
                  </button>
                  {isSyncing && (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin"/> Atualizando...
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Pesquisa Livre</label>
                  <Search className="absolute left-3 top-7 h-4 w-4 text-zinc-400"/>
                  <input type="text" placeholder="Buscar por TOTVS, Igreja ou Dirigente..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full h-10 bg-zinc-50 border border-slate-200 rounded-lg pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="relative">
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Sede Cascata (TOTVS)</label>
                  <MapPin className="absolute left-3 top-7 h-4 w-4 text-zinc-400"/>
                  <input type="text" placeholder="TOTVS da Sede (Hierarquia)..." value={filterSede} onChange={(e) => { setFilterSede(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-zinc-50 border border-slate-200 rounded-lg pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Região Geográfica</label>
                  <select value={filterRegiao} onChange={(e) => { setFilterRegiao(e.target.value); setFilterEstado('ALL'); setCurrentPage(1); }} className="w-full h-10 bg-zinc-50 border border-slate-200 text-xs rounded-lg p-2 font-semibold outline-none focus:ring-1 focus:ring-indigo-500">
                    {REGIOES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Estado (UF)</label>
                  <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-zinc-50 border border-slate-200 text-xs rounded-lg p-2 font-semibold outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="ALL">Todos os Estados</option>
                    {ESTADOS.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Porte da Igreja</label>
                  <select value={filterPorte} onChange={(e) => { setFilterPorte(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-zinc-50 border border-slate-200 text-xs rounded-lg p-2 font-semibold outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="ALL">Todos os Portes</option>
                    <option value="ESTADUAL">ESTADUAL</option>
                    <option value="SETORIAL">SETORIAL</option>
                    <option value="CENTRAL">CENTRAL</option>
                    <option value="REGIONAL">REGIONAL</option>
                    <option value="LOCAL">LOCAL</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Status de Envio</label>
                  <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-zinc-50 border border-slate-200 text-xs rounded-lg p-2 font-semibold outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="ALL">Todos os Status</option>
                    <option value="ENVIADO">✅ Entregues (Recebidos)</option>
                    <option value="PENDENTE">❌ Faltantes (Pendentes)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Resultados Tab 1 */}
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600"/></div>
            ) : submissoes.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center"><Package className="h-12 w-12 text-zinc-300 mx-auto mb-3"/><h3 className="font-bold text-zinc-800">Nenhum registro encontrado</h3></div>
            ) : filterSede.trim() !== '' ? (
              renderTreeContainer()
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4">TOTVS</th>
                        <th className="p-4">Igreja / Sede Superior</th>
                        <th className="p-4">Contato (Dirigente)</th>
                        <th className="p-4 text-center">Data Envio</th>
                        <th className="p-4 text-center">Status de Envio</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                      {submissoes.map(sub => (
                        <tr key={sub.codigo_totvs} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="p-4 font-mono font-bold">{sub.codigo_totvs}</td>
                          <td className="p-4">
                            <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                              <span>{sub.desc_igreja}</span>
                              {sub.porte && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider"
                                  style={{ backgroundColor: PORTE_INFO[sub.porte]?.color || '#A6A6A6' }}
                                >
                                  {sub.porte}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-zinc-500">{sub.municipio} - {sub.estado}</span>
                              {sub.codigo_totvs_pai && <span className="bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-600">Sede Pai: {sub.codigo_totvs_pai}</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            {sub.dirigente_nome ? (
                              <div className="space-y-1">
                                <div className="font-bold flex items-center gap-1.5 uppercase text-[10px]"><User className="h-3.5 w-3.5 text-indigo-500"/> {sub.dirigente_nome}</div>
                                {sub.dirigente_telefone && (
                                  <a href={`https://wa.me/55${sub.dirigente_telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full hover:bg-emerald-100 transition-colors font-bold"><Phone className="h-2.5 w-2.5"/> WhatsApp</a>
                                )}
                              </div>
                            ) : <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded text-[10px] font-bold">⚠️ Acionar Sede (Sem Contato)</span>}
                          </td>
                          <td className="p-4 text-center font-mono text-zinc-600">
                            {formatDate(sub.data_envio)}
                          </td>
                          <td className="p-4 text-center">
                            {sub.submissao_id ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 max-w-max mx-auto"><CheckCircle2 className="h-3.5 w-3.5"/> Recebido</span>
                                {isRecentSubmission(sub.data_envio) && (
                                  <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                    🔥 Recente
                                  </span>
                                )}
                              </div>
                            ) : <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 max-w-max mx-auto"><X className="h-3.5 w-3.5"/> Pendente</span>}
                          </td>
                          <td className="p-4 text-center">
                            {sub.submissao_id ? (
                              <button onClick={() => { setSelectedSubmissao(sub); setIsDetailModalOpen(true); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-xs cursor-pointer"><Eye className="h-3.5 w-3.5"/> Ver Detalhes</button>
                            ) : (
                              <a href={`/patrimonio/${sub.codigo_totvs}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-xs cursor-pointer" title="Abrir formulário público de patrimônio">🔗 Link Público</a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pageMeta.totalPages > 1 && (
                  <div className="p-4 bg-zinc-50 border-t border-zinc-150 flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-semibold font-mono">Página {pageMeta.page} de {pageMeta.totalPages} ({pageMeta.total} registros)</span>
                    <div className="flex items-center gap-2">
                      <button disabled={pageMeta.page <= 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-3 py-1.5 border border-zinc-200 bg-white rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 flex items-center gap-1 cursor-pointer"><ChevronLeft className="h-4 w-4"/> Anterior</button>
                      <button disabled={pageMeta.page >= pageMeta.totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1.5 border border-zinc-200 bg-white rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 flex items-center gap-1 cursor-pointer">Próxima <ChevronRight className="h-4 w-4"/></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: DASHBOARD DE ITENS & BI ESTATÍSTICO               */}
        {/* ======================================================== */}
        {activeTab === 'DASHBOARD_BI' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Banner Superior: Filtro Auditoria de Compras */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                    Auditoria de Compras
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">Inteligência Patrimonial</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Dashboard de Levantamento de Itens
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm">
                  Análise estatística de quantidades, categorias de bens e nível de conservação dos equipamentos.
                </p>
              </div>

              {/* Checkbox destacado "Mostrar apenas itens em estado Ruim" */}
              <label className="bg-white/10 hover:bg-white/20 border-2 border-rose-400/60 backdrop-blur-md px-4 py-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all shrink-0">
                <input
                  type="checkbox"
                  checked={apenasRuim}
                  onChange={(e) => setApenasRuim(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-white block">Mostrar apenas itens em estado Ruim</span>
                  <span className="text-[10px] text-rose-200 font-medium">Filtrar para orçamento e substituição urgente</span>
                </div>
              </label>
            </div>

            {/* Cards KPI Tab 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total de Itens */}
              <div className="bg-white border-2 border-emerald-500 bg-emerald-50/20 rounded-3xl p-6 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                    Total de Itens Cadastrados
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-black text-emerald-950 mt-1">
                    {statsBi.total_itens || 0}
                  </h3>
                  <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                    Equipamentos e bens patrimoniais
                  </span>
                </div>
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
                  <Package className="h-7 w-7" />
                </div>
              </div>

              {/* Estado Crítico - Ruim */}
              <div className="bg-white border-2 border-rose-500 bg-rose-50/20 rounded-3xl p-6 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-rose-800 uppercase tracking-wider block flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Estado Crítico - Ruim
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-black text-rose-950 mt-1">
                    {totalRuim}
                  </h3>
                  <span className="text-[11px] text-rose-700 font-semibold mt-1 block">
                    Necessitam de reparo ou troca urgente
                  </span>
                </div>
                <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-7 w-7" />
                </div>
              </div>

              {/* Média por Templo */}
              <div className="bg-white border-2 border-amber-500 bg-amber-50/20 rounded-3xl p-6 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-amber-800 uppercase tracking-wider block">
                    Média de Itens por Templo
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-black text-amber-950 mt-1">
                    {statsBi.media_itens_por_templo || 0}
                  </h3>
                  <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
                    Baseado nas submissões de 2026
                  </span>
                </div>
                <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
                  <TrendingUp className="h-7 w-7" />
                </div>
              </div>
            </div>

            {/* Gráficos Recharts */}
            {loadingBi ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center flex items-center justify-center gap-3 text-indigo-600 font-bold">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Carregando dados estatísticos e gráficos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico Esquerda: Distribuição por Categorias (Doughnut) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-black text-slate-900 text-base">
                        Distribuição por Categoria
                      </h3>
                    </div>
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">
                      {(statsBi.itens_por_categoria || []).length} tipos
                    </span>
                  </div>

                  {(statsBi.itens_por_categoria || []).length === 0 ? (
                    <p className="text-slate-400 text-xs italic text-center py-12">Sem itens cadastrados para esta visualização.</p>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statsBi.itens_por_categoria}
                            dataKey="quantidade"
                            nameKey="item_nome"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                          >
                            {(statsBi.itens_por_categoria || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [`${value} unidades`, 'Quantidade']}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontWeight: 'bold' }}
                          />
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Gráfico Direita: Estado de Conservação (Barras Horizontais com Cores Verde, Laranja, Vermelha) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-black text-slate-900 text-base">
                        Estado de Conservação dos Bens
                      </h3>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                      Classificação Oficial
                    </span>
                  </div>

                  {(statsBi.itens_por_conservacao || []).length === 0 ? (
                    <p className="text-slate-400 text-xs italic text-center py-12">Sem dados de conservação disponíveis.</p>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={statsBi.itens_por_conservacao}
                          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                          <XAxis type="number" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                          <YAxis dataKey="conservacao" type="category" width={80} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                          <Tooltip
                            formatter={(value: any) => [`${value} itens`, 'Quantidade']}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="quantidade" radius={[0, 8, 8, 0]}>
                            {(statsBi.itens_por_conservacao || []).map((entry: any, index: number) => (
                              <Cell key={`bar-${index}`} fill={getConservationColor(entry.conservacao)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {isDetailModalOpen && (
        <PatrimonioDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          submissao={selectedSubmissao ? {
            id: selectedSubmissao.submissao_id, codigo_totvs: selectedSubmissao.codigo_totvs, desc_igreja: selectedSubmissao.desc_igreja, municipio: selectedSubmissao.municipio, nome_responsavel: selectedSubmissao.nome_responsavel || selectedSubmissao.dirigente_nome, telefone_responsavel: selectedSubmissao.dirigente_telefone, ano_referencia: selectedSubmissao.ano_referencia, data_envio: selectedSubmissao.data_envio
          } : null}
        />
      )}
    </div>
  );
}
