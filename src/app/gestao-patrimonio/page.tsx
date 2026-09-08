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
} from 'lucide-react';
import PatrimonioDetailModal from '@/components/PatrimonioDetailModal';

export interface PatrimonioSubmissao {
  id: string;
  codigo_totvs: string;
  desc_igreja?: string | null;
  municipio?: string | null;
  nome_responsavel?: string | null;
  telefone_responsavel?: string | null;
  ano_referencia?: number | string | null;
  data_envio?: string | null;
  criado_em?: string | null;
  created_at?: string | null;
}

export interface PatrimonioItem {
  id: string;
  submissao_id?: string;
  item_nome?: string;
  item?: string;
  nome_item?: string;
  descricao?: string;
  quantidade?: number | string;
  qtd?: number | string;
  possui?: string;
  conservacao?: string;
  estado_conservacao?: string;
  estado?: string;
}

export default function GestaoPatrimonioPage() {
  const [submissoes, setSubmissoes] = useState<PatrimonioSubmissao[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Search input with 400ms debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Metadata
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Modal / Detail states
  const [selectedSubmissao, setSelectedSubmissao] = useState<PatrimonioSubmissao | null>(null);
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

  // Fetch Patrimonio List
  const fetchSubmissoesList = async () => {
    if (!submissoes.length) setLoading(true);
    else setIsSyncing(true);

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/patrimonio/lista?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setSubmissoes(json.data || []);
        if (json.meta) {
          setMeta({
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
    fetchSubmissoesList();
  }, [currentPage, searchTerm]);

  // Open Details Modal
  const handleOpenDetails = (sub: PatrimonioSubmissao) => {
    setSelectedSubmissao(sub);
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 flex flex-col font-sans text-zinc-900 dark:text-slate-100 transition-colors duration-200">
      <Toaster position="top-right" richColors closeButton />

      {/* Header Mirror */}
      <header className="relative z-[9999] h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 sticky top-0 shadow-xs flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
          <div className="flex items-center space-x-3 shrink-0">
            <img src="/img/logo.png" alt="IPDA" className="h-10 w-auto object-contain shadow-sm" />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                GEO-VALIG IPDA <span className="text-[10px] bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-slate-700 font-bold">PATRIMÔNIO</span>
              </h1>
              <p className="text-[9px] text-zinc-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Gestão de Relatórios de Patrimônio</p>
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

            {/* Item 2: Validação & Gestão Dropdown (Hide for viewers) */}
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
                    🪑 Patrimônio
                  </a>
                </div>
              </div>
            )}

            {/* Item 3: Inteligência & BI Dropdown */}
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
              onClick={fetchSubmissoesList}
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
        {/* Workspace controls panel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          {/* Quick search input */}
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por TOTVS ou Nome da Igreja..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-slate-700">
              🪑 {meta.total} {meta.total === 1 ? 'relatório de patrimônio' : 'relatórios de patrimônio'} recebidos
            </span>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl">
            <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="font-bold text-zinc-800 dark:text-white">Carregando relatórios de patrimônio...</h3>
          </div>
        ) : submissoes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl text-center px-4">
            <Package className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="font-bold text-zinc-800 dark:text-white">Nenhum relatório de patrimônio encontrado</h3>
            <p className="text-xs text-zinc-500 mt-1">
              {searchTerm ? `Nenhum resultado com base na sua pesquisa "${searchTerm}".` : 'Nenhum envio registrado no sistema.'}
            </p>
          </div>
        ) : (
          /* Table Layout */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-slate-800/50 text-zinc-500 dark:text-slate-400 font-bold border-b border-zinc-150 dark:border-slate-800 uppercase tracking-wider">
                    <th className="p-4">TOTVS</th>
                    <th className="p-4">Igreja</th>
                    <th className="p-4">Responsável</th>
                    <th className="p-4">Telefone</th>
                    <th className="p-4">Data de Envio</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-slate-800 font-medium">
                  {submissoes.map((sub) => {
                    const rawDate = sub.data_envio || sub.criado_em || sub.created_at;

                    return (
                      <tr key={sub.id} className="hover:bg-zinc-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-zinc-800 dark:text-slate-200">
                          {sub.codigo_totvs}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-zinc-950 dark:text-white text-sm">
                            {sub.desc_igreja || `Igreja TOTVS ${sub.codigo_totvs}`}
                          </div>
                          {sub.municipio && (
                            <div className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium mt-0.5">
                              📍 {sub.municipio}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span>{sub.nome_responsavel || '---'}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-zinc-650 dark:text-slate-350">
                          {sub.telefone_responsavel ? (
                            <div className="flex items-center gap-1 text-zinc-700 dark:text-slate-300">
                              <Phone className="h-3 w-3 text-zinc-400 shrink-0" />
                              <span>{sub.telefone_responsavel}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400">---</span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-zinc-650 dark:text-slate-350">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-zinc-400 shrink-0" />
                            <span>{formatDate(rawDate)}</span>
                          </div>
                          {sub.ano_referencia && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                              Ref: {sub.ano_referencia}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOpenDetails(sub)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 rounded-lg transition-colors shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Ver Detalhes</span>
                          </button>
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
