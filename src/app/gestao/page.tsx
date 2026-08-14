'use client';

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

  // Form State: Responsibles
  const [formDirigenteNome, setFormDirigenteNome] = useState('');
  const [formDirigenteTelefone, setFormDirigenteTelefone] = useState('');
  const [formDirigenteEmail, setFormDirigenteEmail] = useState('');
  const [formFinanceiraNome, setFormFinanceiraNome] = useState('');
  const [formFinanceiraTelefone, setFormFinanceiraTelefone] = useState('');
  const [formFinanceiraEmail, setFormFinanceiraEmail] = useState('');

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

  // Sync public map / cache clear trigger
  const handleSyncPublicMap = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.revalidated) {
        toast.success("Mapa público sincronizado com sucesso! As atualizações de contatos e endereços já estão propagadas.");
        router.refresh();
      } else {
        toast.error("Erro ao sincronizar mapa público.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao sincronizar mapa público. Verifique a conexão.");
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

  // Typing search trigger
  useEffect(() => {
    startTransition(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    });
  }, [searchInput]);

  // Exact Match First search filter alg
  const filteredIgrejas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return igrejas;

    const numericTerm = term.replace(/^0+/, '');
    const isPureNumeric = /^\d+$/.test(numericTerm);

    if (isPureNumeric) {
      // Look for exact TOTVS match first
      const exact = igrejas.find((ig) => ig.codigo_totvs.trim().replace(/^0+/, '') === numericTerm);
      if (exact) {
        return [exact];
      }
    }

    return igrejas.filter((ig) => {
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
  }, [igrejas, searchTerm]);

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
    setFormFinanceiraNome('');
    setFormFinanceiraTelefone('');
    setFormFinanceiraEmail('');

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

    setIsEditModalOpen(true);
  };

  const openContactsModal = (ig: Igreja) => {
    setSelectedChurch(ig);
    setFormDirigenteNome(ig.dirigente_nome || '');
    setFormDirigenteTelefone(ig.dirigente_telefone || '');
    setFormDirigenteEmail(ig.dirigente_email || '');
    setFormFinanceiraNome(ig.financeira_nome || '');
    setFormFinanceiraTelefone(ig.financeira_telefone || '');
    setFormFinanceiraEmail(ig.financeira_email || '');

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
          dirigente_nome: formDirigenteNome.trim(),
          dirigente_telefone: formDirigenteTelefone.trim(),
          dirigente_email: formDirigenteEmail.trim(),
          financeira_nome: formFinanceiraNome.trim(),
          financeira_telefone: formFinanceiraTelefone.trim(),
          financeira_email: formFinanceiraEmail.trim(),
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
          dirigente_nome: formDirigenteNome.trim(),
          dirigente_telefone: formDirigenteTelefone.trim(),
          dirigente_email: formDirigenteEmail.trim(),
          financeira_nome: formFinanceiraNome.trim(),
          financeira_telefone: formFinanceiraTelefone.trim(),
          financeira_email: formFinanceiraEmail.trim(),
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

          {/* Nav Pills including Gestao */}
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

            <button
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 bg-white dark:bg-slate-750 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/50 dark:border-slate-650 font-bold"
            >
              <span>👥 Gestão</span>
            </button>

            <a
              href="/validacao?tab=dashboard"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50"
            >
              <span>📊 Dashboard</span>
            </a>

            <a
              href="/validacao?tab=upload"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1 text-zinc-650 dark:text-slate-350 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-slate-700/50"
            >
              <span>📥 Importar</span>
            </a>
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
                            <span className="text-zinc-400 italic text-[11px]">Não registrado</span>
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
                            <span className="text-zinc-400 italic text-[11px]">Não registrado</span>
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
                    onChange={(e) => setFormTotvs(e.target.value)}
                    placeholder="Ex: 10045"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Descrição / Nome da Igreja *</label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Central Santo André"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                  placeholder="Ex: Rua Basílio Fazzi, 120"
                  className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formBairro}
                    onChange={(e) => setFormBairro(e.target.value)}
                    placeholder="Ex: Centro"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Município</label>
                  <input
                    type="text"
                    value={formMunicipio}
                    onChange={(e) => setFormMunicipio(e.target.value)}
                    placeholder="Ex: Santo André"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value)}
                    placeholder="Ex: SP"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">CEP</label>
                  <input
                    type="text"
                    value={formCep}
                    onChange={(e) => setFormCep(e.target.value)}
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
                    onChange={(e) => setFormParentTotvs(e.target.value)}
                    placeholder="Ex: 10001"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
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
                      onChange={(e) => setFormDirigenteNome(e.target.value)}
                      placeholder="Ex: Pr. Carlos"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                    <label className="text-[10px] font-bold text-zinc-500 block">Telefone do Dirigente</label>
                    <input
                      type="text"
                      value={formDirigenteTelefone}
                      onChange={(e) => setFormDirigenteTelefone(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>

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
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Descrição / Nome da Igreja *</label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Endereço</label>
                <input
                  type="text"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Bairro</label>
                  <input
                    type="text"
                    value={formBairro}
                    onChange={(e) => setFormBairro(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Município</label>
                  <input
                    type="text"
                    value={formMunicipio}
                    onChange={(e) => setFormMunicipio(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Estado</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">CEP</label>
                  <input
                    type="text"
                    value={formCep}
                    onChange={(e) => setFormCep(e.target.value)}
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
                    onChange={(e) => setFormParentTotvs(e.target.value)}
                    placeholder="Sem igreja pai vinculada"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-zinc-100 dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-800/40">
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

            <form onSubmit={handleUpdateContacts} className="p-6 space-y-5">
              <div className="text-xs bg-zinc-50 dark:bg-slate-800/40 p-3.5 border border-zinc-150 dark:border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-zinc-950 dark:text-white text-sm">{selectedChurch.desc_igreja}</div>
                <div className="text-zinc-500 font-medium">TOTVS: {selectedChurch.codigo_totvs} • {selectedChurch.municipio} - {selectedChurch.estado}</div>
              </div>

              {/* Dirigente Form fields */}
              <div className="space-y-3 bg-zinc-50/30 p-4 rounded-xl border border-zinc-150">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                  👤 Dirigente Atual
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={formDirigenteNome}
                      onChange={(e) => setFormDirigenteNome(e.target.value)}
                      placeholder="Ex: Pr. Carlos Alberto"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formDirigenteTelefone}
                      onChange={(e) => setFormDirigenteTelefone(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">Email</label>
                  <input
                    type="email"
                    value={formDirigenteEmail}
                    onChange={(e) => setFormDirigenteEmail(e.target.value)}
                    placeholder="Ex: dirigente@ipda.com.br"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Financeira Form fields */}
              <div className="space-y-3 bg-zinc-50/30 p-4 rounded-xl border border-zinc-150">
                <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider flex items-center gap-1">
                  👤 Voluntária Financeira
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={formFinanceiraNome}
                      onChange={(e) => setFormFinanceiraNome(e.target.value)}
                      placeholder="Ex: Irmã Maria de Souza"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formFinanceiraTelefone}
                      onChange={(e) => setFormFinanceiraTelefone(e.target.value)}
                      placeholder="Ex: (11) 91234-5678"
                      className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">Email</label>
                  <input
                    type="email"
                    value={formFinanceiraEmail}
                    onChange={(e) => setFormFinanceiraEmail(e.target.value)}
                    placeholder="Ex: financeira@ipda.com.br"
                    className="w-full bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsContactsModalOpen(false)}
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
