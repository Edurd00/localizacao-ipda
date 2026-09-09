'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import {
  Search, Users, Loader2, RefreshCw, Power, ChevronLeft, ChevronRight,
  ChevronDown, Eye, Calendar, Phone, User, Package, Filter, Building2, CheckCircle2, Clock, MapPin, X
} from 'lucide-react';
import PatrimonioDetailModal from '@/components/PatrimonioDetailModal';

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

export default function GestaoPatrimonioPage() {
  const [submissoes, setSubmissoes] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters
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

  useEffect(() => {
    const handler = setTimeout(() => { setSearchTerm(searchInput); setCurrentPage(1); }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) window.location.href = '/login';
        else if (data.role === 'viewer') window.location.href = '/mapa-geral';
        else if (data.role) { setUserRole(data.role); if (data.nome) setUserName(data.nome); }
      }).catch(() => window.location.href = '/login');
  }, []);

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

  useEffect(() => { fetchDados(); }, [fetchDados]);

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

              {/* Invisible padding bridge prevents mouseleave dropoff */}
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

            {/* Invisible padding bridge prevents mouseleave dropoff */}
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

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div><p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Total de Igrejas Ativas</p><h3 className="text-3xl font-black text-zinc-800 mt-1">{kpiMeta.totalIgrejas}</h3></div>
              <div className="p-2.5 bg-zinc-100 text-zinc-600 rounded-xl"><Building2 className="h-5 w-5"/></div>
            </div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Relatórios Recebidos</p><h3 className="text-3xl font-black text-emerald-700 mt-1">{kpiMeta.recebidos}</h3></div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="h-5 w-5"/></div>
            </div>
          </div>
          <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div><p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Pendentes de Envio</p><h3 className="text-3xl font-black text-rose-700 mt-1">{kpiMeta.pendentes}</h3></div>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><Clock className="h-5 w-5"/></div>
            </div>
          </div>
          <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div><p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">% Cobertura Patrimônio</p><h3 className="text-3xl font-black text-indigo-700 mt-1">{kpiMeta.percentual}%</h3></div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Package className="h-5 w-5"/></div>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-indigo-600"/>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wide">Painel de Filtros Avançados</h2>
            </div>
            {isSyncing && (
              <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin"/> Atualizando...
              </span>
            )}
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

        {/* Lista de Resultados */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600"/></div>
        ) : submissoes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center"><Package className="h-12 w-12 text-zinc-300 mx-auto mb-3"/><h3 className="font-bold text-zinc-800">Nenhum registro encontrado</h3></div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">TOTVS</th>
                    <th className="p-4">Igreja / Sede Superior</th>
                    <th className="p-4">Contato (Dirigente)</th>
                    <th className="p-4 text-center">Status de Envio</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                  {submissoes.map(sub => (
                    <tr key={sub.codigo_totvs} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold">{sub.codigo_totvs}</td>
                      <td className="p-4">
                        <div className="font-bold text-sm">{sub.desc_igreja}</div>
                        <div className="flex items-center gap-2 mt-1">
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
                      <td className="p-4 text-center">
                        {sub.submissao_id ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 max-w-max mx-auto"><CheckCircle2 className="h-3.5 w-3.5"/> Recebido</span>
                        ) : <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 max-w-max mx-auto"><X className="h-3.5 w-3.5"/> Pendente</span>}
                      </td>
                      <td className="p-4 text-center">
                        {sub.submissao_id ? (
                          <button onClick={() => { setSelectedSubmissao(sub); setIsDetailModalOpen(true); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-xs cursor-pointer"><Eye className="h-3.5 w-3.5"/> Ver Detalhes</button>
                        ) : <span className="text-[10px] text-zinc-400 italic">Sem envio</span>}
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
