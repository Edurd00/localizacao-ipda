'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import {
  Search,
  Plus,
  Edit,
  Users,
  X,
  Check,
  Loader2,
  RefreshCw,
  Power,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
} from 'lucide-react';
import type { Igreja } from '@/lib/db';

const PORTE_INFO: Record<string, { name: string; color: string; label: string }> = {
  ESTADUAL: { name: 'ESTADUAL', color: '#3B82F6', label: 'Estadual (Azul)' },
  SETORIAL: { name: 'SETORIAL', color: '#EAB308', label: 'Setorial (Amarelo)' },
  CENTRAL: { name: 'CENTRAL', color: '#F97316', label: 'Central (Laranja)' },
  REGIONAL: { name: 'REGIONAL', color: '#22C55E', label: 'Regional (Verde)' },
  LOCAL: { name: 'LOCAL', color: '#6B7280', label: 'Local (Cinza)' },
  'CASA DE ORAÇÃO': { name: 'CASA DE ORAÇÃO', color: '#EC4899', label: 'Casa de Oração (Rosa)' },
  'ALDEIA INDIGENA': { name: 'ALDEIA INDIGENA', color: '#06B6D4', label: 'Aldeia Indígena (Ciano)' },
};

export default function GestaoPage() {
  const router = useRouter();
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();

  // Search input typing speed optimization
  const [searchInput, setSearchInput] = useState('');

  // Filters & Priority Sorting states
  const [filterContactStatus, setFilterContactStatus] = useState<string>('ALL');
  const [filterPorteGroup, setFilterPorteGroup] = useState<string>('ALL');
  const [prioritizeMajorPortes, setPrioritizeMajorPortes] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Church states for Modals
  const [selectedChurch, setSelectedChurch] = useState<Igreja | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isImportContactsModalOpen, setIsImportContactsModalOpen] = useState(false);
  const [importFile, setFileToImport] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form State: Create/Edit Church
  const [formTotvs, setFormTotvs] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formMunicipio, setFormMunicipio] = useState('');
  const [formEstado, setFormEstado] = useState('');
  const [formCep, setFormCep] = useState('');
  const [formLinkMaps, setFormLinkMaps] = useState('');
  const [formPorte, setFormPorte] = useState('LOCAL');
  const [formParentTotvs, setFormParentTotvs] = useState('');
  const [formTipoImovel, setFormTipoImovel] = useState('ALUGADO');

  // Form State: Responsibles & Membership
  const [formDirigenteNome, setFormDirigenteNome] = useState('');
  const [formDirigenteTelefone, setFormDirigenteTelefone] = useState('');
  const [formDirigenteEmail, setFormDirigenteEmail] = useState('');
  const [formDirigenteDataPosse, setFormDirigenteDataPosse] = useState('');
  const [formFinanceiraNome, setFormFinanceiraNome] = useState('');
  const [formFinanceiraTelefone, setFormFinanceiraTelefone] = useState('');
  const [formFinanceiraEmail, setFormFinanceiraEmail] = useState('');
  const [formQtdMembros, setFormQtdMembros] = useState('');
  const [formQtdJovens, setFormQtdJovens] = useState('');
  const [formTipoPrebenda, setFormTipoPrebenda] = useState('NAO_PREBENDADA');

  // ViaCEP Fetcher with Auto-fill
  const handleCepBlurOrChange = async (val: string) => {
    const uppercaseVal = val.toUpperCase();
    setFormCep(uppercaseVal);
    const cleanCep = uppercaseVal.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (data && !data.erro) {
            if (data.logradouro) setFormEndereco(data.logradouro.toUpperCase());
            if (data.bairro) setFormBairro(data.bairro.toUpperCase());
            if (data.localidade) setFormMunicipio(data.localidade.toUpperCase());
            if (data.uf) setFormEstado(data.uf.toUpperCase());
            toast.success(`ViaCEP: Endereço autopreenchido para ${data.localidade}-${data.uf}!`);
          }
        }
      } catch (err) {
        console.error('ViaCEP Fetch Error:', err);
      }
    }
  };

  // Helper to generate standardized church name: {PORTE} - {UF}-{MUNICIPIO}-{BAIRRO}
  const generateStandardName = () => {
    const porteStr = (formPorte || 'LOCAL').trim().toUpperCase();
    const ufStr = (formEstado || '').trim().toUpperCase();
    const munStr = (formMunicipio || '').trim().toUpperCase();
    const bairroStr = (formBairro || '').trim().toUpperCase();

    let result = porteStr;
    if (ufStr || munStr) {
      result += ` - ${ufStr}${munStr ? '-' + munStr : ''}`;
    }
    if (bairroStr) {
      result += `-${bairroStr}`;
    }
    setFormNome(result);
    toast.info(`Nome da Igreja padronizado: ${result}`);
  };

  // Match TOTVS Parent Church for Autocomplete Confirmation
  const parentChurchMatch = useMemo(() => {
    const target = formParentTotvs.trim().replace(/^0+/, '');
    if (!target) return null;
    return igrejas.find((ig) => ig.codigo_totvs.trim().replace(/^0+/, '') === target);
  }, [igrejas, formParentTotvs]);

  const [saving, setSaving] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // Load session & check permissions
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.authenticated) {
          toast.error('Acesso restrito. Faça login para gerenciar as igrejas.');
          window.location.href = '/validacao';
        }
      })
      .catch((err) => {
        console.error(err);
        window.location.href = '/validacao';
      });
  }, []);

  const fetchIgrejasList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/igrejas?status=ALL&estado=ALL&t=' + Date.now().toString());
      const data = await res.json();
      if (data.success) {
        setIgrejas(data.igrejas || []);
      } else {
        toast.error('Erro ao carregar lista de igrejas.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao carregar as igrejas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIgrejasList();
  }, []);

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
        setFilterContactStatus('ALL');
        setFilterPorteGroup('ALL');
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

  // Typing search trigger
  useEffect(() => {
    startTransition(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    });
  }, [searchInput]);

  // Coverage KPI metrics calculation
  const kpiMetrics = useMemo(() => {
    const total = igrejas.length;
    if (total === 0) {
      return { dirigenteCount: 0, dirigentePct: 0, financeiraCount: 0, financeiraPct: 0, majorPendingCount: 0 };
    }

    let dirCount = 0;
    let finCount = 0;
    let majorPending = 0;

    const majorPortes = new Set(['ESTADUAL', 'SETORIAL', 'CENTRAL', 'REGIONAL']);

    for (const ig of igrejas) {
      const hasDir = Boolean(ig.dirigente_nome && ig.dirigente_nome.trim().length > 0);
      const hasFin = Boolean(ig.financeira_nome && ig.financeira_nome.trim().length > 0);
      if (hasDir) dirCount++;
      if (hasFin) finCount++;

      const porte = (ig.porte || 'LOCAL').toUpperCase();
      if (majorPortes.has(porte) && (!hasDir || !hasFin)) {
        majorPending++;
      }
    }

    return {
      dirigenteCount: dirCount,
      dirigentePct: Math.round((dirCount / total) * 100),
      financeiraCount: finCount,
      financeiraPct: Math.round((finCount / total) * 100),
      majorPendingCount: majorPending,
    };
  }, [igrejas]);

  // Enhanced filtering & priority sorting logic
  const filteredIgrejas = useMemo(() => {
    let result = igrejas;

    // 1. Search term filter
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const numericTerm = term.replace(/^0+/, '');
      const isPureNumeric = /^\d+$/.test(numericTerm);

      if (isPureNumeric) {
        const exact = igrejas.find((ig) => ig.codigo_totvs.trim().replace(/^0+/, '') === numericTerm);
        if (exact) {
          result = [exact];
        } else {
          result = igrejas.filter((ig) => {
            const totvsNorm = ig.codigo_totvs.toLowerCase();
            const nomeNorm = ig.desc_igreja.toLowerCase();
            const municipioNorm = (ig.municipio || '').toLowerCase();
            const estadoNorm = (ig.estado || '').toLowerCase();
            const bairroNorm = (ig.bairro || '').toLowerCase();

            return (
              totvsNorm.includes(term) ||
              nomeNorm.includes(term) ||
              municipioNorm.includes(term) ||
              estadoNorm.includes(term) ||
              bairroNorm.includes(term)
            );
          });
        }
      } else {
        result = igrejas.filter((ig) => {
          const totvsNorm = ig.codigo_totvs.toLowerCase();
          const nomeNorm = ig.desc_igreja.toLowerCase();
          const municipioNorm = (ig.municipio || '').toLowerCase();
          const estadoNorm = (ig.estado || '').toLowerCase();
          const bairroNorm = (ig.bairro || '').toLowerCase();

          return (
            totvsNorm.includes(term) ||
            nomeNorm.includes(term) ||
            municipioNorm.includes(term) ||
            estadoNorm.includes(term) ||
            bairroNorm.includes(term)
          );
        });
      }
    }

    // 2. Filter by Contact Status
    if (filterContactStatus !== 'ALL') {
      result = result.filter((ig) => {
        const hasDir = Boolean(ig.dirigente_nome && ig.dirigente_nome.trim().length > 0);
        const hasFin = Boolean(ig.financeira_nome && ig.financeira_nome.trim().length > 0);

        if (filterContactStatus === 'NO_DIRIGENTE') return !hasDir;
        if (filterContactStatus === 'NO_FINANCEIRA') return !hasFin;
        if (filterContactStatus === 'NO_BOTH') return !hasDir && !hasFin;
        if (filterContactStatus === 'COMPLETE') return hasDir && hasFin;
        return true;
      });
    }

    // 3. Filter by Porte Group
    if (filterPorteGroup !== 'ALL') {
      result = result.filter((ig) => {
        const porte = (ig.porte || 'LOCAL').toUpperCase();
        if (filterPorteGroup === 'ESTADUAL_SETORIAL') {
          return porte === 'ESTADUAL' || porte === 'SETORIAL';
        }
        if (filterPorteGroup === 'CENTRAL_REGIONAL') {
          return porte === 'CENTRAL' || porte === 'REGIONAL';
        }
        if (filterPorteGroup === 'LOCAL_OUTROS') {
          return porte !== 'ESTADUAL' && porte !== 'SETORIAL' && porte !== 'CENTRAL' && porte !== 'REGIONAL';
        }
        return true;
      });
    }

    // 4. Priority Sorting by Major Portes
    if (prioritizeMajorPortes) {
      const PORTE_WEIGHTS: Record<string, number> = {
        ESTADUAL: 1,
        SETORIAL: 2,
        CENTRAL: 3,
        REGIONAL: 4,
        LOCAL: 5,
        'CASA DE ORAÇÃO': 6,
        'ALDEIA INDIGENA': 7,
      };

      result = [...result].sort((a, b) => {
        const weightA = PORTE_WEIGHTS[(a.porte || 'LOCAL').toUpperCase()] || 99;
        const weightB = PORTE_WEIGHTS[(b.porte || 'LOCAL').toUpperCase()] || 99;
        return weightA - weightB;
      });
    }

    return result;
  }, [igrejas, searchTerm, filterContactStatus, filterPorteGroup, prioritizeMajorPortes]);

  // Pagination slice
  const paginatedIgrejas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredIgrejas.slice(start, start + itemsPerPage);
  }, [filteredIgrejas, currentPage]);

  const totalPages = Math.ceil(filteredIgrejas.length / itemsPerPage);

  const openCreateModal = () => {
    setFormTotvs('');
    setFormNome('');
    setFormEndereco('');
    setFormBairro('');
    setFormMunicipio('');
    setFormEstado('');
    setFormCep('');
    setFormLinkMaps('');
    setFormPorte('LOCAL');
    setFormParentTotvs('');
    setFormTipoImovel('ALUGADO');

    setFormDirigenteNome('');
    setFormDirigenteTelefone('');
    setFormDirigenteEmail('');
    setFormDirigenteDataPosse('');
    setFormFinanceiraNome('');
    setFormFinanceiraTelefone('');
    setFormFinanceiraEmail('');
    setFormQtdMembros('');
    setFormQtdJovens('');
    setFormTipoPrebenda('NAO_PREBENDADA');

    setIsCreateModalOpen(true);
  };

  const openEditModal = (ig: Igreja) => {
    setSelectedChurch(ig);
    setFormTotvs(ig.codigo_totvs);
    setFormNome(ig.desc_igreja);
    setFormEndereco(ig.endereco || '');
    setFormBairro(ig.bairro || '');
    setFormMunicipio(ig.municipio || '');
    setFormEstado(ig.estado || '');
    setFormCep(ig.cep || '');
    setFormLinkMaps(ig.link_google_maps || '');
    setFormPorte(ig.porte || 'LOCAL');
    setFormParentTotvs(ig.codigo_totvs_pai || '');
    setFormTipoImovel(ig.tipo_imovel || 'ALUGADO');
    setFormTipoPrebenda(ig.tipo_prebenda || 'NAO_PREBENDADA');

    setIsEditModalOpen(true);
  };

  const openContactsModal = (ig: Igreja) => {
    setSelectedChurch(ig);
    setFormDirigenteNome(ig.dirigente_nome || '');
    setFormDirigenteTelefone(ig.dirigente_telefone || '');
    setFormDirigenteEmail(ig.dirigente_email || '');

    let formattedPosse = '';
    if (ig.dirigente_data_posse) {
      const str = String(ig.dirigente_data_posse).trim();
      if (str.includes('T')) {
        formattedPosse = str.split('T')[0];
      } else if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
          formattedPosse = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
          formattedPosse = str;
        }
      } else {
        formattedPosse = str;
      }
    }
    setFormDirigenteDataPosse(formattedPosse);

    setFormFinanceiraNome(ig.financeira_nome || '');
    setFormFinanceiraTelefone(ig.financeira_telefone || '');
    setFormFinanceiraEmail(ig.financeira_email || '');
    setFormQtdMembros(ig.qtd_membros !== null && ig.qtd_membros !== undefined ? String(ig.qtd_membros) : '');
    setFormQtdJovens(ig.qtd_jovens !== null && ig.qtd_jovens !== undefined ? String(ig.qtd_jovens) : '');
    setFormTipoPrebenda(ig.tipo_prebenda || 'NAO_PREBENDADA');

    setIsContactsModalOpen(true);
  };

  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTotvs.trim() || !formNome.trim()) {
      toast.error('Código TOTVS e Nome da Igreja são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/igrejas/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_totvs: formTotvs.trim(),
          desc_igreja: formNome.trim(),
          tipo_imovel: formTipoImovel,
          endereco: formEndereco.trim(),
          bairro: formBairro.trim(),
          municipio: formMunicipio.trim(),
          estado: formEstado.trim().toUpperCase(),
          cep: formCep.trim(),
          link_google_maps: formLinkMaps.trim(),
          porte: formPorte,
          codigo_totvs_pai: formParentTotvs.trim() || null,
          dirigente_nome: formDirigenteNome.trim().toUpperCase(),
          dirigente_telefone: formDirigenteTelefone.trim(),
          dirigente_email: formDirigenteEmail.trim(),
          dirigente_data_posse: formDirigenteDataPosse || null,
          financeira_nome: formFinanceiraNome.trim().toUpperCase(),
          financeira_telefone: formFinanceiraTelefone.trim(),
          financeira_email: formFinanceiraEmail.trim(),
          qtd_membros: formQtdMembros ? Number(formQtdMembros) : null,
          qtd_jovens: formQtdJovens ? Number(formQtdJovens) : null,
          tipo_prebenda: formTipoPrebenda,
          status: 'PENDENTE',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Nova igreja cadastrada com sucesso!');
        setIsCreateModalOpen(false);
        await fetchIgrejasList();
      } else {
        toast.error(data.error || 'Erro ao cadastrar nova igreja.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchImportContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Selecione um arquivo CSV com as colunas TOTVS, Dirigente e Telefone.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/admin/import-contacts', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Importação concluída! ${data.count} registros processados.`);
        setIsImportContactsModalOpen(false);
        setFileToImport(null);
        await fetchIgrejasList();
      } else {
        toast.error(data.error || 'Erro ao importar contatos.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao enviar a planilha.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateChurchDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChurch) return;

    setSaving(true);
    try {
      const res = await fetch('/api/igrejas/atualizar-completo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_totvs: selectedChurch.codigo_totvs,
          desc_igreja: formNome.trim(),
          tipo_imovel: formTipoImovel,
          endereco: formEndereco.trim(),
          bairro: formBairro.trim(),
          municipio: formMunicipio.trim(),
          estado: formEstado.trim().toUpperCase(),
          cep: formCep.trim(),
          link_google_maps: formLinkMaps.trim(),
          porte: formPorte,
          codigo_totvs_pai: formParentTotvs.trim() || null,
          tipo_prebenda: formTipoPrebenda,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Igreja atualizada com sucesso!');
        setIsEditModalOpen(false);
        await fetchIgrejasList();
      } else {
        toast.error(data.error || 'Erro ao atualizar dados.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChurch) return;

    setSaving(true);
    try {
      const res = await fetch('/api/igrejas/atualizar-completo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_totvs: selectedChurch.codigo_totvs,
          dirigente_nome: formDirigenteNome.trim().toUpperCase(),
          dirigente_telefone: formDirigenteTelefone.trim(),
          dirigente_email: formDirigenteEmail.trim(),
          dirigente_data_posse: formDirigenteDataPosse || null,
          financeira_nome: formFinanceiraNome.trim().toUpperCase(),
          financeira_telefone: formFinanceiraTelefone.trim(),
          financeira_email: formFinanceiraEmail.trim(),
          qtd_membros: formQtdMembros ? Number(formQtdMembros) : null,
          qtd_jovens: formQtdJovens ? Number(formQtdJovens) : null,
          tipo_prebenda: formTipoPrebenda,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Responsáveis e contatos atualizados!');
        setIsContactsModalOpen(false);
        await fetchIgrejasList();
      } else {
        toast.error(data.error || 'Erro ao salvar contatos.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 flex flex-col font-sans text-zinc-900 dark:text-slate-100 transition-colors duration-200">
      <Toaster position="top-right" richColors closeButton />

      {/* Header Mirror with Nav Link integration */}
      <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 sticky top-0 z-[1001] shadow-xs flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
          <div className="flex items-center space-x-3 shrink-0">
            <img src="/img/logo.png" alt="IPDA" className="h-10 w-auto object-contain shadow-sm" />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                GEO-VALIG IPDA <span className="text-[10px] bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-slate-700 font-bold">GESTÃO</span>
              </h1>
              <p className="text-[9px] text-zinc-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Módulo de Igrejas e Contatos</p>
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
                className="px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all bg-white dark:bg-slate-700 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/50 dark:border-slate-650 font-bold"
              >
                <span>📍 Validação & Gestão</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-[5000] p-1 divide-y divide-zinc-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                <a
                  href="/validacao?tab=validation"
                  className="block px-3 py-2 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
                >
                  📍 Validação de Igrejas
                </a>
                <a
                  href="/gestao"
                  className="block px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 rounded-lg"
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
                className="px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50"
              >
                <span>📊 Inteligência & BI</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-[5000] p-1 divide-y divide-zinc-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
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
            <button
              onClick={handleSyncPublicMap}
              disabled={syncLoading}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full transition-all flex items-center justify-center min-w-[36px]"
              title="Sincronizar Mapa Público"
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

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Indicadores Rápidos de Cobertura (KPI Cards Topo) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-zinc-400 dark:text-slate-400 uppercase tracking-wider">🎴 Cobertura de Dirigentes</p>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white mt-0.5 font-mono">
                {kpiMetrics.dirigenteCount} <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">({kpiMetrics.dirigentePct}%)</span>
              </h3>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-slate-800 text-indigo-600 rounded-xl border border-indigo-100 dark:border-slate-700">
              <User className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-zinc-400 dark:text-slate-400 uppercase tracking-wider">💼 Cobertura Financeira</p>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white mt-0.5 font-mono">
                {kpiMetrics.financeiraCount} <span className="text-xs text-violet-600 dark:text-violet-400 font-bold">({kpiMetrics.financeiraPct}%)</span>
              </h3>
            </div>
            <div className="p-2.5 bg-violet-50 dark:bg-slate-800 text-violet-600 rounded-xl border border-violet-100 dark:border-slate-700">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-zinc-400 dark:text-slate-400 uppercase tracking-wider">🚨 Sedes Maiores Pendentes</p>
              <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                {kpiMetrics.majorPendingCount} <span className="text-xs text-amber-500 font-normal">igrejas</span>
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-slate-800 text-amber-600 rounded-xl border border-amber-100 dark:border-slate-700">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Workspace controls panel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          {/* Quick search input */}
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar por TOTVS, Nome, Município ou UF..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-slate-700">
              {filteredIgrejas.length} {filteredIgrejas.length === 1 ? 'registro' : 'registros'}
            </span>
            <button
              onClick={() => {
                setFileToImport(null);
                setIsImportContactsModalOpen(true);
              }}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
            >
              <Upload className="h-4 w-4" />
              <span>📥 Importar Contatos CSV/Excel</span>
            </button>
            <button
              onClick={openCreateModal}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Igreja</span>
            </button>
          </div>
        </div>

        {/* Painel de Filtros e Priorização de Portes */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          {/* Filter 1: Status do Contato */}
          <select
            value={filterContactStatus}
            onChange={(e) => {
              setFilterContactStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl p-2 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">Status de Contato: Todos</option>
            <option value="NO_DIRIGENTE">⚠️ Sem Dirigente Cadastrado</option>
            <option value="NO_FINANCEIRA">⚠️ Sem Voluntária Financeira</option>
            <option value="NO_BOTH">🚨 Sem Nenhum Contato</option>
            <option value="COMPLETE">✅ Com Contatos Completos</option>
          </select>

          {/* Filter 2: Porte Group */}
          <select
            value={filterPorteGroup}
            onChange={(e) => {
              setFilterPorteGroup(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 bg-zinc-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl p-2 font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">Porte: Todos os Portes</option>
            <option value="ESTADUAL_SETORIAL">🔵 Estaduais & 🟡 Setoriais</option>
            <option value="CENTRAL_REGIONAL">🟠 Centrais & 🟢 Regionais</option>
            <option value="LOCAL_OUTROS">⚪ Locais & Outros</option>
          </select>

          {/* Toggle: Priorizar Portes Maiores */}
          <button
            type="button"
            onClick={() => {
              setPrioritizeMajorPortes(!prioritizeMajorPortes);
              setCurrentPage(1);
            }}
            className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border ${
              prioritizeMajorPortes
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-sm'
                : 'bg-zinc-50 dark:bg-slate-800 text-zinc-650 dark:text-slate-350 border-zinc-200 dark:border-slate-700 hover:bg-zinc-100'
            }`}
          >
            <span>⚡ Priorizar Portes Maiores</span>
          </button>
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl">
            <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="font-bold text-zinc-800 dark:text-white">Buscando base de dados de igrejas...</h3>
          </div>
        ) : filteredIgrejas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl text-center px-4">
            <Users className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="font-bold text-zinc-800 dark:text-white">Nenhum registro encontrado</h3>
            <p className="text-xs text-zinc-500 mt-1">Nenhum resultado com base na sua pesquisa "{searchTerm}".</p>
          </div>
        ) : (
          /* Table Layout styled properly */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-slate-800/50 text-zinc-500 dark:text-slate-400 font-bold border-b border-zinc-150 dark:border-slate-800 uppercase tracking-wider">
                    <th className="p-4">TOTVS</th>
                    <th className="p-4">Nome da Igreja</th>
                    <th className="p-4">Porte</th>
                    <th className="p-4">Localização (Física)</th>
                    <th className="p-4">Dirigente Atual</th>
                    <th className="p-4">Voluntária Financeira</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-slate-800 font-medium">
                  {paginatedIgrejas.map((ig) => {
                    const porte = ig.porte || 'LOCAL';
                    const info = PORTE_INFO[porte] || PORTE_INFO.LOCAL;

                    return (
                      <tr key={ig.codigo_totvs} className="hover:bg-zinc-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-zinc-800 dark:text-slate-200">
                          {ig.codigo_totvs}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-zinc-950 dark:text-white text-sm">{ig.desc_igreja}</div>
                          <div className="text-[10px] text-zinc-400 dark:text-slate-500 font-mono mt-0.5">Pai: {ig.codigo_totvs_pai || 'Nenhum'}</div>
                        </td>
                        <td className="p-4">
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-white"
                            style={{ backgroundColor: info.color, borderColor: 'rgba(0,0,0,0.1)' }}
                          >
                            {porte}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-650 dark:text-slate-350">
                          <div className="font-semibold text-zinc-900 dark:text-white">
                            {ig.municipio || '---'} - {ig.estado || '---'}
                          </div>
                          <div className="text-[10px] truncate max-w-xs">{ig.endereco || 'Sem endereço'}</div>
                        </td>
                        <td className="p-4">
                          {ig.dirigente_nome ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                                <User className="h-3 w-3 text-indigo-500 shrink-0" />
                                {ig.dirigente_nome}
                              </div>
                              {ig.dirigente_telefone && (
                                <div className="text-[10px] text-zinc-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                                  <Phone className="h-2.5 w-2.5" />
                                  {ig.dirigente_telefone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openContactsModal(ig)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 inline-flex cursor-pointer transition-all"
                            >
                              <span>⚠️ Cadastrar Contato</span>
                            </button>
                          )}
                        </td>
                        <td className="p-4">
                          {ig.financeira_nome ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                                <User className="h-3 w-3 text-violet-500 shrink-0" />
                                {ig.financeira_nome}
                              </div>
                              {ig.financeira_telefone && (
                                <div className="text-[10px] text-zinc-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                                  <Phone className="h-2.5 w-2.5" />
                                  {ig.financeira_telefone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openContactsModal(ig)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 inline-flex cursor-pointer transition-all"
                            >
                              <span>⚠️ Cadastrar Contato</span>
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(ig)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                              title="Editar Igreja e Endereço"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openContactsModal(ig)}
                              className="p-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-violet-100"
                              title="Gerenciar Contatos / Responsáveis"
                            >
                              <Users className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 bg-zinc-50 dark:bg-slate-800/50 border-t border-zinc-150 dark:border-slate-800 flex items-center justify-between shrink-0">
                <span className="text-xs text-zinc-500 dark:text-slate-400 font-semibold font-mono">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-1.5 border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-zinc-650 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="p-1.5 border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-zinc-650 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ➕ Modal: Nova Igreja */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh]">
            <div className="p-5 border-b border-zinc-100 dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Building2 className="h-5 w-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Cadastrar Nova Igreja IPDA</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChurch} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Código TOTVS *</label>
                  <input
                    type="text"
                    required
                    value={formTotvs}
                    onChange={(e) => setFormTotvs(e.target.value.toUpperCase())}
                    placeholder="Ex: 10045"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Descrição / Nome da Igreja *</label>
                    <button
                      type="button"
                      onClick={generateStandardName}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                      title="Gerar Nome Padronizado no formato {PORTE} - {UF}-{MUNICIPIO}-{BAIRRO}"
                    >
                      ✨ Padronizar Nome
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value.toUpperCase())}
                    placeholder="Ex: CENTRAL - SP-SANTO ANDRE-CENTRO"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value.toUpperCase())}
                  placeholder="Ex: RUA BASÍLIO FAZZI, 120"
                  className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formBairro}
                    onChange={(e) => setFormBairro(e.target.value.toUpperCase())}
                    placeholder="Ex: CENTRO"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Município</label>
                  <input
                    type="text"
                    value={formMunicipio}
                    onChange={(e) => setFormMunicipio(e.target.value.toUpperCase())}
                    placeholder="Ex: SANTO ANDRÉ"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value.toUpperCase())}
                    placeholder="Ex: SP"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">CEP (Busca ViaCEP)</label>
                    <span className="text-[9px] text-zinc-400 font-medium">Auto-preenche endereço</span>
                  </div>
                  <input
                    type="text"
                    value={formCep}
                    onChange={(e) => handleCepBlurOrChange(e.target.value)}
                    placeholder="Ex: 09015-000"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Tipo de Imóvel</label>
                  <select
                    value={formTipoImovel}
                    onChange={(e) => setFormTipoImovel(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none"
                  >
                    <option value="PROPRIO">Próprio</option>
                    <option value="ALUGADO">Alugado</option>
                    <option value="CEDIDO">Cedido/Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Link Google Maps (Extrairá Lat/Lng)</label>
                <input
                  type="text"
                  value={formLinkMaps}
                  onChange={(e) => setFormLinkMaps(e.target.value)}
                  placeholder="Ex: https://maps.google.com/?q=-23.55,-46.63"
                  className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Porte</label>
                  <select
                    value={formPorte}
                    onChange={(e) => setFormPorte(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none"
                  >
                    {Object.keys(PORTE_INFO).map((porte) => (
                      <option key={porte} value={porte}>{porte}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Código TOTVS Sede Superior (Pai)</label>
                  <input
                    type="text"
                    value={formParentTotvs}
                    onChange={(e) => setFormParentTotvs(e.target.value.toUpperCase())}
                    placeholder="Ex: 10001"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {formParentTotvs.trim() && (
                    <div className="mt-1 text-[10px] font-bold">
                      {parentChurchMatch ? (
                        <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-block">
                          ✓ Sede Pai Encontrada: {parentChurchMatch.porte || 'LOCAL'} - {parentChurchMatch.estado}-{parentChurchMatch.municipio}
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block">
                          ⚠️ Sede Pai TOTVS "{formParentTotvs}" não encontrada na base.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts Block inside creation modal */}
              <div className="pt-4 border-t border-zinc-150 dark:border-slate-800 space-y-3">
                <div className="text-xs font-black text-zinc-800 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Contatos e Responsáveis Iniciais (Opcional)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 block">Nome do Dirigente</label>
                    <input
                      type="text"
                      value={formDirigenteNome}
                      onChange={(e) => setFormDirigenteNome(e.target.value.toUpperCase())}
                      placeholder="Ex: PR. CARLOS"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase"
                    />
                    <label className="text-[10px] font-bold text-zinc-500 block">Telefone do Dirigente</label>
                    <input
                      type="text"
                      value={formDirigenteTelefone}
                      onChange={(e) => setFormDirigenteTelefone(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                    <label className="text-[10px] font-bold text-zinc-500 block">Data de Posse/Início do Dirigente</label>
                    <input
                      type="date"
                      value={formDirigenteDataPosse}
                      onChange={(e) => setFormDirigenteDataPosse(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                    <label className="text-[10px] font-bold text-zinc-500 block">Prebenda do Dirigente</label>
                    <select
                      value={formTipoPrebenda}
                      onChange={(e) => setFormTipoPrebenda(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    >
                      <option value="NAO_PREBENDADA">Não Prebendada - Dirigente Voluntário</option>
                      <option value="PREBENDADA">Prebendada - Dedicação Exclusiva / Remunerado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 block">Nome da Voluntária Financeira</label>
                    <input
                      type="text"
                      value={formFinanceiraNome}
                      onChange={(e) => setFormFinanceiraNome(e.target.value)}
                      placeholder="Ex: Irmã Maria"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                    <label className="text-[10px] font-bold text-zinc-500 block">Telefone da Financeira</label>
                    <input
                      type="text"
                      value={formFinanceiraTelefone}
                      onChange={(e) => setFormFinanceiraTelefone(e.target.value)}
                      placeholder="Ex: (11) 91234-5678"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Salvar Igreja</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📝 Modal: Editar Igreja & Endereço */}
      {isEditModalOpen && selectedChurch && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh]">
            <div className="p-5 border-b border-zinc-100 dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Edit className="h-5 w-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Editar Igreja & Endereço</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateChurchDetails} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="bg-zinc-50 dark:bg-slate-800/50 p-3 rounded-xl border border-zinc-150 dark:border-slate-800 text-xs">
                <span className="font-bold text-zinc-600">Código TOTVS: </span>
                <span className="font-mono font-bold text-zinc-800 dark:text-slate-100">{selectedChurch.codigo_totvs}</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Descrição / Nome da Igreja *</label>
                  <button
                    type="button"
                    onClick={generateStandardName}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    title="Gerar Nome Padronizado no formato {PORTE} - {UF}-{MUNICIPIO}-{BAIRRO}"
                  >
                    ✨ Padronizar Nome
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Endereço</label>
                <input
                  type="text"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formBairro}
                    onChange={(e) => setFormBairro(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Município</label>
                  <input
                    type="text"
                    value={formMunicipio}
                    onChange={(e) => setFormMunicipio(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Estado</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">CEP (Busca ViaCEP)</label>
                    <span className="text-[9px] text-zinc-400 font-medium">Auto-preenche endereço</span>
                  </div>
                  <input
                    type="text"
                    value={formCep}
                    onChange={(e) => handleCepBlurOrChange(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Tipo de Imóvel</label>
                  <select
                    value={formTipoImovel}
                    onChange={(e) => setFormTipoImovel(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none"
                  >
                    <option value="PROPRIO">Próprio</option>
                    <option value="ALUGADO">Alugado</option>
                    <option value="CEDIDO">Cedido/Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Link Google Maps (Recalcula Coordenadas no salvamento)</label>
                <input
                  type="text"
                  value={formLinkMaps}
                  onChange={(e) => setFormLinkMaps(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Porte</label>
                  <select
                    value={formPorte}
                    onChange={(e) => setFormPorte(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none"
                  >
                    {Object.keys(PORTE_INFO).map((porte) => (
                      <option key={porte} value={porte}>{porte}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Código TOTVS Sede Superior (Pai)</label>
                  <input
                    type="text"
                    value={formParentTotvs}
                    onChange={(e) => setFormParentTotvs(e.target.value.toUpperCase())}
                    placeholder="Sem igreja pai vinculada"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {formParentTotvs.trim() && (
                    <div className="mt-1 text-[10px] font-bold">
                      {parentChurchMatch ? (
                        <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-block">
                          ✓ Sede Pai Encontrada: {parentChurchMatch.porte || 'LOCAL'} - {parentChurchMatch.estado}-{parentChurchMatch.municipio}
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block">
                          ⚠️ Sede Pai TOTVS "{formParentTotvs}" não encontrada na base.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📥 Modal: Importar Contatos CSV/Excel */}
      {isImportContactsModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-zinc-100 dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Upload className="h-5 w-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Importar Contatos CSV</h3>
              </div>
              <button
                onClick={() => setIsImportContactsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBatchImportContacts} className="p-6 space-y-4">
              <p className="text-xs text-zinc-600 dark:text-slate-300">
                Selecione uma planilha em formato <strong className="font-mono text-emerald-600">.csv</strong> contendo as colunas <strong className="text-zinc-900 dark:text-white">TOTVS</strong>, <strong className="text-zinc-900 dark:text-white">Dirigente</strong> e <strong className="text-zinc-900 dark:text-white">Telefone</strong>.
              </p>

              <div className="border-2 border-dashed border-zinc-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFileToImport(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <Upload className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                {importFile ? (
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    📄 {importFile.name} <span className="text-[10px] text-zinc-400 font-normal">({(importFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">Clique para escolher o arquivo CSV</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Delimitado por ponto e vírgula (;) ou vírgula (,)</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportContactsModalOpen(false)}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !importFile}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{uploading ? 'Processando...' : 'Iniciar Importação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 👥 Modal: Gerenciar Responsáveis (Dirigente e Financeira) */}
      {isContactsModalOpen && selectedChurch && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-[620px] w-full shadow-2xl border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-800/40 shrink-0">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                <Users className="h-5 w-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Gerenciar Responsáveis</h3>
              </div>
              <button
                onClick={() => setIsContactsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateContacts} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="text-xs bg-zinc-50 dark:bg-slate-800/40 p-3 border border-zinc-150 dark:border-slate-800 rounded-xl space-y-0.5">
                <div className="font-bold text-zinc-950 dark:text-white text-xs sm:text-sm">{selectedChurch.desc_igreja}</div>
                <div className="text-zinc-500 font-medium text-[11px]">TOTVS: {selectedChurch.codigo_totvs} • {selectedChurch.municipio} - {selectedChurch.estado}</div>
              </div>

              {/* Seção Dirigente Atual */}
              <div className="space-y-3 bg-zinc-50/40 dark:bg-slate-800/30 p-3.5 rounded-xl border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  👤 Dirigente Atual
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {/* Linha 1: Nome Completo (col-span-2) */}
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={formDirigenteNome}
                      onChange={(e) => setFormDirigenteNome(e.target.value.toUpperCase())}
                      placeholder="Ex: PR. CARLOS ALBERTO"
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  {/* Linha 2: Telefone/WhatsApp | Email */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formDirigenteTelefone}
                      onChange={(e) => setFormDirigenteTelefone(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Email</label>
                    <input
                      type="email"
                      value={formDirigenteEmail}
                      onChange={(e) => setFormDirigenteEmail(e.target.value)}
                      placeholder="Ex: dirigente@ipda.com.br"
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  {/* Linha 3: Data de Posse | Condição Pastoral / Prebenda */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Data de Posse/Início</label>
                    <input
                      type="date"
                      value={formDirigenteDataPosse}
                      onChange={(e) => setFormDirigenteDataPosse(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Condição Pastoral / Prebenda</label>
                    <select
                      value={formTipoPrebenda}
                      onChange={(e) => setFormTipoPrebenda(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="PREBENDADA">💼 Prebendado (Dedicação Exclusiva / Salariado)</option>
                      <option value="NAO_PREBENDADA">🤝 Voluntário (Sem Prebenda)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção Membresia & Estatísticas */}
              <div className="space-y-3 bg-zinc-50/40 dark:bg-slate-800/30 p-3.5 rounded-xl border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  👥 Membresia & Estatísticas
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Quantidade de Membros</label>
                    <input
                      type="number"
                      min="0"
                      value={formQtdMembros}
                      onChange={(e) => setFormQtdMembros(e.target.value)}
                      placeholder="Ex: 120"
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Quantidade de Jovens</label>
                    <input
                      type="number"
                      min="0"
                      value={formQtdJovens}
                      onChange={(e) => setFormQtdJovens(e.target.value)}
                      placeholder="Ex: 35"
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seção Voluntária Financeira */}
              <div className="space-y-3 bg-zinc-50/40 dark:bg-slate-800/30 p-3.5 rounded-xl border border-zinc-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1">
                  👤 Voluntária Financeira
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {/* Linha 1: Nome Completo (col-span-2) */}
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={formFinanceiraNome}
                      onChange={(e) => setFormFinanceiraNome(e.target.value.toUpperCase())}
                      placeholder="Ex: IRMÃ MARIA DE SOUZA"
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  {/* Linha 2: Telefone/WhatsApp | Email */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formFinanceiraTelefone}
                      onChange={(e) => setFormFinanceiraTelefone(e.target.value)}
                      placeholder="Ex: (11) 91234-5678"
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Email</label>
                    <input
                      type="email"
                      value={formFinanceiraEmail}
                      onChange={(e) => setFormFinanceiraEmail(e.target.value)}
                      placeholder="Ex: financeira@ipda.com.br"
                      className="w-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-slate-800 flex justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsContactsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-slate-800 hover:bg-zinc-200 text-zinc-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1 transition-all"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Salvar Responsáveis</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
