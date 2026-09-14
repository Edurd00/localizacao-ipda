'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  User,
  ShieldCheck,
  Send,
  Volume2,
  Armchair,
  Wind,
  Coffee,
  Check,
  Printer,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  Layers,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  ItemPatrimonialForm,
  formatarTelefone,
  validarTelefoneComDdd,
} from '@/lib/patrimonioValidation';

interface ChurchData {
  codigo_totvs: string;
  desc_igreja: string;
  endereco: string;
  bairro: string;
  municipio: string;
  estado: string;
}

const ITENS_PADRAO: Array<{ id: string; nome: string; categoria: string }> = [
  // Mobiliário e Estrutura
  { id: 'banco', nome: 'Bancos da Nave', categoria: 'Mobiliário e Estrutura' },
  { id: 'cadeira', nome: 'Cadeiras do Presbitério / Altar', categoria: 'Mobiliário e Estrutura' },
  { id: 'bebedouroFiltro', nome: 'Bebedouro ou Filtro de Água', categoria: 'Mobiliário e Estrutura' },
  { id: 'armario', nome: 'Armário', categoria: 'Mobiliário e Estrutura' },
  { id: 'mesa', nome: 'Mesa da Santa Ceia', categoria: 'Mobiliário e Estrutura' },
  { id: 'cofreBocaLobo', nome: 'Cofre Boca de Lobo', categoria: 'Mobiliário e Estrutura' },
  { id: 'pulpito', nome: 'Púlpito do Altar', categoria: 'Mobiliário e Estrutura' },

  // Eletrônicos e Climatização
  { id: 'ar', nome: 'Ar Condicionado', categoria: 'Eletrônicos e Climatização' },
  { id: 'ventilador', nome: 'Ventiladores (Teto / Parede)', categoria: 'Eletrônicos e Climatização' },
  { id: 'computador', nome: 'Computador / Notebook', categoria: 'Eletrônicos e Climatização' },
  { id: 'impressora', nome: 'Impressora', categoria: 'Eletrônicos e Climatização' },
  { id: 'projetor', nome: 'Projetor (Data Show)', categoria: 'Eletrônicos e Climatização' },
  { id: 'telaProjetor', nome: 'Tela de Projetor / Telão', categoria: 'Eletrônicos e Climatização' },
  { id: 'telefonePatrimonio', nome: 'Telefone Fixo da Igreja', categoria: 'Eletrônicos e Climatização' },
  { id: 'celular', nome: 'Aparelho Celular da Igreja', categoria: 'Eletrônicos e Climatização' },
  { id: 'cameraSeguranca', nome: 'Câmeras de Segurança (CFTV)', categoria: 'Eletrônicos e Climatização' },

  // Som e Instrumentos
  { id: 'microfone', nome: 'Microfones (Com / Sem Fio)', categoria: 'Som e Instrumentos' },
  { id: 'caixaSom', nome: 'Caixas de Som (Ativas / Passivas)', categoria: 'Som e Instrumentos' },
  { id: 'mesaSom', nome: 'Mesa de Som', categoria: 'Som e Instrumentos' },
  { id: 'violao', nome: 'Violão', categoria: 'Som e Instrumentos' },
  { id: 'guitarra', nome: 'Guitarra', categoria: 'Som e Instrumentos' },
  { id: 'bateria', nome: 'Bateria (Acústica / Eletrônica)', categoria: 'Som e Instrumentos' },
  { id: 'contrabaixo', nome: 'Contrabaixo', categoria: 'Som e Instrumentos' },
  { id: 'teclado', nome: 'Teclado Musical / Piano Digital', categoria: 'Som e Instrumentos' },

  // Cozinha e Segurança
  { id: 'freezer', nome: 'Freezer', categoria: 'Cozinha e Segurança' },
  { id: 'geladeira', nome: 'Geladeira / Frigobar', categoria: 'Cozinha e Segurança' },
  { id: 'fogao', nome: 'Fogão', categoria: 'Cozinha e Segurança' },
  { id: 'botijao', nome: 'Botijão de Gás', categoria: 'Cozinha e Segurança' },
  { id: 'microondas', nome: 'Micro-ondas', categoria: 'Cozinha e Segurança' },
  { id: 'extintor', nome: 'Extintores de Incêndio', categoria: 'Cozinha e Segurança' },
];

