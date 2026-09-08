'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import {
  Search,
  Users,
  Loader2,
  RefreshCw,
  Power,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Calendar,
  Phone,
  User,
  Package,
  CheckCircle2,
  XCircle,
  Building2,
  FileCheck,
  FileClock,
  PieChart,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import PatrimonioDetailModal from '@/components/PatrimonioDetailModal';

const ESTADOS_BR = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

const PORTES_IGREJA = [
  'ESTADUAL', 'SETORIAL', 'CENTRAL', 'REGIONAL', 'LOCAL', 'CASA DE ORAÇÃO', 'ALDEIA INDIGENA'
];

export interface PatrimonioIgrejaItem {
  codigo_totvs: string;
  desc_igreja: string;
  municipio?: string | null;
  estado?: string | null;
  porte?: string | null;
  codigo_totvs_pai?: string | null;
  dirigente_nome?: string | null;
  dirigente_telefone?: string | null;
  submissao_id?: string | null;
  id?: string | null;
  data_envio?: string | null;
  nome_responsavel?: string | null;
  telefone_responsavel?: string | null;
  ano_referencia?: number | string | null;
  criado_em?: string | null;
}

export default function GestaoPatrimonioPage() {
  const [items, setItems] = useState<PatrimonioIgrejaItem[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Search input with 400ms debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [filterPorte, setFilterPorte] = useState('ALL');
  const [filterStatusEnvio, setFilterStatusEnvio] = useState('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Metadata for KPIs and Pagination
  const [meta, setMeta] = useState({
    totalIgrejas: 0,
    recebidos: 0,
    pendentes: 0,
    percentual: 0,
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Modal / Detail states
  const [selectedSubmissao, setSelectedSubmissao] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Debounce search input by 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load session
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          window.location.href = '/login';
        } else if (data.role === 'viewer') {
          window.location.href = '/mapa-geral';
        } else if (data.role) {
          setUserRole(data.role);
          if (data.nome) setUserName(data.nome);
        }
      })
      .catch((err) => {
        console.error(err);
        window.location.href = '/login';
      });
  }, []);

  // Fetch Patrimonio List & KPIs
  const fetchPatrimonioList = async () => {
    if (!items.length) setLoading(true);
    else setIsSyncing(true);

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });

      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (filterEstado !== 'ALL') params.set('estado', filterEstado);
      if (filterPorte !== 'ALL') params.set('porte', filterPorte);
      if (filterStatusEnvio !== 'ALL') params.set('status_envio', filterStatusEnvio);

      const res = await fetch(`/api/patrimonio/lista?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setItems(json.data || []);
        if (json.meta) {
          setMeta({
            totalIgrejas: json.meta.totalIgrejas || 0,
            recebidos: json.meta.recebidos || 0,
            pendentes: json.meta.pendentes || 0,
            percentual: json.meta.percentual || 0,
            total: json.meta.total || 0,
            page: json.meta.page || 1,
            limit: json.meta.limit || 20,
            totalPages: json.meta.totalPages || 1,
          });
        }
      } else {
        toast.error('Erro ao carregar relatórios de patrimônio.');
      }
    } catch (err) {
      console.error('Error fetching patrimonio list:', err);
      toast.error('Erro de conexão ao carregar relatórios.');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchPatrimonioList();
  }, [currentPage, searchTerm, filterEstado, filterPorte, filterStatusEnvio]);

  // Open Details Modal
  const handleOpenDetails = (item: PatrimonioIgrejaItem) => {
    if (!item.submissao_id && !item.id) return;
    setSelectedSubmissao({
      id: item.submissao_id || item.id,
      codigo_totvs: item.codigo_totvs,
      desc_igreja: item.desc_igreja,
      municipio: item.municipio,
      nome_responsavel: item.nome_responsavel || item.dirigente_nome,
      telefone_responsavel: item.telefone_responsavel || item.dirigente_telefone,
      ano_referencia: item.ano_referencia,
      data_envio: item.data_envio,
      criado_em: item.criado_em,
    });
    setIsDetailModalOpen(true);
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

  const formatDate = (rawDate?: string | null) => {
    if (!rawDate) return '---';
    try {
      const d = new Date(rawDate);
      return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('pt-BR');
    } catch {
      return '---';
    }
  };

  const formatWhatsAppUrl = (phone?: string | null) => {
    if (!phone) return null;
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits) return null;
    return `https://wa.me/55${cleanDigits}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 flex flex-col font-sans text-zinc-900 dark:text-slate-100 transition-colors duration-200">
      <Toaster position="top-right" richColors closeButton />

      {/* Header Navigation */}
      <header className="relative z-[9999] h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 sticky top-0 shadow-xs flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
          <div className="flex items-center space-x-3 shrink-0">
            <img src="/img/logo.png" alt="IPDA" className="h-10 w-auto object-contain shadow-sm" />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                GEO-VALIG IPDA <span className="text-[10px] bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-slate-700 font-bold">PATRIMÔNIO</span>
              </h1>
              <p className="text-[9px] text-zinc-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Painel Administrativo de BI & Cobrança</p>
            </div>
          </div>

          {/* Administrative Navigation Dropdowns */}
          <div className="flex bg-zinc-100 dark:bg-slate-800 p-1 rounded-xl border border-zinc-200 dark:border-slate-700 gap-1 items-center font-semibold text-xs">
            <a
              href="/"
              className="px-3 py-1.5 rounded-lg text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50 transition-all"
            >
              🗺️ Mapa Geral
            </a>

            {/* Validação & Gestão Dropdown */}
            {userRole !== 'viewer' && (
              <div className="relative group">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all bg-white dark:bg-slate-700 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/50 dark:border-slate-650 font-bold"
                >
                  <span>📍 Validação & Gestão</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-[9999] p-1 divide-y divide-zinc-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <a
                    href="/validacao?tab=validation"
                    className="block px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
                  >
                    📍 Validação de Igrejas
                  </a>
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
                  <a
                    href="/gestao-patrimonio"
                    className="block px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 rounded-lg"
                  >
                    🪑 Patrimônio & BI
                  </a>
                </div>
              </div>
            )}

            {/* Inteligência & BI Dropdown */}
            <div className="relative group">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50"
              >
                <span>📊 Inteligência & BI</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-[9999] p-1 divide-y divide-zinc-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                <a
                  href="/validacao?tab=dashboard"
                  className="block px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
                >
                  📊 Dashboard de Status
                </a>
                <a
                  href="/relatorios"
                  className="block px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
                >
                  📊 Relatórios Hierárquicos
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userName && (
              <span className="text-xs font-semibold text-zinc-700 dark:text-slate-200 hidden sm:inline-block bg-zinc-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-slate-700">
                Olá, <strong className="text-indigo-600 dark:text-indigo-400">{userName}</strong>
              </span>
            )}

            <button
              onClick={fetchPatrimonioList}
              disabled={isSyncing}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full transition-all flex items-center justify-center min-w-[36px]"
              title="Atualizar lista"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            >
              <Power className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Painel de 4 Cards BI KPI Topo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total de Igrejas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-zinc-400 dark:text-slate-400 uppercase tracking-wider">Total de Igrejas Ativas</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-0.5 font-mono">
                {meta.totalIgrejas}
              </h3>
            </div>
            <div className="p-3 bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-200 rounded-xl border border-zinc-200 dark:border-slate-700">
              <Building2 className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: Relatórios Recebidos */}
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 shadow-xs flex items-center justify-between bg-emerald-50/20 dark:bg-emerald-950/10">
            <div>
              <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Relatórios Recebidos</p>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
                {meta.recebidos}
              </h3>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <FileCheck className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: Pendentes de Envio */}
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 shadow-xs flex items-center justify-between bg-rose-50/20 dark:bg-rose-950/10">
            <div>
              <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Pendentes de Envio</p>
              <h3 className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-0.5 font-mono">
                {meta.pendentes}
              </h3>
            </div>
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800">
              <FileClock className="h-6 w-6" />
            </div>
          </div>

          {/* Card 4: % de Cobertura */}
          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-4 shadow-xs flex items-center justify-between bg-indigo-50/20 dark:bg-indigo-950/10">
            <div>
              <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">% Cobertura Patrimônio</p>
              <h3 className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5 font-mono">
                {meta.percentual}%
              </h3>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <PieChart className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Workspace controls & Filters panel */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          {/* Quick search input */}
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por TOTVS, Nome da Igreja, Município ou Responsável..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Filters Select Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter 1: Estado (UF) */}
            <select
              value={filterEstado}
              onChange={(e) => {
                setFilterEstado(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Estado (UF): Todos</option>
              {ESTADOS_BR.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>

            {/* Filter 2: Porte da Igreja */}
            <select
              value={filterPorte}
              onChange={(e) => {
                setFilterPorte(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Porte da Igreja: Todos</option>
              {PORTES_IGREJA.map((porte) => (
                <option key={porte} value={porte}>{porte}</option>
              ))}
            </select>

            {/* Filter 3: Status do Relatório */}
            <select
              value={filterStatusEnvio}
              onChange={(e) => {
                setFilterStatusEnvio(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Status: Todos</option>
              <option value="ENVIADO">✅ Entregues (Recebidos)</option>
              <option value="PENDENTE">🚨 Faltantes (Pendentes)</option>
            </select>

            <span className="text-xs font-bold text-zinc-600 dark:text-slate-300 bg-zinc-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-zinc-200 dark:border-slate-700 shrink-0">
              {meta.total} registros
            </span>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl">
            <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="font-bold text-zinc-800 dark:text-white">Carregando painel de patrimônio...</h3>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl text-center px-4">
            <Package className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="font-bold text-zinc-800 dark:text-white">Nenhum registro encontrado</h3>
            <p className="text-xs text-zinc-500 mt-1">
              {searchTerm ? `Nenhum resultado com base na sua pesquisa "${searchTerm}".` : 'Nenhuma igreja encontrada com os filtros selecionados.'}
            </p>
          </div>
        ) : (
          /* Table Layout strictly matching rules */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-slate-800/50 text-zinc-500 dark:text-slate-400 font-bold border-b border-zinc-150 dark:border-slate-800 uppercase tracking-wider">
                    <th className="p-4">TOTVS</th>
                    <th className="p-4">Igreja / Sede Superior</th>
                    <th className="p-4">Contato (Dirigente)</th>
                    <th className="p-4">Status de Envio</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-slate-800 font-medium">
                  {items.map((item) => {
                    const isEnviado = Boolean(item.submissao_id);
                    const rawDate = item.data_envio || item.criado_em;
                    const waUrl = formatWhatsAppUrl(item.dirigente_telefone);

                    return (
                      <tr key={item.codigo_totvs} className="hover:bg-zinc-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        {/* TOTVS */}
                        <td className="p-4 font-mono font-bold text-zinc-800 dark:text-slate-200">
                          {item.codigo_totvs}
                        </td>

                        {/* Igreja / Sede Superior */}
                        <td className="p-4">
                          <div className="font-bold text-zinc-950 dark:text-white text-sm">
                            {item.desc_igreja}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {item.municipio && (
                              <span className="text-[10px] text-zinc-500 dark:text-slate-400 font-semibold">
                                📍 {item.municipio}{item.estado ? ` - ${item.estado}` : ''}
                              </span>
                            )}
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-zinc-100 dark:bg-slate-800 text-zinc-600 dark:text-slate-300 border-zinc-200 dark:border-slate-700">
                              🏛️ Sede Pai: {item.codigo_totvs_pai || 'Nenhuma (SEDE)'}
                            </span>
                          </div>
                        </td>

                        {/* Contato (Dirigente) */}
                        <td className="p-4">
                          {item.dirigente_nome ? (
                            <div className="space-y-1">
                              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                <span>{item.dirigente_nome}</span>
                              </div>
                              {waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors"
                                >
                                  <MessageSquare className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>{item.dirigente_telefone}</span>
                                  <ExternalLink className="h-2.5 w-2.5 opacity-60 ml-0.5" />
                                </a>
                              ) : item.dirigente_telefone ? (
                                <div className="text-[10px] text-zinc-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                                  <Phone className="h-3 w-3" />
                                  <span>{item.dirigente_telefone}</span>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                              ⚠️ Sem contato - Acionar Sede
                            </span>
                          )}
                        </td>

                        {/* Status de Envio */}
                        <td className="p-4">
                          {isEnviado ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Recebido</span>
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500 dark:text-slate-400 pl-1">
                                📅 {formatDate(rawDate)}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="p-4 text-center">
                          {isEnviado ? (
                            <button
                              onClick={() => handleOpenDetails(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Ver Detalhes</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium text-zinc-400 dark:text-slate-600 italic">
                              Sem envio
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div className="p-4 bg-zinc-50 dark:bg-slate-800/50 border-t border-zinc-150 dark:border-slate-800 flex items-center justify-between shrink-0">
                <span className="text-xs text-zinc-500 dark:text-slate-400 font-semibold font-mono">
                  Página {currentPage} de {meta.totalPages} ({meta.total} registros)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1 || loading || isSyncing}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Anterior</span>
                  </button>
                  <button
                    disabled={currentPage >= meta.totalPages || loading || isSyncing}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, meta.totalPages))}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>Próxima</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 🔍 Modal: Detalhes do Relatório de Patrimônio */}
      <PatrimonioDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        submissao={selectedSubmissao}
      />
    </div>
  );
}
