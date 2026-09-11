'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Phone,
  User,
  ShieldCheck,
  Send,
  Calendar,
  Volume2,
  Wind,
  Armchair,
  Coffee,
  Check,
  Printer,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Info,
  Layers,
  BadgeCheck,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  ItemPatrimonialForm,
  FotoPatrimonialForm,
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
  { numero: 1, titulo: 'Dados Gerais', subtitulo: 'Igreja e Dirigente' },
  { numero: 2, titulo: 'Bens e Itens', subtitulo: 'Equipamentos e Bens' },
  { numero: 3, titulo: 'Fotos e Anexos', subtitulo: 'Registro Visual' },
  { numero: 4, titulo: 'Revisão e Envio', subtitulo: 'Conferência Final' },
];

export default function PatrimonioClientForm({ totvs }: { totvs: string }) {
  const [etapaAtual, setEtapaAtual] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [isModalConfirmacaoAberto, setIsModalConfirmacaoAberto] = useState(false);

  // Busca e validação dinâmica de TOTVS com debounce de 500ms
  const [inputTotvs, setInputTotvs] = useState<string>(totvs || '');
  const [debouncedTotvs, setDebouncedTotvs] = useState<string>(totvs || '');
  const [searchingChurch, setSearchingChurch] = useState<boolean>(true);
  const [church, setChurch] = useState<ChurchData | null>(null);
  const [churchNotFound, setChurchNotFound] = useState<boolean>(false);

  // Etapa 1: Dados Gerais (Fixo para Dirigente Local)
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

  // Etapa 3: Fotos & Documentos
  const [fotos, setFotos] = useState<FotoPatrimonialForm[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Etapa 4: Observações Gerais
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Debounce de 500ms no campo TOTVS
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTotvs(inputTotvs.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [inputTotvs]);

  // Consulta pública por TOTVS sempre que debouncedTotvs mudar
  useEffect(() => {
    if (!debouncedTotvs) {
      setChurch(null);
      setChurchNotFound(true);
      setSearchingChurch(false);
      return;
    }

    let isMounted = true;
    setSearchingChurch(true);

    fetch(`/api/igrejas/public-lookup?totvs=${encodeURIComponent(debouncedTotvs)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.igreja) {
          setChurch(json.igreja);
          setChurchNotFound(false);
        } else {
          setChurch(null);
          setChurchNotFound(true);
          toast.warning('Código TOTVS não encontrado. Verifique o número digitado com a sua regional.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Erro ao consultar TOTVS:', err);
        setChurch(null);
        setChurchNotFound(true);
        toast.warning('Código TOTVS não encontrado. Verifique o número digitado com a sua regional.');
      })
      .finally(() => {
        if (isMounted) setSearchingChurch(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedTotvs]);

  // Inicializa lista base de bens quando a igreja for identificada
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

  // Validação dos dados da Etapa 1
  useEffect(() => {
    const erros = validarDadosGerais({
      nome_responsavel: nomeResponsavel,
      telefone_responsavel: telefoneResponsavel,
      ano_referencia: anoReferencia,
    });
    setErrosEtapa1(erros);
  }, [nomeResponsavel, telefoneResponsavel, anoReferencia]);

  // Handler de alteração com máscara de telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarTelefone(e.target.value);
    setTelefoneResponsavel(formatado);
    setCamposTocadosEtapa1((prev) => ({ ...prev, telefone_responsavel: true }));
  };

  const handleBlurCampoEtapa1 = (campo: string) => {
    setCamposTocadosEtapa1((prev) => ({ ...prev, [campo]: true }));
  };

  // Validação estrita do telefone com DDD
  const validacaoTel = validarTelefoneComDdd(telefoneResponsavel);
  const isNomeValido = nomeResponsavel.trim().length >= 3;
  const isFormularioLiberado = Boolean(
    church && !searchingChurch && !churchNotFound && isNomeValido && validacaoTel.valido
  );

  // Handlers para Itens (Etapa 2)
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

  // Handlers para Fotos (Etapa 3)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" não é uma imagem válida.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" excede o tamanho máximo de 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const previewUrl = event.target?.result as string;
        const novaFoto: FotoPatrimonialForm = {
          id: `foto_${Date.now()}_${Math.random()}`,
          nome: file.name,
          tamanho: file.size,
          previewUrl,
          legenda: '',
        };
        setFotos((prev) => [...prev, novaFoto]);
        toast.success(`Foto "${file.name}" adicionada.`);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFoto = (id: string) => {
    setFotos((prev) => prev.filter((f) => f.id !== id));
    toast.info('Foto removida.');
  };

  const handleLegendaFotoChange = (id: string, legenda: string) => {
    setFotos((prev) =>
      prev.map((f) => (f.id === id ? { ...f, legenda } : f))
    );
  };

  // Controle de Navegação do Wizard
  const handleAvancarEtapa = () => {
    if (etapaAtual === 1) {
      if (!church || searchingChurch || churchNotFound) {
        toast.error('Informe um código TOTVS válido e localizado antes de prosseguir.');
        return;
      }

      if (!isNomeValido) {
        setCamposTocadosEtapa1((prev) => ({ ...prev, nome_responsavel: true }));
        toast.error('Informe o nome completo do Dirigente Local.');
        return;
      }

      if (!validacaoTel.valido) {
        setCamposTocadosEtapa1((prev) => ({ ...prev, telefone_responsavel: true }));
        toast.error(validacaoTel.erro || 'Informe um número de telefone/WhatsApp válido com DDD.');
        return;
      }
    }

    if (etapaAtual === 2) {
      const totalPossui = itens.filter((i) => i.possui).length;
      if (totalPossui === 0) {
        const confirmEmpty = confirm(
          'Nenhum item foi marcado como "Possui". Deseja realmente prosseguir sem nenhum bem selecionado?'
        );
        if (!confirmEmpty) return;
      }
    }

    setEtapaAtual((prev) => Math.min(4, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVoltarEtapa = () => {
    setEtapaAtual((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submissão Final (Etapa 4)
  const handleConfirmarEnvio = async () => {
    if (!church || !isFormularioLiberado) {
      toast.error('Preencha corretamente os dados do dirigente e certifique-se que a igreja é válida.');
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
        fotos: fotos.map((f) => ({
          nome: f.nome,
          legenda: f.legenda || null,
          tamanho: f.tamanho,
        })),
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
      console.error('Erro na submissão de patrimônio:', err);
      toast.error(err.message || 'Erro ao enviar dados. Verifique a conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Tela de Sucesso
  if (submittedSuccess && church) {
    const itensPositivos = itens.filter((i) => i.possui);
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 flex items-center justify-center font-sans">
        <Toaster position="top-center" richColors />
        <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white text-center relative overflow-hidden">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-white/10">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Cadastro Concluído!</h2>
            <p className="text-emerald-100 text-sm mt-1">
              O inventário patrimonial foi transmitido com sucesso à administração central.
            </p>
            {protocolo && (
              <div className="mt-4 inline-block bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider">
                Protocolo: {protocolo}
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Igreja</span>
                  <h4 className="font-bold text-slate-900 text-sm">{church.desc_igreja}</h4>
                </div>
                <span className="bg-indigo-100 text-indigo-800 font-mono font-bold px-2.5 py-0.5 rounded-md">
                  TOTVS: {church.codigo_totvs}
                </span>
              </div>
              <p className="text-slate-600 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {church.endereco ? `${church.endereco}, ` : ''}{church.bairro} - {church.municipio}/{church.estado}
              </p>
              <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Dirigente Local</span>
                  <span className="font-semibold">{nomeResponsavel}</span>
                  <span className="block font-mono text-[11px] text-slate-500">{telefoneResponsavel}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Ano Referência</span>
                  <span className="font-mono font-bold">{anoReferencia}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>Resumo dos Bens Cadastrados</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {itensPositivos.length} tipos de bens
                </span>
              </h5>

              {itensPositivos.length === 0 ? (
                <p className="text-slate-400 text-xs italic">Nenhum bem registrado como existente.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {itensPositivos.map((it, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">{it.item_nome}</span>
                        <span className="text-[10px] text-slate-400 ml-2 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                          {it.conservacao}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        Qtd: {it.quantidade}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {fotos.length > 0 && (
              <div className="border border-slate-200 rounded-2xl p-4">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Fotos Anexadas ({fotos.length})
                </h5>
                <div className="grid grid-cols-4 gap-2">
                  {fotos.map((f) => (
                    <img
                      key={f.id}
                      src={f.previewUrl}
                      alt={f.nome}
                      className="w-full h-16 object-cover rounded-xl border border-slate-200 shadow-2xs"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Imprimir Comprovante
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmittedSuccess(false);
                  setEtapaAtual(1);
                }}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
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
    <div className="min-h-screen bg-slate-100/70 py-6 px-3 sm:px-6 font-sans text-slate-800">
      <Toaster position="top-center" richColors />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Oficial IPDA */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 sm:p-7 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md">
                  IPDA
                </span>
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Controle Patrimonial
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Cadastro de Patrimônio da Igreja
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm">
                Preenchimento rápido e seguro dos bens materiais e equipamentos da igreja local.
              </p>
            </div>

            {church && (
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-3 sm:text-right shrink-0">
                <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">
                  Código TOTVS
                </span>
                <span className="text-lg font-mono font-black text-indigo-950">{church.codigo_totvs}</span>
              </div>
            )}
          </div>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-4 sm:p-5">
          <div className="grid grid-cols-4 gap-2">
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
                  className={`flex flex-col items-center sm:items-start p-2 sm:p-3 rounded-2xl transition-all text-left ${
                    isAtiva
                      ? 'bg-indigo-50/80 border border-indigo-200 shadow-2xs'
                      : isConcluida
                      ? 'bg-slate-50 hover:bg-slate-100 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                        isConcluida
                          ? 'bg-emerald-600 text-white'
                          : isAtiva
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isConcluida ? <Check className="h-3.5 w-3.5" /> : step.numero}
                    </div>
                    <span
                      className={`hidden sm:inline-block text-xs font-bold ${
                        isAtiva ? 'text-indigo-900' : isConcluida ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {step.titulo}
                    </span>
                  </div>
                  <span className="hidden sm:inline-block text-[10px] text-slate-400 font-medium truncate w-full">
                    {step.subtitulo}
                  </span>
                  <span className="sm:hidden text-[9px] font-bold text-center mt-1 text-slate-600">
                    {step.titulo.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* ETAPA 1: Validação por TOTVS e Dados do Dirigente        */}
        {/* ======================================================== */}
        {etapaAtual === 1 && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 sm:p-7 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Etapa 1: Validação por TOTVS e Dirigente Local
                </h3>
                <p className="text-xs text-slate-500">
                  Informe o Código TOTVS para localizar a congregação e confirme os dados do Dirigente Local.
                </p>
              </div>
            </div>

            {/* Campo TOTVS Editável com Debounce */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Código TOTVS da Igreja <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Digite o código TOTVS (ex: 10452)"
                  value={inputTotvs}
                  onChange={(e) => setInputTotvs(e.target.value.toUpperCase())}
                  className="w-full text-sm font-mono font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all text-slate-900"
                />
                {searchingChurch && (
                  <div className="absolute right-3 top-2.5 flex items-center gap-1 text-indigo-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-[11px] font-semibold">Buscando...</span>
                  </div>
                )}
              </div>

              {/* Card de Confirmação quando a Igreja é Encontrada */}
              {church && !searchingChurch && (
                <div className="mt-3 p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in zoom-in-95 duration-200 shadow-2xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    <span>Igreja Confirmada no Sistema</span>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base">
                      {church.desc_igreja}
                    </h4>
                    <p className="text-xs text-slate-700 flex items-start gap-1.5 mt-1 font-medium">
                      <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        {church.endereco ? `${church.endereco}, ` : ''}
                        {church.bairro ? `${church.bairro} - ` : ''}
                        {church.municipio}/{church.estado}
                      </span>
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-semibold pt-2 border-t border-emerald-200/70">
                    Confirme se o nome e o endereço acima pertencem à sua congregação antes de prosseguir.
                  </p>
                </div>
              )}

              {/* Alerta quando TOTVS NÃO for encontrado */}
              {churchNotFound && !searchingChurch && (
                <div className="mt-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 space-y-1">
                    <p className="font-bold">Código TOTVS não localizado</p>
                    <p className="text-rose-700 leading-relaxed">
                      Código TOTVS não encontrado. Verifique o número digitado com a sua regional. Os próximos passos permanecerão bloqueados até a confirmação de um código válido.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dados do Dirigente Local */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome Completo do Dirigente Local */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo do Dirigente Local <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pr. João Ferreira"
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    onBlur={() => handleBlurCampoEtapa1('nome_responsavel')}
                    className={`w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden transition-all ${
                      camposTocadosEtapa1.nome_responsavel && errosEtapa1.nome_responsavel
                        ? 'border-rose-300 focus:ring-2 focus:ring-rose-500 text-rose-900 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  {camposTocadosEtapa1.nome_responsavel && errosEtapa1.nome_responsavel && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errosEtapa1.nome_responsavel}
                    </p>
                  )}
                </div>
              </div>

              {/* Telefone / WhatsApp com Máscara e Validação de DDD */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefone / WhatsApp com DDD <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98765-4321"
                    maxLength={15}
                    value={telefoneResponsavel}
                    onChange={handleTelefoneChange}
                    onBlur={() => handleBlurCampoEtapa1('telefone_responsavel')}
                    className={`w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden transition-all font-mono ${
                      camposTocadosEtapa1.telefone_responsavel && !validacaoTel.valido
                        ? 'border-rose-300 focus:ring-2 focus:ring-rose-500 text-rose-900 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  {camposTocadosEtapa1.telefone_responsavel && !validacaoTel.valido && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validacaoTel.erro}
                    </p>
                  )}
                  {validacaoTel.valido && telefoneResponsavel && (
                    <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Número e DDD válidos
                    </p>
                  )}
                </div>
              </div>

              {/* Ano de Referência */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ano de Referência do Inventário
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={anoReferencia}
                  onChange={(e) => setAnoReferencia(Number(e.target.value))}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* Aviso Sutil sobre Atualização de Dados no Sistema */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Nota Importante:</strong> Os dados de contato inseridos acima (Nome do Dirigente Local e Telefone/WhatsApp) atualizarão o cadastro oficial da igreja no sistema central.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 2: Cadastro Dinâmico de Bens/Equipamentos           */}
        {/* ======================================================== */}
        {etapaAtual === 2 && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 sm:p-7 space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  Etapa 2: Cadastro Dinâmico de Bens e Equipamentos
                </h3>
                <p className="text-xs text-slate-500">
                  Marque "Sim" nos itens que a igreja possui, indique a quantidade e estado de conservação.
                </p>
              </div>

              <span className="bg-indigo-50 text-indigo-700 font-extrabold text-xs px-3 py-1.5 rounded-full border border-indigo-100 self-start sm:self-center">
                {totalBensDeclarados} {totalBensDeclarados === 1 ? 'item existente' : 'itens existentes'}
              </span>
            </div>

            {/* Categorias Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                    <span>{cat}</span>
                    {countNaCat > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {countNaCat}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Lista dos Itens */}
            <div className="space-y-3">
              {itensExibidos.map((item) => {
                const isChecked = item.possui;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isChecked
                        ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Checkbox e Título */}
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePossui(item.id)}
                          className="mt-0.5 h-5 w-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                        <div>
                          <span
                            className={`text-xs sm:text-sm font-bold block ${
                              isChecked ? 'text-indigo-950' : 'text-slate-700'
                            }`}
                          >
                            {item.item_nome}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            {item.categoria}
                          </span>
                        </div>
                      </label>

                      {/* Controles inline ao marcar Sim */}
                      {isChecked && (
                        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap ml-8 sm:ml-0">
                          {/* Stepper de Quantidade */}
                          <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
                              title="Diminuir"
                            >
                              -
                            </button>
                            <span className="px-2.5 text-xs font-mono font-bold text-slate-900 min-w-8 text-center">
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
                              title="Aumentar"
                            >
                              +
                            </button>
                          </div>

                          {/* Estado de Conservação */}
                          <select
                            value={item.conservacao}
                            onChange={(e) =>
                              handleConservacaoChange(
                                item.id,
                                e.target.value as 'ÓTIMO' | 'BOM' | 'REGULAR' | 'RUIM'
                              )
                            }
                            className="bg-white text-[11px] font-bold text-slate-700 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          >
                            <option value="ÓTIMO">Estado: Ótimo</option>
                            <option value="BOM">Estado: Bom</option>
                            <option value="REGULAR">Estado: Regular</option>
                            <option value="RUIM">Estado: Ruim / Reparo</option>
                          </select>

                          {item.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomItem(item.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remover item personalizado"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isChecked && (
                      <div className="mt-3 ml-8 pt-2.5 border-t border-indigo-100/70">
                        <input
                          type="text"
                          placeholder="Observação do bem (ex: Marca, modelo, potência, canal...)"
                          value={item.observacao || ''}
                          onChange={(e) => handleObservacaoItemChange(item.id, e.target.value)}
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-400 placeholder:text-slate-400 text-slate-700"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Adicionar Item Personalizado */}
            <div className="pt-3 border-t border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Não localizou algum equipamento ou bem?
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
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
                  className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar Item</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 3: Upload de Fotos / Documentos                    */}
        {/* ======================================================== */}
        {etapaAtual === 3 && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 sm:p-7 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ImageIcon className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Etapa 3: Fotos e Comprovantes dos Bens (Opcional)
                </h3>
                <p className="text-xs text-slate-500">
                  Tire fotos pelo celular ou anexe imagens dos principais equipamentos e instalações.
                </p>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1">
                <Upload className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">
                Toque para selecionar ou tirar foto
              </h4>
              <p className="text-slate-500 text-xs max-w-sm">
                Envie fotos dos equipamentos de som, púlpito, instrumentos musicais ou visão geral da igreja.
              </p>
              <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-full font-medium">
                JPG, PNG, WebP (até 10MB cada)
              </span>
            </div>

            {fotos.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  Fotos Selecionadas ({fotos.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fotos.map((foto) => (
                    <div
                      key={foto.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex gap-3 items-center relative group"
                    >
                      <img
                        src={foto.previewUrl}
                        alt={foto.nome}
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {foto.nome}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block mb-1">
                          {(foto.tamanho / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        <input
                          type="text"
                          placeholder="Legenda (ex: Mesa de som)"
                          value={foto.legenda || ''}
                          onChange={(e) => handleLegendaFotoChange(foto.id, e.target.value)}
                          className="w-full text-[11px] px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-400 text-slate-700"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFoto(foto.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Remover foto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ETAPA 4: Revisão dos dados e Confirmação de envio         */}
        {/* ======================================================== */}
        {etapaAtual === 4 && church && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 sm:p-7 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileCheck2 className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Etapa 4: Revisão dos Dados e Confirmação
                </h3>
                <p className="text-xs text-slate-500">
                  Revise atentamente todas as informações antes de transmitir o inventário oficial.
                </p>
              </div>
            </div>

            {/* Resumo Card 1: Igreja e Dirigente */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  Dados da Igreja e Dirigente Local
                </h4>
                <button
                  type="button"
                  onClick={() => setEtapaAtual(1)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Igreja / TOTVS</span>
                  <span className="font-bold text-slate-900">{church.desc_igreja} (TOTVS {church.codigo_totvs})</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Endereço</span>
                  <span className="text-slate-700">
                    {church.endereco ? `${church.endereco}, ` : ''}{church.bairro} - {church.municipio}/{church.estado}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Dirigente Local</span>
                  <span className="font-bold text-slate-900">{nomeResponsavel}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Contato WhatsApp</span>
                  <span className="font-mono text-slate-700">{telefoneResponsavel}</span>
                </div>
              </div>
            </div>

            {/* Resumo Card 2: Bens Declarados */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Armchair className="h-4 w-4 text-indigo-600" />
                  Bens e Equipamentos Declarados ({totalBensDeclarados})
                </h4>
                <button
                  type="button"
                  onClick={() => setEtapaAtual(2)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              {totalBensDeclarados === 0 ? (
                <p className="text-slate-400 text-xs italic">Nenhum bem marcado como existente.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-200/60 text-xs pr-1">
                  {itens
                    .filter((it) => it.possui)
                    .map((it) => (
                      <div key={it.id} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{it.item_nome}</span>
                          <span className="text-[10px] text-slate-400 ml-2 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                            {it.conservacao}
                          </span>
                          {it.observacao && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">
                              Obs: {it.observacao}
                            </p>
                          )}
                        </div>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                          Qtd: {it.quantidade}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Resumo Card 3: Fotos Anexadas */}
            {fotos.length > 0 && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-indigo-600" />
                    Fotos Anexadas ({fotos.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEtapaAtual(3)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {fotos.map((f) => (
                    <img
                      key={f.id}
                      src={f.previewUrl}
                      alt={f.nome}
                      className="w-full h-14 object-cover rounded-xl border border-slate-200"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Observações Finais */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Observações Finais sobre a Igreja ou Patrimônio (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Informe aqui observações sobre reformas necessárias, itens emprestados ou doações..."
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BARRA DE NAVEGAÇÃO INFERIOR DO WIZARD                     */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200/80 p-4 sm:p-5 flex items-center justify-between gap-3 sticky bottom-4 z-20">
          <button
            type="button"
            onClick={handleVoltarEtapa}
            disabled={etapaAtual === 1 || submitting}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              etapaAtual === 1
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Voltar</span>
          </button>

          <span className="text-xs font-mono font-bold text-slate-400 hidden sm:inline-block">
            Etapa {etapaAtual} de 4
          </span>

          {etapaAtual < 4 ? (
            <button
              type="button"
              onClick={handleAvancarEtapa}
              disabled={!isFormularioLiberado || searchingChurch}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Avançar</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalConfirmacaoAberto(true)}
              disabled={submitting || !isFormularioLiberado}
              className="px-7 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Gravando...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Confirmar e Enviar</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Modal de Confirmação Final */}
        {isModalConfirmacaoAberto && church && (
          <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="h-8 w-8" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Confirmar Envio do Inventário?
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Os dados declarados serão gravados oficialmente na base de patrimônio da igreja TOTVS{' '}
                  <strong className="text-slate-800 font-mono">{church.codigo_totvs}</strong> ({church.desc_igreja}).
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Bens declarados:</span>
                  <span className="font-bold text-slate-900">{totalBensDeclarados} itens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Fotos anexadas:</span>
                  <span className="font-bold text-slate-900">{fotos.length} foto(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Dirigente Local:</span>
                  <span className="font-bold text-slate-900">{nomeResponsavel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Telefone/WhatsApp:</span>
                  <span className="font-mono font-bold text-slate-900">{telefoneResponsavel}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalConfirmacaoAberto(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Revisar Mais
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEnvio}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Sim, Enviar Agora
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-slate-400 py-4">
          IPDA &copy; {new Date().getFullYear()} - Sistema de Gestão Georreferenciada e Patrimônio
        </footer>
      </div>
    </div>
  );
}
