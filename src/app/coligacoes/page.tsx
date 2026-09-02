'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  Search,
  Upload,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Building2,
  GitBranch,
  Settings,
  AlertTriangle,
  X,
  Check,
  Power,
  RotateCcw,
  BookOpen,
  Layers,
  HelpCircle,
  FileCheck,
  Sun,
  Moon,
} from 'lucide-react';
import type { Igreja } from '@/lib/db';
import { parseWorkbook, getPorte } from '@/lib/parser';
import ConfirmDialog from '@/components/ConfirmDialog';

// Precise official colors mapping (high-contrast values matching the Map visualization)
const PORTE_INFO: Record<string, { name: string; color: string; label: string }> = {
  ESTADUAL: { name: 'ESTADUAL', color: '#3B82F6', label: 'Estadual (Azul de Alto Contraste)' },
  SETORIAL: { name: 'SETORIAL', color: '#EAB308', label: 'Setorial (Amarelo Ouro)' },
  CENTRAL: { name: 'CENTRAL', color: '#F97316', label: 'Central (Laranja de Alto Contraste)' },
  REGIONAL: { name: 'REGIONAL', color: '#22C55E', label: 'Regional (Verde de Alto Contraste)' },
  LOCAL: { name: 'LOCAL', color: '#6B7280', label: 'Local (Cinza de Alto Contraste)' },
  'CASA DE ORAÇÃO': { name: 'CASA DE ORAÇÃO', color: '#EC4899', label: 'Casa de Oração (Rosa/Magenta)' },
  'ALDEIA INDIGENA': { name: 'ALDEIA INDIGENA', color: '#06B6D4', label: 'Aldeia Indígena (Ciano/Turquesa)' },
};

export function normalizeTotvs(code: string | number | null | undefined): string {
  if (code === null || code === undefined) return '';
  return code.toString().trim().replace(/^0+/, '');
}

// Function to replace any existing size classification keywords inside description
function updatePorteInDescription(desc: string, newPorte: string): string {
  const portes = [
    'ESTADUAL',
    'SETORIAL',
    'CENTRAL',
    'REGIONAL',
    'CASA DE ORAÇÃO',
    'CASA DE ORACOA',
    'ALDEIA INDIGENA',
    'ALDEIA INDÍGENA',
    'LOCAL',
  ];
  let cleanDesc = desc || '';
  for (const p of portes) {
    const regex = new RegExp(`\\b${p}\\b`, 'gi');
    cleanDesc = cleanDesc.replace(regex, '');
  }
  // Remove dangling hyphens/spaces
  cleanDesc = cleanDesc.replace(/^\s*-\s*|\s*-\s*$/g, '');
  cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();

  if (newPorte !== 'LOCAL') {
    return `${newPorte} - ${cleanDesc}`;
  }
  return cleanDesc;
}