const CATEGORIAS_ICONES: Record<string, any> = {
  'Mobiliário e Estrutura': Armchair,
  'Eletrônicos e Climatização': Wind,
  'Som e Instrumentos': Volume2,
  'Cozinha e Segurança': Coffee,
  'Itens Adicionais': Layers,
};

const ETAPAS_WIZARD = [
  { numero: 1, titulo: '1. Igreja e Dirigente', subtitulo: 'Identificação do Templo' },
  { numero: 2, titulo: '2. Bens e Itens', subtitulo: 'Móveis e Equipamentos' },
  { numero: 3, titulo: '3. Envio e Confirmação', subtitulo: 'Revisão e Transmissão' },
];

const OPCOES_CONSERVACAO: Array<{ value: 'ÓTIMO' | 'BOM' | 'REGULAR' | 'RUIM'; label: string }> = [
  { value: 'ÓTIMO', label: 'Ótimo' },
  { value: 'BOM', label: 'Bom' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'RUIM', label: 'Ruim' },
];

export default function PatrimonioClientForm({ totvs: initialTotvs }: { totvs?: string }) {
  const isDirectLink = Boolean(initialTotvs && initialTotvs.trim().length > 0);
  const [codigoTotvs, setCodigoTotvs] = useState<string>(initialTotvs?.trim() || '');

  const [etapaAtual, setEtapaAtual] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(isDirectLink);
  const [searchingChurch, setSearchingChurch] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [church, setChurch] = useState<ChurchData | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [isModalConfirmacaoAberto, setIsModalConfirmacaoAberto] = useState<boolean>(false);

  // Etapa 1: Responsável
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [telefoneResponsavel, setTelefoneResponsavel] = useState('');
  const [anoReferencia] = useState(new Date().getFullYear());
  const [errosEtapa1, setErrosEtapa1] = useState<Record<string, string>>({});

  // Etapa 2: Itens
  const [itens, setItens] = useState<ItemPatrimonialForm[]>(() =>
    ITENS_PADRAO.map((it) => ({
      id: it.id,
      item_nome: it.nome,
      categoria: it.categoria,
      quantidade: 1,
      possui: false,
      conservacao: 'BOM',
      observacao: '',
    }))
  );
  const [novoItemNome, setNovoItemNome] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('TODAS');

  // Etapa 3: Observações
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Rota direta TOTVS
  useEffect(() => {
    if (isDirectLink && initialTotvs) {
      setLoading(true);
      fetch(`/api/igrejas/public-lookup?totvs=${encodeURIComponent(initialTotvs.trim())}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.igreja) {
            setChurch(json.igreja);
          } else {
            setChurch(null);
            toast.error('Código TOTVS não localizado. Verifique o número com a sua regional.');
          }
        })
        .catch(() => {
          setChurch(null);
          toast.error('Código TOTVS não localizado. Verifique o número com a sua regional.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isDirectLink, initialTotvs]);

  // Digitação manual TOTVS
  useEffect(() => {
    if (isDirectLink) return;

    const query = codigoTotvs.trim();
    if (!query) {
      setChurch(null);
      setSearchingChurch(false);
      return;
    }

    setSearchingChurch(true);
    const timer = setTimeout(() => {
      fetch(`/api/igrejas/public-lookup?totvs=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.igreja) {
            setChurch(json.igreja);
          } else {
            setChurch(null);
            toast.error('Código TOTVS não localizado. Verifique o número com a sua regional.');
          }
        })
        .catch(() => {
          setChurch(null);
          toast.error('Código TOTVS não localizado. Verifique o número com a sua regional.');
        })
        .finally(() => {
          setSearchingChurch(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [codigoTotvs, isDirectLink]);

  // Handlers
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarTelefone(e.target.value);
    setTelefoneResponsavel(formatado);
  };

  const handleTogglePossui = (id: string) => {
    setItens((prev) =>
      prev.map((it) => (it.id === id ? { ...it, possui: !it.possui } : it))
    );
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setItens((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const novaQtd = Math.max(1, (it.quantidade || 1) + delta);
          return { ...it, quantidade: novaQtd };
        }
        return it;
      })
    );
  };

  const handleConservacaoChange = (
    id: string,
    conservacao: 'ÓTIMO' | 'BOM' | 'REGULAR' | 'RUIM'
  ) => {
    setItens((prev) =>
      prev.map((it) => (it.id === id ? { ...it, conservacao } : it))
    );
  };

  const handleObservacaoItemChange = (id: string, text: string) => {
    setItens((prev) =>
      prev.map((it) => (it.id === id ? { ...it, observacao: text } : it))
    );
  };

  const handleAddCustomItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nome = novoItemNome.trim();
    if (!nome) {
      toast.warning('Digite o nome do bem a ser adicionado.');
      return;
    }

    const jaExiste = itens.some(
      (it) => it.item_nome.toLowerCase() === nome.toLowerCase()
    );
    if (jaExiste) {
      toast.warning('Este item já consta na lista de bens.');
      return;
    }

    const novoItem: ItemPatrimonialForm = {
      id: `custom_${Date.now()}`,
      item_nome: nome,
      categoria: 'Itens Adicionais',
      quantidade: 1,
      possui: true,
      conservacao: 'BOM',
      observacao: '',
      isCustom: true,
    };

    setItens((prev) => [...prev, novoItem]);
    setNovoItemNome('');
    toast.success(`"${nome}" adicionado com sucesso!`);
  };

  const handleRemoveCustomItem = (id: string) => {
    setItens((prev) => prev.filter((it) => it.id !== id));
    toast.info('Item removido.');
  };

  // Navegação
  const handleAvancarEtapa = () => {
    if (etapaAtual === 1) {
      const erros: Record<string, string> = {};

      if (!codigoTotvs.trim()) {
        erros.codigo_totvs = 'Informe o Código TOTVS da igreja.';
      } else if (!church) {
        erros.codigo_totvs = 'Código TOTVS não localizado ou congregação não encontrada.';
      }

      if (!nomeResponsavel.trim() || nomeResponsavel.trim().length < 3) {
        erros.nome_responsavel = 'Informe o nome completo do Dirigente Local.';
      }

      const telVal = validarTelefoneComDdd(telefoneResponsavel);
      if (!telVal.valido) {
        erros.telefone_responsavel = telVal.erro || 'Informe o telefone completo com DDD.';
      }

      if (Object.keys(erros).length > 0) {
        setErrosEtapa1(erros);
        toast.error('Por favor, corrija os erros destacados no formulário.');
        return;
      }
      setErrosEtapa1({});
    }

    if (etapaAtual === 2) {
      const totalPossui = itens.filter((i) => i.possui).length;
      if (totalPossui === 0) {
        const confirmEmpty = confirm(
          'Nenhum bem foi marcado como "Possui". Deseja realmente prosseguir sem nenhum item de patrimônio?'
        );
        if (!confirmEmpty) return;
      }
    }

    setEtapaAtual((prev) => Math.min(3, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVoltarEtapa = () => {
    setEtapaAtual((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submissão
  const handleConfirmarEnvio = async () => {
    setIsModalConfirmacaoAberto(false);
    setSubmitting(true);

    try {
      const cleanDigitsTel = telefoneResponsavel.replace(/\D/g, '');
      const itensDeclarados = itens.map((it) => ({
        item_nome: it.item_nome,
        quantidade: it.possui ? it.quantidade : 0,
        possui: it.possui ? 'Sim' : 'Não',
        conservacao: it.conservacao,
        observacao: it.observacao || null,
      }));

      const payload = {
        codigo_totvs: codigoTotvs.trim(),
        nome_responsavel: nomeResponsavel.trim(),
        telefone_responsavel: cleanDigitsTel,
        cargo_responsavel: 'Dirigente Local',
        ano_referencia: anoReferencia,
        observacoes: observacoesGerais.trim() || null,
        itens: itensDeclarados,
      };

      const res = await fetch('/api/patrimonio/public-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao processar a submissão.');
      }

      setProtocolo(`PAT-${codigoTotvs.trim()}-${Date.now().toString().slice(-6)}`);
      setSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Declaração de patrimônio enviada com sucesso!');
    } catch (err: any) {
      console.error('Erro na submissão de patrimônio:', err);
      toast.error(err.message || 'Erro ao enviar dados. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center border border-slate-200 flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
          <h3 className="font-extrabold text-slate-900 text-lg">Carregando Formulário...</h3>
          <p className="text-slate-500 text-sm">Consultando congregação no sistema</p>
        </div>
      </div>
    );
  }

  // Tela de Sucesso
  if (submittedSuccess) {
    const itensPositivos = itens.filter((i) => i.possui);
    return (
      <div className="w-full max-w-4xl mx-auto h-auto min-h-fit pb-16 pt-8 px-4 font-sans">
        <Toaster position="top-center" richColors />
        <div className="bg-white w-full rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-white/10">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Declaração Concluída!</h2>
            <p className="text-emerald-100 text-base mt-2">
              O inventário patrimonial foi transmitido com sucesso.
            </p>
            {protocolo && (
              <div className="mt-4 inline-block bg-white/20 backdrop-blur-md px-5 py-2 rounded-full text-sm font-mono font-bold tracking-wider">
                Protocolo: {protocolo}
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Congregação</span>
                  <h4 className="font-black text-slate-900 text-lg">{church?.desc_igreja}</h4>
                </div>
                <span className="bg-indigo-100 text-indigo-900 font-mono font-bold px-3 py-1 rounded-xl text-sm">
                  TOTVS: {church?.codigo_totvs}
                </span>
              </div>
              <p className="text-slate-700 text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                {church?.endereco}, {church?.bairro} - {church?.municipio}/{church?.estado}
              </p>
              <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800 text-sm">
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Dirigente Responsável</span>
                  <span className="font-bold">{nomeResponsavel}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Ano de Referência</span>
                  <span className="font-mono font-bold">{anoReferencia}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5">
              <h5 className="font-extrabold text-sm uppercase tracking-wider text-slate-600 mb-4 flex items-center justify-between">
                <span>Resumo dos Bens Cadastrados</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-xs">
                  {itensPositivos.length} tipos de bens
                </span>
              </h5>

              {itensPositivos.length === 0 ? (
                <p className="text-slate-400 text-sm italic">Nenhum bem registrado como existente.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-sm">
                  {itensPositivos.map((it, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-base">{it.item_nome}</span>
                        <span className="text-xs text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded font-medium">
                          {it.conservacao}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">
                        Qtd: {it.quantidade}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Printer className="h-5 w-5" />
                Imprimir Comprovante
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmittedSuccess(false);
                  setEtapaAtual(1);
                }}
                className="h-14 px-6 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl font-extrabold text-base transition-all cursor-pointer"
              >
                Nova Atualização
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categoriasEtapa2 = ['TODAS', ...Array.from(new Set(itens.map((i) => i.categoria)))];
  const itensExibidos =
    categoriaAtiva === 'TODAS'
      ? itens
      : itens.filter((it) => it.categoria === categoriaAtiva);

  const totalBensDeclarados = itens.filter((i) => i.possui).length;

  return (
    <div className="w-full max-w-4xl mx-auto h-auto min-h-fit pb-16 pt-6 px-3 sm:px-6 font-sans text-slate-900">
      <Toaster position="top-center" richColors />

      <div className="space-y-6">
        {/* Header Oficial */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white text-xs font-black tracking-wider uppercase px-3 py-1 rounded-md">
                  IPDA
                </span>
                <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
                  Controle Patrimonial
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Declaração de Patrimônio da Igreja
              </h1>
              <p className="text-slate-600 text-sm sm:text-base">
                Preenchimento acessível e direto para inventário dos bens e equipamentos materiais.
              </p>
            </div>
          </div>
        </div>

        {/* Stepper topo de 3 etapas */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-2">
            {ETAPAS_WIZARD.map((step) => {
              const isConcluida = etapaAtual > step.numero;
              const isAtiva = etapaAtual === step.numero;

              return (
                <button
                  key={step.numero}
                  type="button"
                  onClick={() => {
                    if (step.numero < etapaAtual) setEtapaAtual(step.numero);
                  }}
                  disabled={step.numero > etapaAtual}
                  className={`flex flex-col items-center sm:items-start p-3 rounded-2xl transition-all text-left ${
                    isAtiva
                      ? 'bg-indigo-50 border-2 border-indigo-600 shadow-sm'
                      : isConcluida
                      ? 'bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200'
                      : 'opacity-50 cursor-not-allowed border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                        isConcluida
                          ? 'bg-emerald-600 text-white'
                          : isAtiva
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isConcluida ? <Check className="h-4 w-4" /> : step.numero}
                    </div>
                    <span
                      className={`hidden sm:inline-block text-sm font-extrabold ${
                        isAtiva ? 'text-indigo-950' : isConcluida ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {step.titulo}
                    </span>
                  </div>
                  <span className="hidden sm:inline-block text-xs text-slate-500 font-medium truncate w-full">
                    {step.subtitulo}
                  </span>
                  <span className="sm:hidden text-xs font-bold text-center mt-1 text-slate-700">
                    {step.titulo.split('.')[1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* ETAPA 1: Igreja e Dirigente                              */}
        {/* ======================================================== */}
        {etapaAtual === 1 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <User className="h-6 w-6 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                  Etapa 1: Igreja e Dirigente Local
                </h3>
                <p className="text-sm text-slate-600">
                  Informe o Código TOTVS para identificar a congregação e confirme os dados do Dirigente.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Campo Código TOTVS */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-slate-900 mb-2">
                  Código TOTVS da Igreja <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    disabled={isDirectLink}
                    placeholder="Ex: 7513"
                    value={codigoTotvs}
                    onChange={(e) => setCodigoTotvs(e.target.value)}
                    className={`w-full h-14 px-4 text-base sm:text-lg font-bold font-mono rounded-2xl border transition-all ${
                      isDirectLink
                        ? 'bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed'
                        : 'bg-slate-50 focus:bg-white border-slate-300 focus:ring-2 focus:ring-indigo-600 text-slate-900'
                    }`}
                  />
                  {searchingChurch && (
                    <div className="absolute right-4 top-4 text-indigo-600 animate-spin">
                      <Loader2 className="h-6 w-6" />
                    </div>
                  )}
                </div>
                {errosEtapa1.codigo_totvs && (
                  <p className="text-xs sm:text-sm text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errosEtapa1.codigo_totvs}
                  </p>
                )}
              </div>

              {/* Card Verde de Confirmação da Igreja */}
              {church && (
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-5 sm:p-6 text-emerald-950 space-y-2 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-700 font-black text-xs sm:text-sm uppercase tracking-wider">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                    <span>Congregação Localizada e Confirmada</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-emerald-950">{church.desc_igreja}</h3>
                  <p className="text-sm sm:text-base text-emerald-800 font-medium flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-600 shrink-0" />
                    {church.endereco || 'Endereço não cadastrado'}, {church.bairro} - {church.municipio}/{church.estado}
                  </p>
                </div>
              )}

              {/* Nome do Dirigente */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-slate-900 mb-2">
                  Nome Completo do Dirigente Responsável <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Ferreira"
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  className="w-full h-14 px-4 text-base sm:text-lg font-medium bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-600 text-slate-900 transition-all"
                />
                {errosEtapa1.nome_responsavel && (
                  <p className="text-xs sm:text-sm text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errosEtapa1.nome_responsavel}
                  </p>
                )}
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-slate-900 mb-2">
                  Telefone / WhatsApp com DDD <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 98765-4321"
                  maxLength={15}
                  value={telefoneResponsavel}
                  onChange={handleTelefoneChange}
                  className="w-full h-14 px-4 text-base sm:text-lg font-mono font-bold bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-600 text-slate-900 transition-all"
                />
                {errosEtapa1.telefone_responsavel && (
                  <p className="text-xs sm:text-sm text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errosEtapa1.telefone_responsavel}
                  </p>
                )}
              </div>

              {/* Cargo Pastoral Sem Select - Preenchimento Direto */}
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                    Cargo / Função Pastoral
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    Dirigente Local
                  </span>
                </div>
                <span className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-extrabold rounded-xl shadow-xs">
                  Acesso Direto
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 2: Bens e Itens                                    */}
        {/* ======================================================== */}
        {etapaAtual === 2 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-black text-slate-900 text-lg sm:text-xl flex items-center gap-2">
                  <Layers className="h-6 w-6 text-indigo-600" />
                  Etapa 2: Bens e Equipamentos
                </h3>
                <p className="text-sm text-slate-600">
                  Toque nos cards para selecionar os bens que a igreja possui e indique a quantidade e estado.
                </p>
              </div>

              <span className="bg-indigo-100 text-indigo-900 font-black text-sm px-4 py-2 rounded-2xl border border-indigo-200 self-start sm:self-center">
                {totalBensDeclarados} {totalBensDeclarados === 1 ? 'item marcado' : 'itens marcados'}
              </span>
            </div>

            {/* Pílulas de Categorias Flex-Wrap sem cortes */}
            <div className="flex flex-wrap gap-2 md:gap-3 my-4">
              {categoriasEtapa2.map((cat) => {
                const IconComp = CATEGORIAS_ICONES[cat] || Layers;
                const isActive = categoriaAtiva === cat;
                const countNaCat = itens.filter(
                  (it) => it.possui && (cat === 'TODAS' || it.categoria === cat)
                ).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaAtiva(cat)}
                    className={`h-11 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <IconComp className="h-4 w-4" />
                    <span>{cat}</span>
                    {countNaCat > 0 && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {countNaCat}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Lista dos Itens: Cards Inteiros Clicáveis */}
            <div className="space-y-4">
              {itensExibidos.map((item) => {
                const isChecked = item.possui;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleTogglePossui(item.id)}
                    className={`cursor-pointer rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                      isChecked
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-md'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Checkbox e Título */}
                      <div className="flex items-center gap-4 select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleTogglePossui(item.id);
                          }}
                          className="h-7 w-7 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer accent-indigo-600 shrink-0"
                        />
                        <div>
                          <span
                            className={`text-base sm:text-lg font-black block ${
                              isChecked ? 'text-indigo-950' : 'text-slate-800'
                            }`}
                          >
                            {item.item_nome}
                          </span>
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-extrabold">
                            {item.categoria}
                          </span>
                        </div>
                      </div>

                      {/* Stepper de Quantidade com botões grandes h-10 w-10 text-xl font-bold */}
                      {isChecked && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-3 flex-wrap sm:flex-nowrap pl-11 sm:pl-0"
                        >
                          <div className="flex items-center bg-white border-2 border-indigo-200 rounded-2xl overflow-hidden shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="h-10 w-10 text-slate-800 hover:bg-slate-100 text-xl font-black cursor-pointer transition-colors flex items-center justify-center shrink-0"
                            >
                              -
                            </button>
                            <span className="px-3 text-lg font-mono font-black text-indigo-950 min-w-10 text-center">
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="h-10 w-10 text-slate-800 hover:bg-slate-100 text-xl font-black cursor-pointer transition-colors flex items-center justify-center shrink-0"
                            >
                              +
                            </button>
                          </div>

                          {item.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomItem(item.id)}
                              className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Remover item"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expansão quando selecionado: Pílulas de Estado de Conservação e Observação */}
                    {isChecked && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 pl-11 sm:pl-11 pt-4 border-t border-indigo-200/80 space-y-3"
                      >
                        <div className="space-y-1.5">
                          <label className="block text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
                            Estado de Conservação:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {OPCOES_CONSERVACAO.map((opcao) => {
                              const isSelected = item.conservacao === opcao.value;
                              return (
                                <button
                                  key={opcao.value}
                                  type="button"
                                  onClick={() => handleConservacaoChange(item.id, opcao.value)}
                                  className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {opcao.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <input
                          type="text"
                          placeholder="Observação opcional (ex: marca, modelo ou detalhes)..."
                          value={item.observacao || ''}
                          onChange={(e) => handleObservacaoItemChange(item.id, e.target.value)}
                          className="w-full text-xs sm:text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Adicionar Novo Item */}
            <div className="pt-4 border-t border-slate-200">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                Deseja adicionar algum bem que não consta na lista?
              </span>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Nome do bem (Ex: Gerador, Roçadeira, Telão Especial...)"
                  value={novoItemNome}
                  onChange={(e) => setNovoItemNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomItem();
                    }
                  }}
                  className="flex-1 h-12 px-4 text-sm font-medium bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-600 text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="h-12 px-6 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 3: Envio e Confirmação                             */}
        {/* ======================================================== */}
        {etapaAtual === 3 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <FileCheck2 className="h-6 w-6 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                  Etapa 3: Revisão e Confirmação Final
                </h3>
                <p className="text-sm text-slate-600">
                  Revise as informações antes de transmitir o inventário patrimonial.
                </p>
              </div>
            </div>

            {/* Resumo Igreja e Dirigente */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  Igreja e Dirigente
                </h4>
                <button
                  type="button"
                  onClick={() => setEtapaAtual(1)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Editar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500 font-bold block text-xs uppercase">Congregação</span>
                  <span className="font-black text-slate-900">{church?.desc_igreja} (TOTVS {church?.codigo_totvs})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-xs uppercase">Endereço</span>
                  <span className="text-slate-800">{church?.endereco}, {church?.bairro} - {church?.municipio}/{church?.estado}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-xs uppercase">Dirigente Local</span>
                  <span className="font-black text-slate-900">{nomeResponsavel}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-xs uppercase">Telefone de Contato</span>
                  <span className="font-mono text-slate-800 font-bold">{telefoneResponsavel}</span>
                </div>
              </div>
            </div>

            {/* Resumo Bens */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-indigo-600" />
                  Bens Marcados ({totalBensDeclarados})
                </h4>
                <button
                  type="button"
                  onClick={() => setEtapaAtual(2)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Editar
                </button>
              </div>

              {totalBensDeclarados === 0 ? (
                <p className="text-slate-400 text-sm italic">Nenhum bem marcado como existente.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-200 text-sm pr-1">
                  {itens
                    .filter((it) => it.possui)
                    .map((it) => (
                      <div key={it.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{it.item_nome}</span>
                          <span className="text-xs text-slate-500 ml-2 bg-white border border-slate-200 px-2 py-0.5 rounded font-medium">
                            {it.conservacao}
                          </span>
                          {it.observacao && (
                            <p className="text-xs text-slate-500 italic mt-0.5">
                              Obs: {it.observacao}
                            </p>
                          )}
                        </div>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg">
                          Qtd: {it.quantidade}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Observações Finais */}
            <div className="space-y-2">
              <label className="block text-sm font-extrabold text-slate-900">
                Observações Finais (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Informe observações adicionais sobre o patrimônio ou templo..."
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                className="w-full text-base p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BOTÕES DE NAVEGAÇÃO NO RODAPÉ DO DOCUMENTO               */}
        {/* ======================================================== */}
        <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            type="button"
            onClick={handleVoltarEtapa}
            disabled={etapaAtual === 1 || submitting}
            className={`w-full sm:w-auto h-12 sm:h-14 px-8 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
              etapaAtual === 1
                ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-400'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>

          <div className="text-sm font-bold text-slate-500 hidden sm:block">
            Etapa {etapaAtual} de 3
          </div>

          {etapaAtual < 3 ? (
            <button
              type="button"
              onClick={handleAvancarEtapa}
              className="w-full sm:w-auto h-12 sm:h-14 px-10 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-bold text-base sm:text-lg shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Avançar</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalConfirmacaoAberto(true)}
              disabled={submitting}
              className="w-full sm:w-auto h-12 sm:h-14 px-10 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-base sm:text-lg shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Confirmar e Enviar</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Modal de Confirmação Final */}
        {isModalConfirmacaoAberto && (
          <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="h-9 w-9" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-slate-900">
                  Confirmar Envio da Declaração?
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Os dados declarados serão gravados officially na base de patrimônio da igreja TOTVS{' '}
                  <strong className="text-slate-900 font-mono">{church?.codigo_totvs}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Bens marcados:</span>
                  <span className="font-black text-slate-900">{totalBensDeclarados} itens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Dirigente Local:</span>
                  <span className="font-black text-slate-900">{nomeResponsavel}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalConfirmacaoAberto(false)}
                  className="flex-1 h-12 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
                >
                  Revisar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEnvio}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer"
                >
                  Confirmar e Enviar
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-slate-500 py-4 font-medium">
          IPDA &copy; {new Date().getFullYear()} - Sistema de Gestão Georreferenciada e Patrimônio
        </footer>
      </div>
    </div>
  );
}
