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
  Volume2,
  Wind,
  Armchair,
  Coffee,
  Check,
  Printer,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Info,
  Layers,
  Send,
  Lock,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  ItemPatrimonialForm,
  ErrosValidacao,
  validarDadosGerais,
  validarTelefoneComDdd,
  formatarTelefone,
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
  { numero: 1, titulo: '1. Igreja e Dirigente', subtitulo: 'Identificação Local' },
  { numero: 2, titulo: '2. Bens e Itens', subtitulo: 'Equipamentos e Bens' },
  { numero: 3, titulo: '3. Envio e Confirmação', subtitulo: 'Conferência Final' },
];

const CONSERVACAO_OPCOES: Array<{ valor: 'ÓTIMO' | 'BOM' | 'REGULAR' | 'RUIM'; rotulo: string }> = [
  { valor: 'ÓTIMO', rotulo: 'Ótimo' },
  { valor: 'BOM', rotulo: 'Bom' },
  { valor: 'REGULAR', rotulo: 'Regular' },
  { valor: 'RUIM', rotulo: 'Ruim' },
];

export default function PatrimonioClientForm({ totvs }: { totvs?: string }) {
  const isUrlTotvs = Boolean(totvs && totvs.trim().length > 0);
  const initialTotvs = (totvs || '').trim();

  const [etapaAtual, setEtapaAtual] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [isModalConfirmacaoAberto, setIsModalConfirmacaoAberto] = useState(false);

  // Controle de TOTVS
  const [inputTotvs, setInputTotvs] = useState<string>(initialTotvs);
  const [debouncedTotvs, setDebouncedTotvs] = useState<string>(initialTotvs);
  const [searchingChurch, setSearchingChurch] = useState<boolean>(isUrlTotvs);
  const [church, setChurch] = useState<ChurchData | null>(null);
  const [churchNotFound, setChurchNotFound] = useState<boolean>(false);
  const [jaEnviadoAnual, setJaEnviadoAnual] = useState<boolean>(false);

  // Etapa 1: Dados Gerais
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [telefoneResponsavel, setTelefoneResponsavel] = useState('');
  const cargoResponsavel = 'Dirigente Local'; // Fixo conforme especificação
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear());
  const [errosEtapa1, setErrosEtapa1] = useState<ErrosValidacao>({});
  const [camposTocadosEtapa1, setCamposTocadosEtapa1] = useState<Record<string, boolean>>({});

  // Etapa 2: Itens Patrimoniais
  const [itens, setItens] = useState<ItemPatrimonialForm[]>([]);
  const [novoItemNome, setNovoItemNome] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('TODAS');

  // Etapa 3: Observações Gerais
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Debounce de 500ms se o TOTVS for editável
  useEffect(() => {
    if (isUrlTotvs) {
      setDebouncedTotvs(initialTotvs);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedTotvs(inputTotvs.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [inputTotvs, isUrlTotvs, initialTotvs]);

  // Consulta pública da congregação
  useEffect(() => {
    if (!debouncedTotvs) {
      setChurch(null);
      setChurchNotFound(false);
      setSearchingChurch(false);
      return;
    }

    let isMounted = true;
    setSearchingChurch(true);

    fetch(`/api/igrejas/public-lookup?totvs=${encodeURIComponent(debouncedTotvs)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.ja_enviado) {
          setChurch(json.igreja || null);
          setJaEnviadoAnual(true);
          setChurchNotFound(false);
          toast.warning(`A declaração patrimonial referente ao ano de ${new Date().getFullYear()} desta igreja já foi recebida e consta no sistema.`);
          return;
        }

        if (json.success && json.igreja) {
          setChurch(json.igreja);
          setJaEnviadoAnual(false);
          setChurchNotFound(false);
        } else {
          setChurch(null);
          setJaEnviadoAnual(false);
          setChurchNotFound(true);
          toast.warning('Código TOTVS não localizado. Verifique o número com a sua regional.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Erro ao consultar TOTVS:', err);
        setChurch(null);
        setChurchNotFound(true);
        toast.warning('Código TOTVS não localizado. Verifique o número com a sua regional.');
      })
      .finally(() => {
        if (isMounted) setSearchingChurch(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedTotvs]);

  // Inicializa lista base de bens
  useEffect(() => {
    if (church && itens.length === 0) {
      const baseItems: ItemPatrimonialForm[] = ITENS_PADRAO.map((it) => ({
        id: it.id,
        item_nome: it.nome,
        categoria: it.categoria,
        quantidade: 1,
        possui: false,
        conservacao: 'BOM',
        observacao: '',
      }));
      setItens(baseItems);
    }
  }, [church, itens.length]);

  // Validação da Etapa 1
  useEffect(() => {
    const erros = validarDadosGerais({
      nome_responsavel: nomeResponsavel,
      telefone_responsavel: telefoneResponsavel,
      ano_referencia: anoReferencia,
    });
    setErrosEtapa1(erros);
  }, [nomeResponsavel, telefoneResponsavel, anoReferencia]);

  // Máscara e estado de telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarTelefone(e.target.value);
    setTelefoneResponsavel(formatado);
    setCamposTocadosEtapa1((prev) => ({ ...prev, telefone_responsavel: true }));
  };

  const handleBlurCampoEtapa1 = (campo: string) => {
    setCamposTocadosEtapa1((prev) => ({ ...prev, [campo]: true }));
  };

  // Validação estrita
  const validacaoTel = validarTelefoneComDdd(telefoneResponsavel);
  const isNomeValido = nomeResponsavel.trim().length >= 3;
  const isFormularioLiberado = Boolean(
    church && !searchingChurch && !churchNotFound && !jaEnviadoAnual && isNomeValido && validacaoTel.valido
  );

  // Handlers para Itens (Etapa 2)
  const handleTogglePossui = (id: string) => {
    setItens((prev) =>
      prev.map((it) => (it.id === id ? { ...it, possui: !it.possui } : it))
    );
  };

  const handleQuantityChange = (id: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    conservacao: 'ÓTIMO' | 'BOM' | 'REGULAR' | 'RUIM',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
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
      toast.warning('Digite o nome do bem para adicionar.');
      return;
    }

    const jaExiste = itens.some(
      (it) => it.item_nome.toLowerCase() === nome.toLowerCase()
    );
    if (jaExiste) {
      toast.warning('Este item já está na lista.');
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

  const handleRemoveCustomItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItens((prev) => prev.filter((it) => it.id !== id));
    toast.info('Item removido.');
  };

  // Navegação
  const handleAvancarEtapa = () => {
    if (etapaAtual === 1) {
      if (!church || searchingChurch || churchNotFound) {
        toast.error('Informe um Código TOTVS válido antes de continuar.');
        return;
      }

      if (!isNomeValido) {
        setCamposTocadosEtapa1((prev) => ({ ...prev, nome_responsavel: true }));
        toast.error('Digite o nome completo do Dirigente Local.');
        return;
      }

      if (!validacaoTel.valido) {
        setCamposTocadosEtapa1((prev) => ({ ...prev, telefone_responsavel: true }));
        toast.error(validacaoTel.erro || 'Digite o número de WhatsApp completo com DDD.');
        return;
      }
    }

    if (etapaAtual === 2) {
      const totalPossui = itens.filter((i) => i.possui).length;
      if (totalPossui === 0) {
        const confirmEmpty = confirm(
          'Nenhum bem foi marcado. Deseja realmente prosseguir sem nenhum item?'
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

  // Submissão Final
  const handleConfirmarEnvio = async () => {
    if (!church || !isFormularioLiberado) {
      toast.error('Preencha os dados obrigatórios antes de enviar.');
      return;
    }

    setIsModalConfirmacaoAberto(false);
    setSubmitting(true);

    try {
      const itensDeclarados = itens.map((it) => ({
        item_nome: it.item_nome,
        quantidade: it.possui ? it.quantidade : 0,
        possui: it.possui ? 'Sim' : 'Não',
        conservacao: it.conservacao,
        observacao: it.observacao || null,
      }));

      const payload = {
        codigo_totvs: church.codigo_totvs,
        nome_responsavel: nomeResponsavel.trim(),
        telefone_responsavel: telefoneResponsavel.trim(),
        cargo_responsavel: cargoResponsavel,
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
        throw new Error(json.error || 'Erro ao processar o envio.');
      }

      setProtocolo(`PAT-${church.codigo_totvs}-${Date.now().toString().slice(-6)}`);
      setSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Patrimônio registrado com sucesso!');
    } catch (err: any) {
      console.error('Erro no envio:', err);
      toast.error(err.message || 'Erro ao enviar dados. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Tela de Sucesso
  if (submittedSuccess && church) {
    const itensPositivos = itens.filter((i) => i.possui);
    return (
      <div className="w-full max-w-4xl mx-auto h-auto min-h-fit py-10 px-4 font-sans pb-16">
        <Toaster position="top-center" richColors />
        <div className="bg-white rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 sm:p-10 text-white text-center relative overflow-hidden">
            <div className="w-24 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-4 ring-8 ring-white/10">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Cadastro Concluído!</h2>
            <p className="text-emerald-100 text-base sm:text-lg mt-2 font-medium">
              O inventário patrimonial foi enviado com sucesso.
            </p>
            {protocolo && (
              <div className="mt-4 inline-block bg-white/20 backdrop-blur-md px-5 py-2 rounded-full text-sm font-mono font-bold tracking-wider">
                Protocolo: {protocolo}
              </div>
            )}
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">Congregação</span>
                  <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">{church.desc_igreja}</h4>
                </div>
                <span className="bg-indigo-100 text-indigo-900 font-mono font-extrabold text-sm px-3 py-1 rounded-xl self-start sm:self-auto">
                  TOTVS: {church.codigo_totvs}
                </span>
              </div>
              <p className="text-slate-700 flex items-start gap-1.5 font-medium">
                <MapPin className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  {church.endereco ? `${church.endereco}, ` : ''}{church.bairro} - {church.municipio}/{church.estado}
                </span>
              </p>
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Dirigente Local</span>
                  <span className="font-bold text-base">{nomeResponsavel}</span>
                  <span className="block font-mono text-sm text-slate-600 mt-0.5">{telefoneResponsavel}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Ano Referência</span>
                  <span className="font-mono font-extrabold text-base">{anoReferencia}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5">
              <h5 className="font-bold text-sm uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
                <span>Resumo dos Bens Cadastrados</span>
                <span className="bg-emerald-100 text-emerald-900 font-extrabold px-3 py-1 rounded-full text-xs">
                  {itensPositivos.length} tipos de bens
                </span>
              </h5>

              {itensPositivos.length === 0 ? (
                <p className="text-slate-500 text-sm italic">Nenhum bem registrado como existente.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-sm">
                  {itensPositivos.map((it, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-base">{it.item_nome}</span>
                        <span className="text-xs text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded font-bold">
                          {it.conservacao}
                        </span>
                      </div>
                      <span className="font-mono font-extrabold text-indigo-800 bg-indigo-50 px-3 py-1 rounded-xl text-sm">
                        Qtd: {it.quantidade}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-14 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
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
                className="h-14 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-base transition-all cursor-pointer"
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
    <div className="w-full max-w-4xl mx-auto h-auto min-h-fit py-8 px-4 sm:px-6 font-sans text-slate-900 pb-16">
      <Toaster position="top-center" richColors />

      <div className="space-y-6">
        {/* Header Oficial IPDA */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <img
                  src="/img/logo.png"
                  alt="IPDA Logo"
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                  }}
                />
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Controle Patrimonial
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Declaração de Patrimônio
              </h1>
              <p className="text-slate-600 text-sm sm:text-base font-medium">
                Formulário simplificado de bens materiais e equipamentos da congregação.
              </p>
            </div>

            {church && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 sm:text-right shrink-0">
                <span className="text-xs font-bold text-indigo-700 block uppercase tracking-wider">
                  Código TOTVS
                </span>
                <span className="text-xl font-mono font-black text-indigo-950">{church.codigo_totvs}</span>
              </div>
            )}
          </div>
        </div>

        {/* Wizard Stepper Progress Bar (3 Etapas) */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {ETAPAS_WIZARD.map((step) => {
              const isConcluida = etapaAtual > step.numero;
              const isAtiva = etapaAtual === step.numero;
              const isDesabilitada = step.numero > 1 && (!church || !isFormularioLiberado);

              return (
                <button
                  key={step.numero}
                  type="button"
                  onClick={() => {
                    if (step.numero < etapaAtual) setEtapaAtual(step.numero);
                  }}
                  disabled={step.numero > etapaAtual || isDesabilitada}
                  className={`flex flex-col items-center sm:items-start p-3.5 rounded-2xl transition-all text-left ${
                    isAtiva
                      ? 'bg-indigo-50 border-2 border-indigo-600 shadow-xs'
                      : isConcluida
                      ? 'bg-emerald-50 border border-emerald-200 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black font-mono ${
                        isConcluida
                          ? 'bg-emerald-600 text-white'
                          : isAtiva
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isConcluida ? <Check className="h-4 w-4" /> : step.numero}
                    </div>
                    <span
                      className={`hidden sm:inline-block text-sm sm:text-base font-extrabold ${
                        isAtiva ? 'text-indigo-950' : isConcluida ? 'text-emerald-950' : 'text-slate-500'
                      }`}
                    >
                      {step.titulo}
                    </span>
                  </div>
                  <span className="hidden sm:inline-block text-xs text-slate-500 font-medium truncate w-full">
                    {step.subtitulo}
                  </span>
                  <span className="sm:hidden text-xs font-bold text-center mt-1 text-slate-800">
                    Etapa {step.numero}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* ETAPA 1: Igreja e Dirigente Local                        */}
        {/* ======================================================== */}
        {jaEnviadoAnual ? (
          <div className="bg-white rounded-3xl shadow-sm border border-amber-200 p-8 sm:p-12 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Declaração Anual Já Recebida
            </h2>
            <p className="text-slate-700 text-base sm:text-lg font-medium max-w-lg mx-auto leading-relaxed">
              A declaração patrimonial referente ao ano de <strong>{new Date().getFullYear()}</strong> desta igreja já foi recebida e consta no sistema.
            </p>
            {church && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 font-semibold inline-block max-w-md my-2">
                <p className="font-extrabold text-slate-900 text-base">{church.desc_igreja}</p>
                <p className="text-slate-600 mt-1 font-mono">TOTVS: {church.codigo_totvs}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {church.endereco ? `${church.endereco}, ` : ''}{church.bairro} - {church.municipio}/{church.estado}
                </p>
              </div>
            )}
            <p className="text-xs sm:text-sm text-slate-500 font-medium pt-2">
              Caso precise de alterações ou retificações, entre em contato com a sua Regional.
            </p>
          </div>
        ) : (
          <>
            {etapaAtual === 1 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <Building2 className="h-7 w-7 text-indigo-600 shrink-0" />
              <div>
                <h2 className="font-black text-slate-900 text-lg sm:text-xl">
                  Etapa 1: Identificação da Igreja e Dirigente
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  Confirme a congregação e os dados do Dirigente Local responsável.
                </p>
              </div>
            </div>

            {/* Campo TOTVS */}
            <div className="space-y-2">
              <label className="block text-sm sm:text-base font-extrabold text-slate-900">
                Código TOTVS da Igreja <span className="text-rose-600">*</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={isUrlTotvs}
                  disabled={isUrlTotvs}
                  placeholder="Digite o código TOTVS (ex: 10452)"
                  value={inputTotvs}
                  onChange={(e) => setInputTotvs(e.target.value.toUpperCase())}
                  className={`w-full h-14 text-base sm:text-lg font-mono font-black px-4 bg-slate-50 border-2 rounded-2xl transition-all ${
                    isUrlTotvs
                      ? 'border-slate-300 bg-slate-100 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 focus:bg-white focus:border-indigo-600 text-slate-900'
                  }`}
                />
                {isUrlTotvs && (
                  <div className="absolute right-4 top-4 flex items-center gap-1.5 text-slate-500 font-bold text-xs bg-slate-200/80 px-2.5 py-1 rounded-lg">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Modo Leitura</span>
                  </div>
                )}
                {searchingChurch && !isUrlTotvs && (
                  <div className="absolute right-4 top-4 flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Buscando...</span>
                  </div>
                )}
              </div>

              {/* Mensagem quando campo TOTVS estiver vazio */}
              {!debouncedTotvs && !searchingChurch && (
                <div className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
                  <Info className="h-6 w-6 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-indigo-950 space-y-1">
                    <p className="font-extrabold text-base">Informe o Código TOTVS da sua congregação</p>
                    <p className="text-indigo-800 leading-relaxed font-medium">
                      Digite o número TOTVS da igreja no campo acima para carregar o nome e o endereço oficial. Se não souber o código, consulte a sua Regional.
                    </p>
                  </div>
                </div>
              )}

              {/* Alerta quando a Declaração Anual já tiver sido enviada */}
              {jaEnviadoAnual && (
                <div className="mt-3 p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
                  <AlertCircle className="h-6 w-6 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-950 space-y-1">
                    <p className="font-extrabold text-base">Declaração Anual Já Realizada</p>
                    <p className="text-amber-900 leading-relaxed font-medium">
                      Declaração de {new Date().getFullYear()} já realizada para este TOTVS. Para alterações ou atualizações, entre em contato com a sua Regional.
                    </p>
                  </div>
                </div>
              )}

              {/* Card de Confirmação quando a Igreja for Encontrada */}
              {church && !searchingChurch && !jaEnviadoAnual && (
                <div className="mt-3 p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-2 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-xs uppercase tracking-wider">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>Congregação Confirmada no Sistema</span>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg">
                      {church.desc_igreja}
                    </h3>
                    <p className="text-sm text-slate-800 flex items-start gap-1.5 mt-1 font-bold">
                      <MapPin className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                      <span>
                        {church.endereco ? `${church.endereco}, ` : ''}
                        {church.bairro ? `${church.bairro} - ` : ''}
                        {church.municipio}/{church.estado}
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-emerald-800 font-extrabold pt-2 border-t border-emerald-200">
                    Confirme se o nome e o endereço pertencem à sua igreja local.
                  </p>
                </div>
              )}

              {/* Alerta de TOTVS não encontrado */}
              {churchNotFound && !searchingChurch && (
                <div className="mt-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
                  <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-rose-950 space-y-1">
                    <p className="font-extrabold text-base">Código TOTVS não localizado</p>
                    <p className="text-rose-800 leading-relaxed font-medium">
                      Código TOTVS não encontrado. Verifique o número digitado com a sua regional.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dados do Dirigente Local */}
            <div className="pt-4 border-t border-slate-100 space-y-5">
              {/* Nome Completo do Dirigente Local */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-slate-900 mb-1.5">
                  Nome Completo do Dirigente Local <span className="text-rose-600">*</span>
                </label>

                <input
                  type="text"
                  required
                  placeholder="Digite seu nome completo (Ex: Pr. João Ferreira)"
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  onBlur={() => handleBlurCampoEtapa1('nome_responsavel')}
                  className={`w-full h-14 text-base sm:text-lg font-bold px-4 bg-slate-50 border-2 rounded-2xl focus:bg-white focus:outline-hidden transition-all ${
                    camposTocadosEtapa1.nome_responsavel && errosEtapa1.nome_responsavel
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 text-rose-950 bg-rose-50/30'
                      : 'border-slate-300 focus:border-indigo-600'
                  }`}
                />
                {camposTocadosEtapa1.nome_responsavel && errosEtapa1.nome_responsavel && (
                  <p className="text-xs sm:text-sm text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errosEtapa1.nome_responsavel}
                  </p>
                )}
              </div>

              {/* Telefone / WhatsApp com Máscara e DDD */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-slate-900 mb-1.5">
                  Telefone / WhatsApp de Contato com DDD <span className="text-rose-600">*</span>
                </label>

                <input
                  type="tel"
                  required
                  placeholder="(11) 98765-4321"
                  maxLength={15}
                  value={telefoneResponsavel}
                  onChange={handleTelefoneChange}
                  onBlur={() => handleBlurCampoEtapa1('telefone_responsavel')}
                  className={`w-full h-14 text-base sm:text-lg font-mono font-bold px-4 bg-slate-50 border-2 rounded-2xl focus:bg-white focus:outline-hidden transition-all ${
                    camposTocadosEtapa1.telefone_responsavel && !validacaoTel.valido
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 text-rose-950 bg-rose-50/30'
                      : 'border-slate-300 focus:border-indigo-600'
                  }`}
                />
                {camposTocadosEtapa1.telefone_responsavel && !validacaoTel.valido && (
                  <p className="text-xs sm:text-sm text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {validacaoTel.erro}
                  </p>
                )}
                {validacaoTel.valido && telefoneResponsavel && (
                  <p className="text-xs sm:text-sm text-emerald-700 font-extrabold mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Telefone e DDD validados
                  </p>
                )}
              </div>

              {/* Ano de Referência */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-slate-900 mb-1.5">
                  Ano do Inventário
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={anoReferencia}
                  onChange={(e) => setAnoReferencia(Number(e.target.value))}
                  className="w-full h-14 text-base sm:text-lg font-mono font-bold px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Aviso Sutil */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-950 font-medium">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Atenção:</strong> Os dados de contato informados acima (Nome e WhatsApp) serão cadastrados no sistema caso o registro oficial do dirigente da congregação não esteja presente.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 2: Bens e Equipamentos                              */}
        {/* ======================================================== */}
        {etapaAtual === 2 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-black text-slate-900 text-lg sm:text-xl flex items-center gap-2">
                  <Layers className="h-6 w-6 text-indigo-600" />
                  Etapa 2: Bens e Equipamentos da Igreja
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  Marque os itens que a igreja possui e indique a quantidade e conservação.
                </p>
              </div>

              <span className="bg-indigo-100 text-indigo-900 font-black text-sm px-4 py-2 rounded-2xl border border-indigo-200 self-start sm:self-center">
                {totalBensDeclarados} {totalBensDeclarados === 1 ? 'item marcado' : 'itens marcados'}
              </span>
            </div>

            {/* Categorias Tabs (Wrap sem corte lateral) */}
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
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    <IconComp className="h-4 w-4" />
                    <span>{cat}</span>
                    {countNaCat > 0 && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono font-black ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-900'
                        }`}
                      >
                        {countNaCat}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Lista dos Itens (Cards Clicáveis para Idosos) */}
            <div className="space-y-4">
              {itensExibidos.map((item) => {
                const isChecked = item.possui;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleTogglePossui(item.id)}
                    className={`cursor-pointer rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                      isChecked
                        ? 'bg-indigo-50/60 border-indigo-600 shadow-sm'
                        : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // acionado pelo card pai
                          className="mt-1 h-6 w-6 rounded-lg border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 shrink-0"
                        />
                        <div>
                          <span
                            className={`text-base sm:text-lg font-black block ${
                              isChecked ? 'text-indigo-950' : 'text-slate-900'
                            }`}
                          >
                            {item.item_nome}
                          </span>
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-extrabold block mt-0.5">
                            {item.categoria}
                          </span>
                        </div>
                      </div>

                      {item.isCustom && isChecked && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveCustomItem(item.id, e)}
                          className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer shrink-0"
                          title="Remover item personalizado"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    {/* Controles expansivos com botões grandes ao marcar */}
                    {isChecked && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 pt-4 border-t border-indigo-200 space-y-4 animate-in fade-in duration-150"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {/* Stepper de Quantidade com Botões Grandes */}
                          <div className="space-y-1">
                            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                              Quantidade:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => handleQuantityChange(item.id, -1, e)}
                                className="h-11 w-11 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-100 active:scale-95 text-xl font-black text-slate-800 flex items-center justify-center transition-all shadow-2xs"
                                title="Diminuir"
                              >
                                -
                              </button>
                              <span className="px-4 text-lg font-mono font-black text-indigo-950 min-w-12 text-center bg-white py-1.5 rounded-xl border border-indigo-100 shadow-2xs">
                                {item.quantidade}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleQuantityChange(item.id, 1, e)}
                                className="h-11 w-11 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-100 active:scale-95 text-xl font-black text-slate-800 flex items-center justify-center transition-all shadow-2xs"
                                title="Aumentar"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Pílulas de Conservação Grandes */}
                          <div className="space-y-1">
                            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                              Estado de Conservação:
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {CONSERVACAO_OPCOES.map((opt) => {
                                const isSelected = item.conservacao === opt.valor;
                                return (
                                  <button
                                    key={opt.valor}
                                    type="button"
                                    onClick={(e) => handleConservacaoChange(item.id, opt.valor, e)}
                                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all border-2 ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                    }`}
                                  >
                                    {opt.rotulo}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Campo Observação */}
                        <div>
                          <input
                            type="text"
                            placeholder="Observação opcional (ex: Marca, potência, ano...)"
                            value={item.observacao || ''}
                            onChange={(e) => handleObservacaoItemChange(item.id, e.target.value)}
                            className="w-full text-xs sm:text-sm px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-600 font-medium text-slate-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Adicionar Item Personalizado */}
            <div className="pt-4 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Não localizou algum equipamento?
              </span>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="Nome do novo bem (Ex: Gerador, Roçadeira, Sino...)"
                  value={novoItemNome}
                  onChange={(e) => setNovoItemNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomItem();
                    }
                  }}
                  className="flex-1 h-12 text-sm font-bold px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="h-12 px-5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-2 border-indigo-200 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                  <span>Adicionar Item</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 3: Envio e Confirmação                             */}
        {/* ======================================================== */}
        {etapaAtual === 3 && church && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <FileCheck2 className="h-7 w-7 text-indigo-600 shrink-0" />
              <div>
                <h2 className="font-black text-slate-900 text-lg sm:text-xl">
                  Etapa 3: Revisão e Envio do Inventário
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  Revise as informações da congregação antes do envio definitivo.
                </p>
              </div>
            </div>

            {/* Resumo Card 1: Igreja e Dirigente */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  Dados da Igreja e Dirigente Local
                </h3>
                <button
                  type="button"
                  onClick={() => setEtapaAtual(1)}
                  className="text-indigo-600 hover:text-indigo-900 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 font-bold block text-xs uppercase">Congregação / TOTVS</span>
                  <span className="font-extrabold text-slate-900">{church.desc_igreja} (TOTVS {church.codigo_totvs})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-xs uppercase">Endereço</span>
                  <span className="text-slate-800 font-medium">
                    {church.endereco ? `${church.endereco}, ` : ''}{church.bairro} - {church.municipio}/{church.estado}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-xs uppercase">Dirigente Local</span>
                  <span className="font-extrabold text-slate-900">{nomeResponsavel}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-xs uppercase">Contato WhatsApp</span>
                  <span className="font-mono font-bold text-slate-800">{telefoneResponsavel}</span>
                </div>
              </div>
            </div>

            {/* Resumo Card 2: Bens Declarados */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Armchair className="h-5 w-5 text-indigo-600" />
                  Bens Marcados ({totalBensDeclarados})
                </h3>
                <button
                  type="button"
                  onClick={() => setEtapaAtual(2)}
                  className="text-indigo-600 hover:text-indigo-900 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              {totalBensDeclarados === 0 ? (
                <p className="text-slate-500 text-sm italic">Nenhum bem marcado como existente.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-200 text-xs sm:text-sm pr-1">
                  {itens
                    .filter((it) => it.possui)
                    .map((it) => (
                      <div key={it.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-slate-900">{it.item_nome}</span>
                          <span className="text-xs text-slate-500 ml-2 bg-white border border-slate-200 px-2 py-0.5 rounded font-bold">
                            {it.conservacao}
                          </span>
                          {it.observacao && (
                            <p className="text-xs text-slate-600 italic mt-0.5">
                              Obs: {it.observacao}
                            </p>
                          )}
                        </div>
                        <span className="font-mono font-black text-indigo-900 bg-indigo-100 px-3 py-1 rounded-xl">
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
                Observações Finais sobre a Igreja ou Patrimônio (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Informe observações sobre reformas necessárias, bens emprestados ou doações..."
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                className="w-full text-sm p-4 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-hidden font-medium"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BARRA DE NAVEGAÇÃO NO FLUXO NORMAL (NÃO FIXO/ABSOLUTO)    */}
        {/* ======================================================== */}
        <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleVoltarEtapa}
            disabled={etapaAtual === 1 || submitting}
            className={`w-full sm:w-auto h-14 px-8 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
              etapaAtual === 1
                ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Voltar Passo</span>
          </button>

          <span className="text-sm font-mono font-extrabold text-slate-500 hidden sm:inline-block">
            Etapa {etapaAtual} de 3
          </span>

          {etapaAtual < 3 ? (
            <button
              type="button"
              onClick={handleAvancarEtapa}
              disabled={!isFormularioLiberado || searchingChurch}
              className="w-full sm:w-auto h-14 px-8 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-black text-base shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Avançar para Próxima Etapa</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalConfirmacaoAberto(true)}
              disabled={submitting || !isFormularioLiberado}
              className="w-full sm:w-auto h-14 px-8 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Transmitindo...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Confirmar e Finalizar Envio</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Modal de Confirmação Final */}
        {isModalConfirmacaoAberto && church && (
          <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Send className="h-8 w-8" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Confirmar Envio Oficial?
                </h3>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">
                  Os dados declarados serão gravados no cadastro da igreja TOTVS{' '}
                  <strong className="text-slate-900 font-mono">{church.codigo_totvs}</strong> ({church.desc_igreja}).
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs sm:text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Bens marcados:</span>
                  <span className="font-extrabold text-slate-900">{totalBensDeclarados} itens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Dirigente Local:</span>
                  <span className="font-extrabold text-slate-900">{nomeResponsavel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Telefone/WhatsApp:</span>
                  <span className="font-mono font-extrabold text-slate-900">{telefoneResponsavel}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalConfirmacaoAberto(false)}
                  className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
                >
                  Revisar Dados
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEnvio}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Sim, Enviar Agora
                </button>
              </div>
            </div>
          </div>
        )}

          </>
        )}

        <footer className="text-center text-xs sm:text-sm text-slate-500 py-6 font-medium">
          IPDA &copy; {new Date().getFullYear()} - Sistema de Gestão Georreferenciada e Patrimônio
        </footer>
      </div>
    </div>
  );
}
