'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  MapPin,
  X,
  Search,
  ArrowLeft,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import type { Igreja } from '@/lib/db';
import { Toaster, toast } from 'sonner';

// Precise official colors mapping (high-contrast values matching the Map visualization)
const PORTE_INFO: Record<string, { name: string; color: string; label: string }> = {
  ESTADUAL: { name: 'ESTADUAL', color: '#8CAEE0', label: 'Estadual (Azul Claro)' },
  SETORIAL: { name: 'SETORIAL', color: '#FFFF00', label: 'Setorial (Amarelo)' },
  CENTRAL: { name: 'CENTRAL', color: '#F4A27E', label: 'Central (Laranja/Salmão)' },
  REGIONAL: { name: 'REGIONAL', color: '#A2C898', label: 'Regional (Verde Oliva Soft)' },
  LOCAL: { name: 'LOCAL', color: '#A6A6A6', label: 'Local (Cinza)' },
  'CASA DE ORAÇÃO': { name: 'CASA DE ORAÇÃO', color: '#D8A2C8', label: 'Casa de Oração (Rosa Pastel)' },
  'ALDEIA INDIGENA': { name: 'ALDEIA INDIGENA', color: '#00FFFF', label: 'Aldeia Indígena (Ciano)' },
};

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

export default function OrganizacaoPage() {
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const [churches, setChurches] = useState<Igreja[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingChurches, setLoadingChurches] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Load available distinct states on mount
  useEffect(() => {
    async function loadStates() {
      try {
        const res = await fetch('/api/organizacao');
        const data = await res.json();
        if (data.success) {
          setStates(data.states || []);
        } else {
          toast.error('Erro ao carregar estados disponíveis.');
        }
      } catch (err) {
        console.error('Error fetching states:', err);
        toast.error('Erro de conexão com o servidor.');
      } finally {
        setLoadingStates(false);
      }
    }
    loadStates();
  }, []);

  // Fetch churches when selected state changes
  useEffect(() => {
    if (!selectedState) {
      setChurches([]);
      setExpandedNodes(new Set());
      return;
    }

    async function loadChurches() {
      setLoadingChurches(true);
      setSearchTerm('');
      setExpandedNodes(new Set());
      try {
        const res = await fetch(`/api/organizacao?estado=${selectedState}`);
        const data = await res.json();
        if (data.success) {
          setChurches(data.churches || []);
          // Automatically expand all State/root nodes by default to make navigation easy
          const roots = (data.churches || []).filter((ig: Igreja) => {
            const isEstadual = ig.desc_igreja.toUpperCase().includes('ESTADUAL');
            if (isEstadual) return true;
            if (!ig.codigo_totvs_pai) return true;
            const parentExists = (data.churches || []).some(
              (p: Igreja) => p.codigo_totvs === ig.codigo_totvs_pai
            );
            return !parentExists;
          });
          const initialExpanded = new Set<string>();
          roots.forEach((root: Igreja) => initialExpanded.add(root.codigo_totvs));
          setExpandedNodes(initialExpanded);
        } else {
          toast.error('Erro ao carregar as igrejas para o estado selecionado.');
        }
      } catch (err) {
        console.error('Error fetching churches:', err);
        toast.error('Erro de conexão ao carregar as igrejas.');
      } finally {
        setLoadingChurches(false);
      }
    }
    loadChurches();
  }, [selectedState]);

  // Expand/collapse single tree node
  const toggleNode = (nodeId: string) => {
    const newSet = new Set(expandedNodes);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    setExpandedNodes(newSet);
  };

  // Helper: Find all daughters/children of a parent node
  const getChildrenOf = (parentCode: string) => {
    return churches.filter((ig) => ig.codigo_totvs_pai === parentCode);
  };

  // Compute matching nodes for search highlights & expand their ancestors
  const filteredChurchesList = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    return churches.filter(
      (ig) =>
        ig.codigo_totvs.toLowerCase().includes(term) ||
        ig.desc_igreja.toLowerCase().includes(term) ||
        (ig.municipio || '').toLowerCase().includes(term)
    );
  }, [churches, searchTerm]);

  // Handle locating church on General Map (replaces standard relative href to avoid complete page reloads)
  const handleLocateOnMap = (code: string) => {
    window.location.href = `/?totvs=${code}`;
  };

  // Recursive tree rendering
  const renderTreeNodes = (nodes: Igreja[]) => {
    return (
      <div className="pl-4 sm:pl-6 border-l-2 border-indigo-50 space-y-3 mt-2">
        {nodes.map((child) => {
          const childPorte = getPorte(child.desc_igreja, child.porte);
          const childColor = PORTE_INFO[childPorte]?.color || '#A6A6A6';
          const childDaughters = getChildrenOf(child.codigo_totvs);
          const hasChildren = childDaughters.length > 0;
          const isExpanded = expandedNodes.has(child.codigo_totvs);

          return (
            <div key={child.codigo_totvs} className="space-y-1">
              {/* Accordion Card block */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isExpanded && hasChildren
                    ? 'bg-zinc-50 border-indigo-200'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div
                  onClick={() => hasChildren && toggleNode(child.codigo_totvs)}
                  className={`flex items-start gap-2.5 min-w-0 flex-1 ${
                    hasChildren ? 'cursor-pointer select-none' : ''
                  }`}
                >
                  {hasChildren ? (
                    <div className="mt-0.5 p-1 hover:bg-indigo-100/50 rounded text-zinc-500 shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  ) : (
                    <span className="w-6 shrink-0" />
                  )}

                  {/* High contrast Porte color dot */}
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-sm shrink-0 mt-1"
                    style={{ backgroundColor: childColor }}
                    title={childPorte}
                  />

                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-zinc-950 block leading-tight hover:text-indigo-600 transition-colors">
                      {child.desc_igreja}
                    </span>
                    <span className="text-[10px] sm:text-xs text-zinc-500 font-medium mt-1 block">
                      TOTVS: <span className="font-mono font-bold text-zinc-700">{child.codigo_totvs}</span> • {child.endereco} • {child.municipio} - {child.estado}
                    </span>
                  </div>
                </div>

                {/* Badge and action button */}
                <div className="flex items-center gap-2 mt-3 sm:mt-0 pl-8 sm:pl-0 shrink-0">
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-white"
                    style={{
                      backgroundColor: childColor,
                      borderColor: 'rgba(0,0,0,0.1)',
                    }}
                  >
                    {childPorte}
                  </span>

                  {child.latitude && child.longitude ? (
                    <button
                      onClick={() => handleLocateOnMap(child.codigo_totvs)}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-2xs hover:shadow-xs flex items-center gap-1 shrink-0"
                    >
                      <span>📍 Localizar no Mapa</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-bold italic py-1.5 px-2 border border-dashed border-zinc-200 rounded-lg">
                      Sem Geolocalização
                    </span>
                  )}
                </div>
              </div>

              {/* Collapsible render */}
              {hasChildren && isExpanded && renderTreeNodes(childDaughters)}
            </div>
          );
        })}
      </div>
    );
  };

  // Compute Root-level nodes for selected state
  const rootChurches = useMemo(() => {
    return churches.filter((ig) => {
      const isEstadual = ig.desc_igreja.toUpperCase().includes('ESTADUAL');
      if (isEstadual) return true;
      if (!ig.codigo_totvs_pai) return true;
      const parentExists = churches.some(
        (p) => p.codigo_totvs === ig.codigo_totvs_pai
      );
      return !parentExists;
    });
  }, [churches]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900">
      <Toaster position="top-right" richColors closeButton />

      {/* Elegant Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-[1001] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <a
                href="/"
                className="p-2 hover:bg-zinc-100 rounded-xl transition-all border border-zinc-200 text-zinc-650 flex items-center justify-center shrink-0"
                title="Voltar ao Mapa Geral"
              >
                <ArrowLeft className="h-4 w-4" />
              </a>
              <div>
                <h1 className="text-base font-extrabold text-zinc-950 tracking-tight flex items-center gap-1.5">
                  🏛️ Organização IPDA
                </h1>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                  SISTEMA DE ESTRUTURA ORGANIZACIONAL DA IGREJA
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/"
                className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <span>🗺️ Ver Mapa Geral</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Selector Panel */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Estrutura Hierárquica por Estado
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Selecione o Estado (UF) para visualizar a teia organizacional de igrejas.
              </p>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              {loadingStates ? (
                <div className="flex items-center space-x-2 text-zinc-500 text-xs font-semibold py-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>Carregando estados...</span>
                </div>
              ) : (
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs sm:text-sm rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-56"
                >
                  <option value="">Selecione o Estado (UF)...</option>
                  {states.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {selectedState && !loadingChurches && (
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Pesquisar por Código TOTVS, nome ou município nesta UF para expandir..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.trim().length > 1) {
                    // Automatically expand matching nodes & their parents to keep them visible
                    const query = e.target.value.trim().toLowerCase();
                    const matched = churches.filter(
                      (ig) =>
                        ig.codigo_totvs.toLowerCase().includes(query) ||
                        ig.desc_igreja.toLowerCase().includes(query) ||
                        (ig.municipio || '').toLowerCase().includes(query)
                    );
                    const newSet = new Set(expandedNodes);
                    matched.forEach((m) => {
                      let current = m;
                      while (current && current.codigo_totvs_pai) {
                        newSet.add(current.codigo_totvs_pai);
                        const p = churches.find(
                          (ig) => ig.codigo_totvs === current.codigo_totvs_pai
                        );
                        current = p || (null as any);
                      }
                    });
                    setExpandedNodes(newSet);
                  }
                }}
                className="w-full bg-zinc-50 border border-zinc-200 focus:bg-white text-zinc-800 text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          )}

          {searchTerm.trim() && filteredChurchesList.length > 0 && (
            <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl space-y-2">
              <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider block">
                🔍 Resultados Encontrados ({filteredChurchesList.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {filteredChurchesList.map((match) => (
                  <button
                    key={`search-match-${match.codigo_totvs}`}
                    type="button"
                    onClick={() => {
                      // Expand target state/hierarchy nodes to show this matching church
                      const newSet = new Set(expandedNodes);
                      let current = match;
                      while (current && current.codigo_totvs_pai) {
                        newSet.add(current.codigo_totvs_pai);
                        const p = churches.find(
                          (ig) => ig.codigo_totvs === current.codigo_totvs_pai
                        );
                        current = p || (null as any);
                      }
                      setExpandedNodes(newSet);
                      // Scroll to specific church element if possible or show success toast
                      toast.success(`Igreja localizada na árvore: ${match.desc_igreja}`);
                    }}
                    className="text-left text-[11px] text-zinc-800 hover:text-indigo-700 bg-white p-2 rounded-lg border border-zinc-200 shadow-2xs font-bold flex items-center gap-1.5"
                  >
                    <span>{match.desc_igreja}</span>
                    <span className="text-[9px] font-mono font-medium text-zinc-400">(TOTVS: {match.codigo_totvs})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Tree Render Viewport */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm min-h-[400px] flex flex-col justify-center">
          {loadingChurches ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="animate-spin h-9 w-9 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs text-zinc-500 font-bold">Mapeando hierarquias do estado...</span>
            </div>
          ) : !selectedState ? (
            <div className="text-center py-20 text-zinc-400 italic text-xs max-w-sm mx-auto flex flex-col items-center gap-2">
              <GitBranch className="h-10 w-10 text-zinc-300 stroke-[1.5]" />
              <span>Por favor, escolha um Estado no menu superior para listar a árvore organizacional.</span>
            </div>
          ) : rootChurches.length === 0 ? (
            <div className="text-center py-20 text-zinc-400 italic text-xs max-w-sm mx-auto">
              Nenhuma igreja ativa estruturada neste estado.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                  Hierarquia Organizacional ({selectedState})
                </h3>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-0.5">
                  {churches.length} Igrejas Ativas
                </span>
              </div>
              <div className="space-y-3">{renderTreeNodes(rootChurches)}</div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
