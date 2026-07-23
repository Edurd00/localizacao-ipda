'use client';

import React, { useMemo, useState } from 'react';
import { Igreja } from '@/lib/db';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  HelpCircle,
  Download,
  Building2,
  MapPin,
  TrendingUp,
  Search,
  Zap,
  Loader2,
  ArrowRight,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DashboardViewProps {
  igrejas: Igreja[];
  states: string[];
  onSelectStateAndSwitch: (uf: string) => void;
  onSelectStatusAndSwitch: (status: string) => void;
  onBatchAutoGeocode: () => void;
  batchLoading: boolean;
  batchProgress: { current: number; total: number } | null;
}

export default function DashboardView({
  igrejas,
  states,
  onSelectStateAndSwitch,
  onSelectStatusAndSwitch,
  onBatchAutoGeocode,
  batchLoading,
  batchProgress,
}: DashboardViewProps) {
  const [filterStateSearch, setFilterStateSearch] = useState('');
  const [exportFilter, setExportFilter] = useState<'ALL' | 'VALIDADO' | 'PENDENTE' | 'DUVIDA'>('VALIDADO');

  // Overall KPIs calculation
  const totalCount = igrejas.length;
  const validadasCount = useMemo(() => igrejas.filter((i) => i.status === 'VALIDADO').length, [igrejas]);
  const pendentesCount = useMemo(() => igrejas.filter((i) => i.status === 'PENDENTE').length, [igrejas]);
  const duvidasCount = useMemo(() => igrejas.filter((i) => i.status === 'DUVIDA').length, [igrejas]);

  const validadasPct = totalCount > 0 ? ((validadasCount / totalCount) * 100).toFixed(1) : '0.0';
  const pendentesPct = totalCount > 0 ? ((pendentesCount / totalCount) * 100).toFixed(1) : '0.0';
  const duvidasPct = totalCount > 0 ? ((duvidasCount / totalCount) * 100).toFixed(1) : '0.0';

  // Per State Metrics Calculation
  const stateMetrics = useMemo(() => {
    const map = new Map<
      string,
      { uf: string; total: number; validadas: number; pendentes: number; duvidas: number }
    >();

    igrejas.forEach((ig) => {
      const uf = ig.estado || 'Outros';
      if (!map.has(uf)) {
        map.set(uf, { uf, total: 0, validadas: 0, pendentes: 0, duvidas: 0 });
      }
      const item = map.get(uf)!;
      item.total += 1;
      if (ig.status === 'VALIDADO') item.validadas += 1;
      else if (ig.status === 'DUVIDA') item.duvidas += 1;
      else item.pendentes += 1;
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.total - a.total);
    return list;
  }, [igrejas]);

  const filteredStateMetrics = useMemo(() => {
    if (!filterStateSearch.trim()) return stateMetrics;
    const term = filterStateSearch.trim().toLowerCase();
    return stateMetrics.filter((s) => s.uf.toLowerCase().includes(term));
  }, [stateMetrics, filterStateSearch]);

  // Export to Excel handler
  const handleExportExcel = () => {
    let listToExport = igrejas;
    let fileNameSuffix = 'todas';

    if (exportFilter === 'VALIDADO') {
      listToExport = igrejas.filter((i) => i.status === 'VALIDADO');
      fileNameSuffix = 'validadas';
    } else if (exportFilter === 'PENDENTE') {
      listToExport = igrejas.filter((i) => i.status === 'PENDENTE');
      fileNameSuffix = 'pendentes';
    } else if (exportFilter === 'DUVIDA') {
      listToExport = igrejas.filter((i) => i.status === 'DUVIDA');
      fileNameSuffix = 'duvidas';
    }

    if (listToExport.length === 0) {
      alert('Nenhum registro encontrado para exportar com o filtro selecionado.');
      return;
    }

    const rows = listToExport.map((ig) => ({
      'Código TOTVS': ig.codigo_totvs,
      'Descrição Igreja': ig.desc_igreja,
      'Tipo Imóvel': ig.tipo_imovel || '',
      'Endereço': ig.endereco || '',
      'Bairro': ig.bairro || '',
      'Município': ig.municipio || '',
      'Estado (UF)': ig.estado || '',
      'CEP': ig.cep || '',
      'Latitude': ig.latitude !== null ? ig.latitude : '',
      'Longitude': ig.longitude !== null ? ig.longitude : '',
      'Status': ig.status,
      'Operador Validador': ig.usuario_validador || '',
      'Link Google Maps': ig.link_google_maps || (ig.latitude ? `https://www.google.com/maps?q=${ig.latitude},${ig.longitude}` : ''),
      'Última Atualização': ig.updated_at || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Igrejas IPDA');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Localizacao_IPDA_Relatorio_${fileNameSuffix}_${dateStr}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <span>Painel de Indicadores e Gestão Global</span>
          </div>
          <h2 className="text-2xl font-black mt-1 tracking-tight text-white">
            Dashboard de Geolocalização IPDA
          </h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl leading-relaxed opacity-90">
            Acompanhe o progresso de validação das 12.000+ igrejas por estado, exporte relatórios consolidados e gerencie o processo de geocodificação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={onBatchAutoGeocode}
            disabled={batchLoading || totalCount === 0}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            {batchLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Localizando ({batchProgress?.current}/{batchProgress?.total})...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-zinc-950" />
                <span>Auto-Localizar Pendentes</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 shadow flex items-center space-x-2 transition-all shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Churches */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total de Igrejas</p>
              <h3 className="text-3xl font-black text-zinc-900 mt-1">{totalCount.toLocaleString('pt-BR')}</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-between items-center text-xs text-zinc-500">
            <span>Cadastradas no sistema</span>
            <span className="font-semibold text-zinc-800">100%</span>
          </div>
        </div>

        {/* Validated */}
        <div
          onClick={() => onSelectStatusAndSwitch('VALIDADO')}
          className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Igrejas Validadas</p>
              <h3 className="text-3xl font-black text-emerald-700 mt-1">{validadasCount.toLocaleString('pt-BR')}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-100 flex justify-between items-center text-xs">
            <span className="text-emerald-700 font-medium group-hover:underline flex items-center gap-1">
              Filtrar no painel <ArrowRight className="h-3 w-3" />
            </span>
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {validadasPct}%
            </span>
          </div>
        </div>

        {/* Pending */}
        <div
          onClick={() => onSelectStatusAndSwitch('PENDENTE')}
          className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pendentes de Validação</p>
              <h3 className="text-3xl font-black text-amber-700 mt-1">{pendentesCount.toLocaleString('pt-BR')}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-100 flex justify-between items-center text-xs">
            <span className="text-amber-700 font-medium group-hover:underline flex items-center gap-1">
              Filtrar no painel <ArrowRight className="h-3 w-3" />
            </span>
            <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {pendentesPct}%
            </span>
          </div>
        </div>

        {/* In Doubt */}
        <div
          onClick={() => onSelectStatusAndSwitch('DUVIDA')}
          className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Com Dúvida / Revisar</p>
              <h3 className="text-3xl font-black text-rose-700 mt-1">{duvidasCount.toLocaleString('pt-BR')}</h3>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
              <HelpCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-rose-100 flex justify-between items-center text-xs">
            <span className="text-rose-700 font-medium group-hover:underline flex items-center gap-1">
              Filtrar no painel <ArrowRight className="h-3 w-3" />
            </span>
            <span className="font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {duvidasPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Global Progress Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Evolução Global do Mapeamento
            </h3>
          </div>
          <span className="text-sm font-black text-indigo-600 font-mono">{validadasPct}% Concluído</span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full bg-zinc-100 rounded-full h-4 overflow-hidden p-0.5 border border-zinc-200 flex">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-inner"
            style={{ width: `${validadasPct}%` }}
            title={`Validadas: ${validadasCount}`}
          />
          <div
            className="bg-rose-400 h-full transition-all duration-500"
            style={{ width: `${duvidasPct}%` }}
            title={`Dúvidas: ${duvidasCount}`}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-zinc-500 pt-1 font-medium">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Validadas ({validadasCount})
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Pendentes ({pendentesCount})
            </span>
            <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> Dúvidas ({duvidasCount})
            </span>
          </div>
          <span>Total: {totalCount} igrejas</span>
        </div>
      </div>

      {/* State Summary Table (UF Metrics) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-zinc-100">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-600" />
              Desempenho por Estado (UF)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Clique em qualquer estado para filtrar instantaneamente no painel de validação
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            {/* Search state input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Filtrar por UF (ex: SP, BA)..."
                value={filterStateSearch}
                onChange={(e) => setFilterStateSearch(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-800 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Export Filter Selector */}
            <div className="flex items-center space-x-1 shrink-0">
              <label className="text-xs text-zinc-500 font-semibold hidden sm:inline">Exportar:</label>
              <select
                value={exportFilter}
                onChange={(e) => setExportFilter(e.target.value as any)}
                className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs rounded-xl p-2 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="VALIDADO">Apenas Validadas</option>
                <option value="PENDENTE">Apenas Pendentes</option>
                <option value="DUVIDA">Apenas Dúvidas</option>
                <option value="ALL">Todas as Igrejas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-200">
              <tr>
                <th className="p-3">Estado (UF)</th>
                <th className="p-3 text-center">Total Igrejas</th>
                <th className="p-3 text-center">Validadas</th>
                <th className="p-3 text-center">Pendentes</th>
                <th className="p-3 text-center">Dúvidas</th>
                <th className="p-3 text-right">% Progresso</th>
                <th className="p-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredStateMetrics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-zinc-400 italic">
                    Nenhum estado encontrado com o filtro informado.
                  </td>
                </tr>
              ) : (
                filteredStateMetrics.map((st) => {
                  const pct = st.total > 0 ? ((st.validadas / st.total) * 100).toFixed(1) : '0.0';
                  return (
                    <tr
                      key={st.uf}
                      onClick={() => onSelectStateAndSwitch(st.uf)}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="p-3 font-bold text-zinc-900 flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono text-xs">
                          {st.uf}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-zinc-800">{st.total}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600">{st.validadas}</td>
                      <td className="p-3 text-center font-mono font-medium text-amber-600">{st.pendentes}</td>
                      <td className="p-3 text-center font-mono font-medium text-rose-600">{st.duvidas}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-20 bg-zinc-100 rounded-full h-2 overflow-hidden border border-zinc-200">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-zinc-800 w-12">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center space-x-1 text-[11px] text-indigo-600 font-semibold group-hover:underline">
                          <span>Validar UF</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