export default function ColigacoesPage() {
  const [activeTab, setActiveTab] = useState<'tree' | 'import'>('tree');
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          window.location.href = '/login';
        } else if (data.role === 'viewer') {
          window.location.href = '/mapa-geral';
        } else if (data.success && data.role) {
          setUserRole(data.role);
          if (data.nome) setUserName(data.nome);
        }
      })
      .catch((err) => {
        console.error('Error fetching session role:', err);
        window.location.href = '/login';
      });
  }, []);

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected church in tree for detail panel
  const [selectedChurch, setSelectedChurch] = useState<Igreja | null>(null);

  // Expanded nodes set for the Tree View
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Edit states
  const [editParentSearch, setEditParentSearch] = useState<string>('');
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editPorte, setEditPorte] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [savingDetails, setSavingDetails] = useState<boolean>(false);

  // Deactivation / Reorganization Modal states
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false);
  const [reorganizationParentSearch, setReorganizationParentSearch] = useState<string>('');
  const [reorganizationParentId, setReorganizationParentId] = useState<string | null>(null);

  // Custom ConfirmDialog states
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState<boolean>(false);
  const [showRemoveColigacaoConfirm, setShowRemoveColigacaoConfirm] = useState<boolean>(false);

  // Spreadsheet Upload local states
  const [uploadProgress, setUploadProgress] = useState<{
    currentChunk: number;
    totalChunks: number;
    percentage: number;
    totalCount: number;
  } | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [parsedChurchesBuffer, setParsedChurchesBuffer] = useState<Igreja[]>([]);

  // Load all churches on mount
  const fetchAllData = async (preserveSelectedCode?: string) => {
    if (!igrejas.length) setLoading(true);
    else setIsSyncing(true);
    try {
      const res = await fetch('/api/coligacoes?limit=ALL');
      const data = await res.json();
      if (data.success) {
        setIgrejas(data.igrejas || []);
        setStates(data.states || []);

        if (preserveSelectedCode) {
          const freshSelected = (data.igrejas || []).find(
            (ig: Igreja) => ig.codigo_totvs === preserveSelectedCode
          );
          if (freshSelected) {
            setSelectedChurch(freshSelected);
          }
        }
      } else {
        toast.error('Falha ao carregar as igrejas da base de dados.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao carregar igrejas.');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update edit fields when a church is selected
  useEffect(() => {
    if (selectedChurch) {
      setEditParentId(selectedChurch.codigo_totvs_pai || null);
      setEditPorte(getPorte(selectedChurch.desc_igreja));
      setEditDescription(selectedChurch.desc_igreja);

      if (selectedChurch.codigo_totvs_pai) {
        const parent = igrejas.find(
          (ig) => ig.codigo_totvs === selectedChurch.codigo_totvs_pai
        );
        setEditParentSearch(
          parent ? `${parent.desc_igreja} (${parent.codigo_totvs})` : selectedChurch.codigo_totvs_pai
        );
      } else {
        setEditParentSearch('');
      }
    } else {
      setEditParentId(null);
      setEditPorte('');
      setEditDescription('');
      setEditParentSearch('');
    }
  }, [selectedChurch, igrejas]);

  // Compute children of a church
  const getChildrenOf = (parentCode: string) => {
    return igrejas.filter(
      (ig) => ig.codigo_totvs_pai === parentCode && ig.status !== 'DESATIVADO'
    );
  };

  // Toggle tree node expansion
  const toggleNode = (nodeId: string) => {
    const newSet = new Set(expandedNodes);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    setExpandedNodes(newSet);
  };

  // Filter list of prospective parents (cannot be itself or its descendants)
  const prospectiveParents = useMemo(() => {
    if (!selectedChurch) return [];
    const term = editParentSearch.toLowerCase();
    const queryNorm = normalizeTotvs(term);

    // Utility to gather all descendants to avoid circular hierarchy
    const gatherDescendants = (code: string, set: Set<string>) => {
      igrejas
        .filter((ig) => ig.codigo_totvs_pai === code)
        .forEach((ig) => {
          set.add(ig.codigo_totvs);
          gatherDescendants(ig.codigo_totvs, set);
        });
    };

    const invalidCodes = new Set<string>();
    invalidCodes.add(selectedChurch.codigo_totvs);
    gatherDescendants(selectedChurch.codigo_totvs, invalidCodes);

    const matches = igrejas.filter((ig) => {
      if (invalidCodes.has(ig.codigo_totvs)) return false;
      if (ig.status === 'DESATIVADO') return false;

      const normIg = normalizeTotvs(ig.codigo_totvs);
      const codeMatch = normIg === queryNorm || String(ig.codigo_totvs || '').toLowerCase().includes(term);
      const nameMatch = String(ig.desc_igreja || '').toLowerCase().includes(term);
      return codeMatch || nameMatch;
    });

    // Exact Match First
    if (term.trim()) {
      const isSearchNumeric = /^\d+$/.test(queryNorm);
      if (isSearchNumeric) {
        const exactMatch = matches.find((ig) => normalizeTotvs(ig.codigo_totvs) === queryNorm);
        if (exactMatch) {
          return [exactMatch];
        }
      }

      matches.sort((a, b) => {
        const aNorm = normalizeTotvs(a.codigo_totvs);
        const bNorm = normalizeTotvs(b.codigo_totvs);

        const aExact = aNorm === queryNorm;
        const bExact = bNorm === queryNorm;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.desc_igreja.localeCompare(b.desc_igreja);
      });
    }

    return matches.slice(0, 10); // Limit to top 10 results for high performance
  }, [selectedChurch, editParentSearch, igrejas]);

  // Reorganization parents search select results
  const reorganizationParents = useMemo(() => {
    if (!selectedChurch) return [];
    const term = reorganizationParentSearch.toLowerCase();
    const queryNorm = normalizeTotvs(term);

    const matches = igrejas.filter((ig) => {
      if (ig.codigo_totvs === selectedChurch.codigo_totvs) return false;
      if (ig.status === 'DESATIVADO') return false;

      const normIg = normalizeTotvs(ig.codigo_totvs);
      const codeMatch = normIg === queryNorm || String(ig.codigo_totvs || '').toLowerCase().includes(term);
      const nameMatch = String(ig.desc_igreja || '').toLowerCase().includes(term);
      return codeMatch || nameMatch;
    });

    // Exact Match First
    if (term.trim()) {
      const isSearchNumeric = /^\d+$/.test(queryNorm);
      if (isSearchNumeric) {
        const exactMatch = matches.find((ig) => normalizeTotvs(ig.codigo_totvs) === queryNorm);
        if (exactMatch) {
          return [exactMatch];
        }
      }

      matches.sort((a, b) => {
        const aNorm = normalizeTotvs(a.codigo_totvs);
        const bNorm = normalizeTotvs(b.codigo_totvs);

        const aExact = aNorm === queryNorm;
        const bExact = bNorm === queryNorm;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.desc_igreja.localeCompare(b.desc_igreja);
      });
    }

    return matches.slice(0, 10);
  }, [selectedChurch, reorganizationParentSearch, igrejas]);

  // Client-side Excel reading and parsing using centralized parser
  const handleExcelFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setParsedChurchesBuffer([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const allChurches = parseWorkbook(workbook);

        setParsedChurchesBuffer(allChurches);
        if (allChurches.length > 0) {
          toast.success(
            `Sucesso! ${allChurches.length} igrejas foram detectadas e calculadas com sucesso na planilha.`
          );
        } else {
          toast.error('Nenhuma igreja válida foi encontrada na planilha. Verifique as colunas de Código e Descrição/Endereço.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao ler a planilha. Verifique se o arquivo é um Excel (.xlsx) válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Trigger chunk uploading
  const handleStartImport = async () => {
    if (parsedChurchesBuffer.length === 0) {
      toast.error('Nenhuma igreja carregada para iniciar a importação.');
      return;
    }

    setUploading(true);
    const CHUNK_SIZE = 500;
    const totalCount = parsedChurchesBuffer.length;
    const totalChunks = Math.ceil(totalCount / CHUNK_SIZE);

    let totalNovas = 0;
    let totalAtualizadas = 0;
    let totalPreservadas = 0;

    try {
      for (let i = 0; i < totalChunks; i++) {
        setUploadProgress({
          currentChunk: i + 1,
          totalChunks,
          percentage: Math.round(((i + 1) / totalChunks) * 100),
          totalCount,
        });

        const chunk = parsedChurchesBuffer.slice(
          i * CHUNK_SIZE,
          (i + 1) * CHUNK_SIZE
        );

        const res = await fetch('/api/coligacoes/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ igrejas: chunk }),
        });
        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro no envio do lote.');
        }

        if (result.report) {
          totalNovas += result.report.novas || 0;
          totalAtualizadas += result.report.atualizadas || 0;
          totalPreservadas += result.report.preservadas || 0;
        }
      }

      const summaryMsg = totalNovas > 0 || totalAtualizadas > 0 || totalPreservadas > 0
        ? `Importação finalizada! Relatório: ${totalNovas} novas cadastradas, ${totalAtualizadas} atualizadas, ${totalPreservadas} validadas/coligadas PRESERVADAS (protegidas contra alteração).`
        : `Importação finalizada! ${totalCount} igrejas processadas com sucesso.`;

      toast.success(summaryMsg);
      setParsedChurchesBuffer([]);
      setSelectedFileName('');
      setUploadProgress(null);
      await fetchAllData();
      setActiveTab('tree');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Falha durante a importação em lotes: ${errMsg}`);
    } finally {
      setUploading(false);
    }
  };

  // Save changes to selected church
  const handleSaveDetails = async (bypassConfirm: any = false) => {
    if (!selectedChurch) return;

    // Check if coligacao was removed (was non-empty, now is empty/null)
    const wasColigada = !!selectedChurch.codigo_totvs_pai;
    const isColigadaNow = !!editParentId;

    const shouldBypass = typeof bypassConfirm === 'boolean' ? bypassConfirm : false;

    if (wasColigada && !isColigadaNow && !shouldBypass) {
      setShowRemoveColigacaoConfirm(true);
      return;
    }

    setSavingDetails(true);
    try {
      // 1. Calculate the final computed description based on selected porte and typed description
      const updatedDesc = updatePorteInDescription(editDescription, editPorte);

      const res = await fetch('/api/coligacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_totvs: selectedChurch.codigo_totvs,
          codigo_totvs_pai: editParentId,
          desc_igreja: updatedDesc,
          porte: editPorte,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Igreja ${selectedChurch.codigo_totvs} atualizada com sucesso!`);
        await fetchAllData(selectedChurch.codigo_totvs);
      } else {
        toast.error(data.error || 'Erro ao salvar alterações.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar alterações.');
    } finally {
      setSavingDetails(false);
    }
  };

  // Handle deactivation / closure trigger
  const handleDeactivateRequest = () => {
    if (!selectedChurch) return;

    // Check if the church has active children
    const activeDaughters = getChildrenOf(selectedChurch.codigo_totvs);
    if (activeDaughters.length > 0) {
      // Must reorganize daughters first
      setShowDeactivateModal(true);
      setReorganizationParentId(null);
      setReorganizationParentSearch('');
    } else {
      // Standard deactivation confirmation with beautiful custom dialog
      setShowDeactivateConfirm(true);
    }
  };

  const executeDeactivation = async (reorgParent: string | null) => {
    if (!selectedChurch) return;

    setSavingDetails(true);
    try {
      const res = await fetch('/api/coligacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_totvs: selectedChurch.codigo_totvs,
          status: 'DESATIVADO',
          reorganizar_filhas_para: reorgParent,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          reorgParent
            ? 'Igrejas filhas transferidas e igreja principal desativada com sucesso!'
            : 'Igreja desativada com sucesso!'
        );
        setShowDeactivateModal(false);
        setSelectedChurch(null);
        await fetchAllData();
      } else {
        toast.error(data.error || 'Erro ao desativar igreja.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de rede ao processar desativação.');
    } finally {
      setSavingDetails(false);
    }
  };

  // Build filtered search results for tree view highlighting/fast navigation with exact match priority
  const filteredChurchesList = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    const queryNorm = normalizeTotvs(term);

    const matches = igrejas.filter(
      (ig) => {
        const normIg = normalizeTotvs(ig.codigo_totvs);
        return normIg === queryNorm ||
          String(ig.codigo_totvs || '').toLowerCase().includes(term) ||
          String(ig.desc_igreja || '').toLowerCase().includes(term) ||
          String(ig.municipio || '').toLowerCase().includes(term);
      }
    );

    const isSearchNumeric = /^\d+$/.test(queryNorm);
    if (isSearchNumeric) {
      const exactMatch = matches.find((ig) => normalizeTotvs(ig.codigo_totvs) === queryNorm);
      if (exactMatch) {
        return [exactMatch];
      }
    }

    matches.sort((a, b) => {
      const aNorm = normalizeTotvs(a.codigo_totvs);
      const bNorm = normalizeTotvs(b.codigo_totvs);

      const aExact = aNorm === queryNorm;
      const bExact = bNorm === queryNorm;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.desc_igreja.localeCompare(b.desc_igreja);
    });

    return matches;
  }, [igrejas, searchTerm]);

  // Recursively render hierarchical tree nodes with state expansion check
  const renderTreeNodes = (children: Igreja[]) => {
    return (
      <div className="pl-4 border-l border-zinc-100 space-y-1 mt-1">
        {children.map((child) => {
          const childPorte = getPorte(child.desc_igreja);
          const childColor = PORTE_INFO[childPorte]?.color || '#A6A6A6';
          const childDaughters = getChildrenOf(child.codigo_totvs);
          const hasChildren = childDaughters.length > 0;
          const isExpanded = expandedNodes.has(child.codigo_totvs);

          return (
            <div key={child.codigo_totvs} className="space-y-1">
              <div
                onClick={() => setSelectedChurch(child)}
                className={`group flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                  selectedChurch?.codigo_totvs === child.codigo_totvs
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-950'
                    : 'hover:bg-zinc-50 border border-transparent hover:border-zinc-200'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNode(child.codigo_totvs);
                      }}
                      className="p-1 hover:bg-zinc-200/60 rounded-md text-zinc-500 transition-transform"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>
                  ) : (
                    <span className="w-5.5 h-1 inline-block shrink-0" />
                  )}

                  {/* Porte Badge Indicator */}
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: childColor }}
                    title={childPorte}
                  />

                  <div className="min-w-0 text-left">
                    <span className="text-xs font-bold text-zinc-900 group-hover:text-indigo-600 block truncate">
                      {child.desc_igreja}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono font-medium block">
                      TOTVS: {child.codigo_totvs} • {child.municipio} - {child.estado}
                    </span>
                  </div>
                </div>

                {/* Status indicator badges */}
                <span
                  className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                    child.status === 'VALIDADO'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : child.status === 'DESATIVADO'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {child.status}
                </span>
              </div>

              {/* Recursive child list */}
              {hasChildren && isExpanded && renderTreeNodes(childDaughters)}
            </div>
          );
        })}
      </div>
    );
  };

  // Group churches by Estado/UF to form top level tree roots
  const rootTreeElements = useMemo(() => {
    const list: React.ReactNode[] = [];

    // Filter states to only render those present in the current loaded church list
    const activeStates = Array.from(new Set(igrejas.map((ig) => ig.estado).filter(Boolean))).sort();

    activeStates.forEach((uf) => {
      // Find root churches in this state (no parent OR description has "ESTADUAL" OR parent is not found/not in the same state/is deactivated)
      const rootChurchesInUF = igrejas.filter((ig) => {
        if (ig.estado !== uf || ig.status === 'DESATIVADO') return false;

        const isEstadual = ig.desc_igreja.toUpperCase().includes('ESTADUAL');
        if (isEstadual) return true;

        // Fallback for isolated nodes
        if (!ig.codigo_totvs_pai) return true;
        const parentExistsInList = igrejas.some(
          (p) => p.codigo_totvs === ig.codigo_totvs_pai && p.status !== 'DESATIVADO'
        );
        return !parentExistsInList;
      });

      if (rootChurchesInUF.length === 0) return;

      const isStateExpanded = expandedNodes.has(uf);

      list.push(
        <div key={`state-group-${uf}`} className="space-y-1.5 border-b border-zinc-100 pb-2.5">
          <div
            onClick={() => toggleNode(uf)}
            className="flex items-center justify-between p-2 bg-zinc-50 hover:bg-zinc-100/80 rounded-xl transition-all cursor-pointer border border-zinc-200"
          >
            <div className="flex items-center space-x-2">
              <span className="w-6.5 h-6.5 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-xs">
                {uf}
              </span>
              <span className="text-xs font-black text-zinc-800 tracking-wide">
                Igrejas do Estado de {uf}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-zinc-500">
              <span className="text-[10px] font-bold font-mono bg-white px-2 py-0.5 rounded-md border border-zinc-300">
                {rootChurchesInUF.length} Estaduais/Sedes
              </span>
              {isStateExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </div>

          {isStateExpanded && renderTreeNodes(rootChurchesInUF)}
        </div>
      );
    });

    return list;
  }, [igrejas, expandedNodes, selectedChurch]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 flex flex-col font-sans text-zinc-900 dark:text-slate-100 transition-colors duration-200">
      <Toaster position="top-right" richColors closeButton />

      {/* Custom Confirm Dialog for Deactivation */}
      <ConfirmDialog
        isOpen={showDeactivateConfirm}
        title="Confirmar Inativação"
        message={`Deseja realmente desativar a igreja "${selectedChurch?.desc_igreja}"? Ela será ocultada de todos os mapas e este processo é irreversível.`}
        confirmLabel="Confirmar Inativação"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          setShowDeactivateConfirm(false);
          await executeDeactivation(null);
        }}
        onCancel={() => setShowDeactivateConfirm(false)}
        isDanger={true}
      />

      {/* Custom Confirm Dialog for Coligacao Removal */}
      <ConfirmDialog
        isOpen={showRemoveColigacaoConfirm}
        title="Remover Coligação"
        message={`Deseja realmente remover o vínculo de coligação da igreja "${selectedChurch?.desc_igreja}"? Ela não responderá mais a nenhuma igreja superior.`}
        confirmLabel="Confirmar Remoção"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          setShowRemoveColigacaoConfirm(false);
          await handleSaveDetails(true);
        }}
        onCancel={() => setShowRemoveColigacaoConfirm(false)}
        isDanger={true}
      />

      {/* Mandatory Transfer / Reorganization Modal */}
      {showDeactivateModal && selectedChurch && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Reorganização Obrigatória de Coligações</h3>
                <p className="text-xs text-zinc-500 font-medium">Igreja Superior com Igrejas Filhas Ativas</p>
              </div>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed">
              A igreja <strong className="text-zinc-950 font-bold">{selectedChurch.desc_igreja} ({selectedChurch.codigo_totvs})</strong> possui{' '}
              <strong className="text-indigo-600 font-bold">
                {getChildrenOf(selectedChurch.codigo_totvs).length} igrejas filhas
              </strong>{' '}
              vinculadas hierarquicamente a ela. Para desativá-la, você deve escolher uma nova igreja mãe de destino para transferir essas filhas instantaneamente.
            </p>

            <div className="space-y-1.5 pt-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">
                Escolha a Nova Igreja Superior (Mãe)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquise por código TOTVS ou nome da igreja..."
                  value={reorganizationParentSearch}
                  onChange={(e) => setReorganizationParentSearch(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-indigo-500 outline-none text-xs rounded-xl w-full font-medium"
                />
              </div>

              {reorganizationParents.length > 0 && (
                <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden max-h-40 overflow-y-auto mt-2 divide-y divide-zinc-100 shadow-lg">
                  {reorganizationParents.map((parent) => {
                    const pPorte = getPorte(parent.desc_igreja);
                    const cleanName = (parent.desc_igreja || '').replace(new RegExp(`\\b${pPorte}\\b`, 'gi'), '').replace(/^\s*-\s*|\s*-\s*$/g, '').replace(/\s+/g, ' ').trim();
                    return (
                      <button
                        key={parent.codigo_totvs}
                        type="button"
                        onClick={() => {
                          setReorganizationParentId(parent.codigo_totvs);
                          setReorganizationParentSearch(`${parent.desc_igreja} (${parent.codigo_totvs})`);
                        }}
                        className="w-full text-left p-2.5 text-xs hover:bg-zinc-50 flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2 text-left">
                          <span className="font-bold text-zinc-900 block truncate">
                            {pPorte} - {cleanName} - {(parent.municipio || '').toUpperCase()}/{(parent.estado || '').toUpperCase()} (TOTVS: {parent.codigo_totvs})
                          </span>
                        </div>
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200 uppercase shrink-0">
                          {pPorte}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-150">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!reorganizationParentId}
                onClick={() => executeDeactivation(reorganizationParentId)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Transferir Filhas e Desativar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header navigation */}
      <header className="relative z-[9999] bg-white dark:bg-slate-900 border-b border-zinc-200 dark:border-slate-800 sticky top-0 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <a
                href="/"
                className="p-2 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-zinc-200 dark:border-slate-700 text-zinc-650 dark:text-slate-300 flex items-center justify-center shrink-0"
                title="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </a>
              <div>
                <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  🌳 Gestão de Coligações e Hierarquia
                </h1>
                <p className="text-[9px] text-zinc-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  GeoManager Enterprise • Inteligência de Dados e Topologias
                </p>
              </div>
            </div>

            {/* Unified Navigation Layout */}
            <div className="flex flex-wrap items-center gap-3 shrink-0 mt-3 sm:mt-0">
              {userName && (
                <span className="text-xs font-semibold text-zinc-700 dark:text-slate-200 hidden sm:inline-block bg-zinc-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-slate-700">
                  Olá, <strong className="text-indigo-600 dark:text-indigo-400">{userName}</strong>
                </span>
              )}
              {/* Block 1: Visualização */}
              <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 items-center">
                <a
                  href="/"
                  className="px-3 py-1.5 text-xs font-bold text-indigo-750 hover:text-indigo-900 bg-white rounded-lg shadow-2xs border border-zinc-200/50 flex items-center space-x-1 transition-all"
                >
                  <span>🗺️ Mapa Geral</span>
                </a>
              </div>

              {/* Grouped Administrative Navigation Dropdowns */}
              <div className="flex bg-zinc-100 dark:bg-slate-800 p-1 rounded-xl border border-zinc-200 dark:border-slate-700 gap-1 items-center font-semibold text-xs">
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
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('tree');
                          setSelectedChurch(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 rounded-lg block"
                      >
                        🌳 Coligações
                      </button>
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
            </div>
          </div>
        </div>
      </header>

      {/* Main content workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Sub-header Tab Segment for internal Coligacoes views */}
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 max-w-sm shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('tree');
              setSelectedChurch(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 flex items-center justify-center space-x-1.5 ${
              activeTab === 'tree'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/50'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5 text-indigo-600" />
            <span>Árvore Hierárquica</span>
          </button>
          {userRole !== 'viewer' && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('import');
                setSelectedChurch(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 flex items-center justify-center space-x-1.5 ${
                activeTab === 'import'
                  ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Upload className="h-3.5 w-3.5 text-indigo-600" />
              <span>Importação em Lotes</span>
            </button>
          )}
        </div>

        {activeTab === 'import' ? (
          /* UNLIMITED SHEET CLIENT UPLOADER PANEL */
          <div className="max-w-xl mx-auto w-full bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="text-center space-y-1.5 border-b border-zinc-100 pb-4">
              <h2 className="text-sm font-black text-zinc-800 uppercase tracking-wide flex items-center justify-center gap-1.5">
                <Upload className="h-5 w-5 text-indigo-600 animate-bounce" />
                Módulo de Importação sem Limites (Em Lotes)
              </h2>
              <p className="text-xs text-zinc-500">
                Os dados são divididos em lotes de 500 registros diretamente no navegador para evitar limites de timeout ou Payload do Vercel.
              </p>
            </div>

            {/* Drag & Drop File Selector area */}
            <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-6 hover:border-indigo-500 transition-all text-center relative flex flex-col items-center justify-center bg-zinc-50/50">
              <FolderOpen className="h-10 w-10 text-zinc-400 mb-3" />
              <p className="text-xs text-zinc-700 font-semibold mb-1">
                Selecione o arquivo de planilha (.xlsx) de 12.000+ igrejas
              </p>
              <p className="text-[10px] text-zinc-400 font-medium">
                Suporta múltiplas abas: Sudeste, Nordeste, Norte, etc.
              </p>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleExcelFileSelection}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>

            {selectedFileName && (
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-800 block truncate max-w-xs">
                    📄 {selectedFileName}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium font-mono mt-0.5 block">
                    {parsedChurchesBuffer.length} igrejas processadas no navegador
                  </span>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => {
                      setParsedChurchesBuffer([]);
                      setSelectedFileName('');
                    }}
                    className="p-1 hover:bg-zinc-200 rounded-lg text-rose-600"
                    title="Remover arquivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Progress Bar Container */}
            {uploadProgress && (
              <div className="space-y-2.5 p-4 bg-indigo-50 rounded-xl border border-indigo-150">
                <div className="flex justify-between items-center text-xs font-bold text-indigo-900">
                  <span>Enviando Lote {uploadProgress.currentChunk} de {uploadProgress.totalChunks}...</span>
                  <span>{uploadProgress.percentage}%</span>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-3 overflow-hidden p-0.5 border border-indigo-300">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300 shadow-inner"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-indigo-700 font-medium">
                  {uploadProgress.currentChunk * 500 > uploadProgress.totalCount ? uploadProgress.totalCount : uploadProgress.currentChunk * 500} de {uploadProgress.totalCount} registros gravados com cálculo de coligações ativo.
                </p>
              </div>
            )}

            {/* Guide Info Box */}
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-xs flex items-start space-x-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-semibold block mb-0.5">Uploader Cliente Seguro</strong>
                <p className="text-[11px] opacity-90">
                  A coligação hierárquica é calculada em tempo real no cliente antes de fatiar as requisições em chunks discretos. A integridade estrutural das coligações é preservada perfeitamente.
                </p>
              </div>
            </div>

            {!uploadProgress && parsedChurchesBuffer.length > 0 && (
              <button
                type="button"
                onClick={handleStartImport}
                disabled={uploading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all"
              >
                {uploading ? (
                  <span>Processando...</span>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4" />
                    <span>Iniciar Importação de {parsedChurchesBuffer.length} Igrejas</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* INTERACTIVE TREE VIEW & DETAILS PANEL SPLIT WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Scrollable Expandable Tree view (7 cols) */}
            <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col h-[700px] transition-colors duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div>
                  <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                    <GitBranch className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Árvore de Coligação Vertical
                  </h2>
                  <p className="text-[10px] text-zinc-500 dark:text-slate-400 font-medium">
                    Navegue pela topologia organizacional da IPDA agrupada por Estado.
                  </p>
                </div>
                <div className="text-xs font-bold text-zinc-500 dark:text-slate-400 bg-zinc-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-slate-700 shrink-0 transition-colors duration-200">
                  {igrejas.filter((i) => i.status !== 'DESATIVADO').length} Igrejas Ativas
                </div>
              </div>

              {/* Real-time search/filter inputs */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por Código TOTVS ou Nome para expandir..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-800 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-medium"
                />
              </div>

              {/* Fast navigation list from search matches */}
              {searchTerm.trim() && filteredChurchesList.length > 0 && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl space-y-1.5 shrink-0 max-h-36 overflow-y-auto">
                  <span className="text-[9px] font-black text-indigo-900 uppercase tracking-wider block">
                    🔍 Resultados Encontrados ({filteredChurchesList.length}):
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {filteredChurchesList.map((match) => (
                      <button
                        key={`search-match-${match.codigo_totvs}`}
                        type="button"
                        onClick={() => {
                          setSelectedChurch(match);
                          // Expand target state
                          if (match.estado) {
                            const newSet = new Set(expandedNodes);
                            newSet.add(match.estado);
                            // Recursively expand parents
                            let current = match;
                            while (current && current.codigo_totvs_pai) {
                              newSet.add(current.codigo_totvs_pai);
                              const p = igrejas.find(
                                (ig) => ig.codigo_totvs === current.codigo_totvs_pai
                              );
                              current = p || (null as any);
                            }
                            setExpandedNodes(newSet);
                          }
                          toast.success(`Selecionado: ${match.desc_igreja}`);
                        }}
                        className="text-left text-xs text-zinc-700 hover:text-indigo-700 hover:underline flex justify-between items-center bg-white p-1.5 rounded border border-zinc-200 shadow-2xs font-medium"
                      >
                        <span className="truncate pr-4">
                          <strong>{match.desc_igreja}</strong> ({match.codigo_totvs})
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600 shrink-0 uppercase font-mono">
                          {match.estado}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrollable Tree View viewport */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs text-zinc-500 font-bold">Estruturando topologia de coligações...</span>
                  </div>
                ) : rootTreeElements.length === 0 ? (
                  <div className="text-center py-20 text-zinc-400 italic text-xs">
                    Nenhuma igreja ativa estruturada. Envie uma planilha de importação para popular a base.
                  </div>
                ) : (
                  <div className="space-y-3">{rootTreeElements}</div>
                )}
              </div>
            </section>

            {/* RIGHT COLUMN: Selected Node detail panel & coligacao editor (5 cols) */}
            <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5 h-auto lg:h-[700px] flex flex-col justify-between transition-colors duration-200">
              {selectedChurch ? (
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  {/* Title Header */}
                  <div className="border-b border-zinc-150 pb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 tracking-tight leading-tight">
                        {selectedChurch.desc_igreja}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200 shadow-2xs">
                          TOTVS: {selectedChurch.codigo_totvs}
                        </span>
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-white"
                          style={{
                            backgroundColor: PORTE_INFO[editPorte]?.color || '#A6A6A6',
                            borderColor: 'rgba(0,0,0,0.1)',
                          }}
                        >
                          {editPorte}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                        selectedChurch.status === 'VALIDADO'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : selectedChurch.status === 'DESATIVADO'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {selectedChurch.status}
                    </span>
                  </div>

                  {/* Church properties block */}
                  <div className="space-y-2 text-xs text-zinc-700 bg-zinc-50/50 p-3 rounded-xl border border-zinc-200">
                    <p className="flex items-center gap-1.5">
                      <strong className="font-semibold text-zinc-400">Endereço:</strong>{' '}
                      <span className="font-medium text-zinc-900">{selectedChurch.endereco}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <strong className="font-semibold text-zinc-400">Cidade:</strong>{' '}
                      <span className="font-medium text-zinc-900">
                        {selectedChurch.municipio} - {selectedChurch.estado}
                      </span>
                    </p>
                    {selectedChurch.tipo_imovel && (
                      <p className="flex items-center gap-1.5">
                        <strong className="font-semibold text-zinc-400">Imóvel:</strong>{' '}
                        <span className="font-semibold text-zinc-800">{selectedChurch.tipo_imovel}</span>
                      </p>
                    )}
                  </div>

                  {/* Section 1: Alterar Igreja Superior (Pai) */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
                      Alterar Igreja Superior (Pai Coligado)
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Pesquise para vincular a um novo pai..."
                        value={editParentSearch}
                        onChange={(e) => {
                          setEditParentSearch(e.target.value);
                          if (!e.target.value) {
                            setEditParentId(null);
                          }
                        }}
                        className="pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 focus:ring-1 focus:ring-indigo-500 outline-none text-xs rounded-xl w-full font-medium"
                      />
                    </div>

                    {prospectiveParents.length > 0 && editParentSearch && (
                      <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden max-h-40 overflow-y-auto shadow-md divide-y divide-zinc-100">
                        {prospectiveParents.map((parent) => {
                          const pPorte = getPorte(parent.desc_igreja);
                          const cleanName = (parent.desc_igreja || '').replace(new RegExp(`\\b${pPorte}\\b`, 'gi'), '').replace(/^\s*-\s*|\s*-\s*$/g, '').replace(/\s+/g, ' ').trim();
                          return (
                            <button
                              key={parent.codigo_totvs}
                              type="button"
                              onClick={() => {
                                setEditParentId(parent.codigo_totvs);
                                setEditParentSearch(`${parent.desc_igreja} (${parent.codigo_totvs})`);
                              }}
                              className="w-full text-left p-2 hover:bg-zinc-50 text-xs flex justify-between items-center"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-bold text-zinc-900 block truncate">
                                  {pPorte} - {cleanName} - {(parent.municipio || '').toUpperCase()}/{(parent.estado || '').toUpperCase()} (TOTVS: {parent.codigo_totvs})
                                </span>
                              </div>
                              <span className="text-[9px] bg-indigo-50 text-indigo-800 font-bold px-1.5 py-0.5 rounded border border-indigo-200 uppercase shrink-0">
                                {pPorte}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Promover/Reclassificar Porte */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-indigo-500" />
                      Promover / Reclassificar Porte
                    </label>
                    <select
                      value={editPorte}
                      onChange={(e) => setEditPorte(e.target.value)}
                      className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs rounded-xl p-2.5 font-semibold focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                    >
                      {Object.keys(PORTE_INFO).map((porte) => (
                        <option key={porte} value={porte}>
                          {PORTE_INFO[porte].label}
                        </option>
                      ))}
                    </select>

                    <div className="mt-2.5">
                      <label className="text-[10px] font-bold text-zinc-500 block">Nome Descritivo Atualizado:</label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 text-zinc-850 text-xs rounded-xl p-2.5 w-full mt-1 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                        title="O nome pode ser personalizado, mas a classificação do porte será ajustada de forma inteligente."
                      />
                      <p className="text-[9px] text-zinc-400 mt-1.5 font-medium leading-relaxed">
                        Ao salvar, o sistema recalcula de forma inteligente a descrição para refletir perfeitamente o porte escolhido.
                      </p>
                    </div>
                  </div>

                  {/* Section 3: Gerenciamento de Fechamento / Exclusão de Igrejas */}
                  <div className="space-y-2 pt-3 border-t border-zinc-150">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block flex items-center gap-1.5">
                      <Power className="h-3.5 w-3.5 text-rose-500" />
                      Área de Risco e Desativação
                    </span>

                    <button
                      type="button"
                      onClick={handleDeactivateRequest}
                      disabled={selectedChurch.status === 'DESATIVADO'}
                      className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-2xs"
                    >
                      <Power className="h-4 w-4 shrink-0" />
                      <span>Desativar / Fechar Igreja</span>
                    </button>
                    <p className="text-[9px] text-zinc-400 leading-normal font-medium">
                      O fechamento altera o status para <strong>DESATIVADO</strong>. O ponto é automaticamente removido de todas as malhas de conexões e do Mapa Geral de igrejas validadas.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <GitBranch className="h-12 w-12 text-zinc-300 stroke-[1.5]" />
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Painel Lateral de Detalhes</h3>
                    <p className="text-[10px] text-zinc-500 max-w-xs mt-1 leading-normal font-medium">
                      Selecione qualquer igreja da árvore de coligações para gerenciar sua classificação, igreja superior, ou desativá-la com trava de segurança.
                    </p>
                  </div>
                </div>
              )}

              {/* Sidebar Action Buttons Footer */}
              {selectedChurch && (
                <div className="pt-4 border-t border-zinc-150 shrink-0">
                  <button
                    type="button"
                    onClick={handleSaveDetails}
                    disabled={savingDetails}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all active:scale-[0.98]"
                  >
                    {savingDetails ? (
                      <span>Salvando dados...</span>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Salvar Alterações e Atualizar Banco</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
