'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Building2,
  Users,
  Zap,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Filter,
  RefreshCw,
  Power,
  ChevronRight,
  UserCheck,
  Award,
  Layers,
  MapPin,
  Search,
} from 'lucide-react';

interface ReportData {
  success: boolean;
  kpis: {
    total_igrejas: number;
    total_membros: number;
    total_jovens: number;
    pct_jovens: number;
    total_prebendados: number;
    total_voluntarios: number;
  };
  porte_breakdown: Array<{
    name: string;
    porte: string;
    value: number;
    color: string;
  }>;
  uf_breakdown: Array<{
    estado: string;
    membros: number;
    jovens: number;
    igrejas: number;
  }>;
  estaduais_summary: Array<{
    codigo_totvs: string;
    desc_igreja: string;
    estado: string;
    municipio: string;
    qtd_congregacoes: number;
    total_membros: number;
    total_jovens: number;
    prebendados: number;
    voluntarios: number;
  }>;
  estaduais_options: Array<{
    codigo_totvs: string;
    desc_igreja: string;
    estado: string;
    municipio: string;
  }>;
}

const REGIOES = [
  { value: 'ALL', label: 'Todas as Regiões' },
  { value: 'Norte', label: 'Norte' },
  { value: 'Nordeste', label: 'Nordeste' },
  { value: 'Centro-Oeste', label: 'Centro-Oeste' },
  { value: 'Sudeste', label: 'Sudeste' },
  { value: 'Sul', label: 'Sul' },
];

const ESTADOS = [
  'ALL',
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

export default function RelatoriosPage() {
  const router = useRouter();

  // Filters state
  const [filterRegiao, setFilterRegiao] = useState<string>('ALL');
  const [filterEstado, setFilterEstado] = useState<string>('ALL');
  const [filterEstadual, setFilterEstadual] = useState<string>('ALL');
  const [filterCondicao, setFilterCondicao] = useState<string>('ALL');

  // Report Data
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);

  // Search filter for summary table
  const [tableSearch, setTableSearch] = useState<string>('');

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRegiao !== 'ALL') params.set('regiao', filterRegiao);
      if (filterEstado !== 'ALL') params.set('estado', filterEstado);
      if (filterEstadual !== 'ALL') params.set('estadual', filterEstadual);
      if (filterCondicao !== 'ALL') params.set('condicao_pastoral', filterCondicao);
      params.set('t', Date.now().toString());

      const res = await fetch(`/api/igrejas/relatorio-hierarquia?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setData(json);
      } else {
        toast.error(json.error || 'Erro ao carregar relatório.');
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      toast.error('Erro de conexão ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  }, [filterRegiao, filterEstado, filterEstadual, filterCondicao]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleSyncPublicMap = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const resData = await res.json();
      if (resData.revalidated) {
        toast.success('Cache revalidado com sucesso!');
        await fetchReportData();
      } else {
        toast.error('Erro ao revalidar cache.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao sincronizar.');
    } finally {
      setSyncLoading(false);
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

  const handleExportXLSX = () => {
    if (!data) return;

    // Sheet 1: KPIs & Metrics
    const kpisSheetData = [
      { Métrica: 'Total de Igrejas no Campo', Valor: data.kpis.total_igrejas },
      { Métrica: 'Total de Membros', Valor: data.kpis.total_membros },
      { Métrica: 'Total de Jovens', Valor: data.kpis.total_jovens },
      { Métrica: '% Jovens no Campo', Valor: `${data.kpis.pct_jovens}%` },
      { Métrica: 'Pastores Prebendados', Valor: data.kpis.total_prebendados },
      { Métrica: 'Pastores Voluntários', Valor: data.kpis.total_voluntarios },
    ];

    // Sheet 2: Summary by Estadual
    const estaduaisSheetData = data.estaduais_summary.map((est) => ({
      'Código TOTVS': est.codigo_totvs,
      'Sede Estadual': est.desc_igreja,
      'Município': est.municipio,
      'UF': est.estado,
      'Congregações Ligadas': est.qtd_congregacoes,
      'Total Membros': est.total_membros,
      'Total Jovens': est.total_jovens,
      'Pastores Prebendados': est.prebendados,
      'Pastores Voluntários': est.voluntarios,
    }));

    // Sheet 3: Breakdown by UF
    const ufSheetData = data.uf_breakdown.map((uf) => ({
      UF: uf.estado,
      'Igrejas Ativas': uf.igrejas,
      'Total Membros': uf.membros,
      'Total Jovens': uf.jovens,
      '% Jovens': uf.membros > 0 ? `${((uf.jovens / uf.membros) * 100).toFixed(1)}%` : '0%',
    }));

    const workbook = XLSX.utils.book_new();

    const sheet1 = XLSX.utils.json_to_sheet(kpisSheetData);
    const sheet2 = XLSX.utils.json_to_sheet(estaduaisSheetData);
    const sheet3 = XLSX.utils.json_to_sheet(ufSheetData);

    XLSX.utils.book_append_sheet(workbook, sheet1, 'Resumo Geral');
    XLSX.utils.book_append_sheet(workbook, sheet2, 'Estaduais e Congregações');
    XLSX.utils.book_append_sheet(workbook, sheet3, 'Análise por Estado (UF)');

    XLSX.writeFile(workbook, `relatorio_hierarquia_membresia_ipda_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Planilha XLSX exportada com sucesso!');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Filtered summary table
  const filteredEstaduaisSummary = useMemo(() => {
    if (!data) return [];
    const term = tableSearch.trim().toLowerCase();
    if (!term) return data.estaduais_summary;

    return data.estaduais_summary.filter(
      (est) =>
        est.desc_igreja.toLowerCase().includes(term) ||
        est.codigo_totvs.toLowerCase().includes(term) ||
        est.municipio.toLowerCase().includes(term) ||
        est.estado.toLowerCase().includes(term)
    );
  }, [data, tableSearch]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 flex flex-col font-sans text-zinc-900 dark:text-slate-100 transition-colors duration-200">
      <Toaster position="top-right" richColors closeButton />

      {/* Printable Official Header (Only visible on print) */}
      <div className="hidden print:block mb-6 text-center border-b-2 border-indigo-900 pb-4">
        <div className="flex items-center justify-between">
          <img src="/img/logo.png" alt="IPDA Logo" className="h-12 w-auto object-contain" />
          <div className="text-right">
            <h1 className="text-xl font-black text-indigo-950">GEO-VALIG IPDA</h1>
            <p className="text-xs font-bold text-zinc-600">RELATÓRIO HIERÁRQUICO, MEMBRESIA & BI</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5" suppressHydrationWarning>
              Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Application Restricted Area Header (Hidden on print) */}
      <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 sticky top-0 z-[1001] shadow-xs transition-colors duration-200 flex items-center print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
          <div className="flex items-center space-x-3 shrink-0">
            <img src="/img/logo.png" alt="GEO-VALIG IPDA" className="h-10 w-auto object-contain shadow-sm" />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                GEO-VALIG IPDA <span className="text-[10px] bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-slate-700 font-bold">BI</span>
              </h1>
              <p className="text-[9px] text-zinc-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Relatórios & Inteligência de Dados</p>
            </div>
          </div>

          {/* Unified Navigation Layout */}
          <div className="flex bg-zinc-100 dark:bg-slate-800 p-1 rounded-xl border border-zinc-200 dark:border-slate-700 gap-0.5 items-center">
            <a
              href="/"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50"
            >
              <span>🗺️ Mapa Geral</span>
            </a>

            <a
              href="/validacao?tab=validation"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50"
            >
              <span>📍 Validação</span>
            </a>

            <a
              href="/coligacoes"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50"
            >
              <span>🌳 Coligações</span>
            </a>

            <a
              href="/gestao"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50"
            >
              <span>👥 Gestão</span>
            </a>

            <a
              href="/validacao?tab=dashboard"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50"
            >
              <span>📊 Dashboard</span>
            </a>

            <button
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 bg-white dark:bg-slate-750 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/50 dark:border-slate-650 font-bold"
            >
              <span>📊 Relatórios</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncPublicMap}
              disabled={syncLoading}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full transition-all flex items-center justify-center min-w-[36px]"
              title="Sincronizar dados e recarregar cache"
            >
              <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
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

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Painel de Filtros Avançados (Hidden on print) */}
        <section className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Painel de Filtros Avançados
              </h2>
              <p className="text-xs text-zinc-500 dark:text-slate-400 font-medium">
                Combine região, estado, sede estadual e condição pastoral para cruzar dados de membresia.
              </p>
            </div>

            {/* Action Export Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportXLSX}
                disabled={loading || !data}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>📥 Exportar XLSX</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPDF}
                disabled={loading || !data}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>📄 Exportar Relatório PDF / Imprimir</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filter 1: Região */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 dark:text-slate-400 uppercase tracking-wider block">
                Região
              </label>
              <select
                value={filterRegiao}
                onChange={(e) => {
                  setFilterRegiao(e.target.value);
                  setFilterEstado('ALL');
                  setFilterEstadual('ALL');
                }}
                className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-100 text-xs rounded-xl p-2.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {REGIOES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 2: Estado (UF) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 dark:text-slate-400 uppercase tracking-wider block">
                Estado (UF)
              </label>
              <select
                value={filterEstado}
                onChange={(e) => {
                  setFilterEstado(e.target.value);
                  setFilterEstadual('ALL');
                }}
                className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-100 text-xs rounded-xl p-2.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Todos os Estados</option>
                {ESTADOS.filter((st) => st !== 'ALL').map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 3: Sede Pai / Estadual */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 dark:text-slate-400 uppercase tracking-wider block">
                Sede Pai / Estadual
              </label>
              <select
                value={filterEstadual}
                onChange={(e) => setFilterEstadual(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-100 text-xs rounded-xl p-2.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Todas as Estaduais do Campo</option>
                {data?.estaduais_options?.map((e) => (
                  <option key={e.codigo_totvs} value={e.codigo_totvs}>
                    {e.desc_igreja} ({e.estado})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 4: Condição Pastoral */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 dark:text-slate-400 uppercase tracking-wider block">
                Condição Pastoral
              </label>
              <select
                value={filterCondicao}
                onChange={(e) => setFilterCondicao(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-100 text-xs rounded-xl p-2.5 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Todas (Prebendadas e Voluntárias)</option>
                <option value="PREBENDADA">💼 Apenas Prebendadas (Salariadas)</option>
                <option value="NAO_PREBENDADA">🤝 Apenas Voluntárias (Sem Prebenda)</option>
              </select>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <RefreshCw className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="font-extrabold text-zinc-800 dark:text-white">Gerando relatório BI e agregando hierarquia...</h3>
            <p className="text-xs text-zinc-500 mt-1">Recuperando e estruturando dados de membresia em tempo real.</p>
          </div>
        ) : !data ? (
          <div className="text-center py-20 bg-white border rounded-2xl">
            <p className="text-xs text-zinc-500">Erro ao carregar dados do relatório.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top KPI Cards (4 Grid Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Total Igrejas */}
              <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 dark:text-slate-400 uppercase tracking-wider">Total de Igrejas</p>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1 font-mono">
                      {data.kpis.total_igrejas.toLocaleString('pt-BR')}
                    </h3>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-slate-800 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                  <span>🏛️ Na malha ativa do campo</span>
                </p>
              </div>

              {/* KPI 2: Total Membros */}
              <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 dark:text-slate-400 uppercase tracking-wider">Total de Membros</p>
                    <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                      {data.kpis.total_membros.toLocaleString('pt-BR')}
                    </h3>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-slate-800 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                  <span>👥 Somatório consolidado do filtro</span>
                </p>
              </div>

              {/* KPI 3: Total Jovens */}
              <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 dark:text-slate-400 uppercase tracking-wider">Total de Jovens</p>
                    <h3 className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1 font-mono">
                      {data.kpis.total_jovens.toLocaleString('pt-BR')}
                    </h3>
                  </div>
                  <div className="p-3 bg-cyan-50 dark:bg-slate-800 rounded-xl text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-slate-700">
                    <Zap className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                  <span>⚡ Força jovem na mocidade</span>
                </p>
              </div>

              {/* KPI 4: % Jovens no Campo */}
              <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 dark:text-slate-400 uppercase tracking-wider">% Jovens no Campo</p>
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                      {data.kpis.pct_jovens}%
                    </h3>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-slate-800 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-slate-700">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                  <span>💼 Prebendados: {data.kpis.total_prebendados} | 🤝 Voluntários: {data.kpis.total_voluntarios}</span>
                </p>
              </div>
            </div>

            {/* Charts Section (2 Columns Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:space-y-6">
              {/* Chart 1: BarChart (Comparativo Membros e Jovens por UF) - 7 cols */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-zinc-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      📊 Comparativo de Membros e Jovens por UF
                    </h3>
                    <p className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium">
                      Distribuição quantitativa por estado geográfico.
                    </p>
                  </div>
                </div>

                <div className="h-[320px] w-full">
                  {data.uf_breakdown.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-400 italic">
                      Sem dados comparativos para esta seleção.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.uf_breakdown}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="estado" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Bar dataKey="membros" name="Total Membros" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="jovens" name="Total Jovens" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: PieChart (Distribuição por Porte) - 5 cols */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-zinc-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      🍕 Distribuição por Porte
                    </h3>
                    <p className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium">
                      Proporção de igrejas por classificação hierárquica.
                    </p>
                  </div>
                </div>

                <div className="h-[320px] w-full flex items-center justify-center">
                  {data.porte_breakdown.length === 0 ? (
                    <div className="text-xs text-zinc-400 italic">Sem registros no filtro.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.porte_breakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {data.porte_breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Synthetic Table */}
            <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-zinc-50/50 dark:bg-slate-800/40 border-b border-zinc-150 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    🏛️ Tabela Sintética Detalhada por Estadual
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium">
                    Listagem consolidada das Sedes Estaduais, congregações ligadas e pastores prebendados/voluntários.
                  </p>
                </div>

                {/* Table search filter */}
                <div className="relative w-full sm:w-64 print:hidden">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filtrar nesta tabela..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-slate-800 text-zinc-500 dark:text-slate-400 font-black border-b border-zinc-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Código</th>
                      <th className="p-3.5">Sede Estadual</th>
                      <th className="p-3.5">UF / Município</th>
                      <th className="p-3.5 text-center">Congregações</th>
                      <th className="p-3.5 text-right">Total Membros</th>
                      <th className="p-3.5 text-right">Total Jovens</th>
                      <th className="p-3.5 text-center">Prebendados</th>
                      <th className="p-3.5 text-center">Voluntários</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-slate-800 font-medium">
                    {filteredEstaduaisSummary.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-zinc-400 italic">
                          Nenhuma sede estadual encontrada com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      filteredEstaduaisSummary.map((row) => (
                        <tr key={row.codigo_totvs} className="hover:bg-zinc-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-zinc-700 dark:text-slate-300">
                            {row.codigo_totvs}
                          </td>
                          <td className="p-3.5 font-bold text-zinc-950 dark:text-white">
                            {row.desc_igreja}
                          </td>
                          <td className="p-3.5 text-zinc-600 dark:text-slate-400 font-semibold">
                            {row.estado} - {row.municipio}
                          </td>
                          <td className="p-3.5 text-center font-bold">
                            <span className="bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-slate-700 text-[11px]">
                              🏛️ {row.qtd_congregacoes}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-black font-mono text-indigo-600 dark:text-indigo-400">
                            {row.total_membros.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3.5 text-right font-black font-mono text-cyan-600 dark:text-cyan-400">
                            {row.total_jovens.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                              💼 {row.prebendados}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold text-[10px] border border-zinc-200 dark:border-slate-700">
                              🤝 {row.voluntarios}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
