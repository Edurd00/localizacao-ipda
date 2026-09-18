'use client';

import React, { useState } from 'react';
import {
  X,
  Phone,
  HelpCircle,
  Building2,
  BookOpen,
  Headphones,
  Search,
  MapPin,
  Layers,
  Navigation,
  Compass,
  GitCompare,
  Network,
  UserCheck,
  Package,
  History,
  ShieldCheck,
} from 'lucide-react';

interface HelpTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpTutorialModal({ isOpen, onClose }: HelpTutorialModalProps) {
  const [activeTab, setActiveTab] = useState<'sobre' | 'guia' | 'suporte'>('sobre');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[2025] transition-opacity"
        onClick={onClose}
      />

      {/* Main Responsive Modal Container */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 z-[2030] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full sm:max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom sm:zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top visual drag handle pill for mobile view */}
          <div className="pt-3 pb-1 sm:hidden flex justify-center shrink-0">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 dark:bg-slate-800 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  Central de Ajuda & Tutorial
                </h2>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  GEO-VALIG IPDA • Manual do Usuário
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation Segmented Control */}
          <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('sobre')}
                className={`flex-1 py-2 px-2 sm:px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'sobre'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">Sobre o Projeto</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('guia')}
                className={`flex-1 py-2 px-2 sm:px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'guia'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">Guia & Passo a Passo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('suporte')}
                className={`flex-1 py-2 px-2 sm:px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'suporte'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Headphones className="h-4 w-4 shrink-0" />
                <span className="truncate">Suporte & Contato</span>
              </button>
            </div>
          </div>

          {/* Tab Contents Area */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-slate-700 dark:text-slate-300">
            {/* Tab 1: Sobre o Projeto */}
            {activeTab === 'sobre' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-extrabold text-sm">
                    <span className="text-base">🏢</span>
                    <h3>Apresentação do Sistema GEO-VALIG IPDA</h3>
                  </div>
                  <p className="leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                    O <strong>GEO-VALIG IPDA</strong> é a plataforma geográfica oficial desenvolvida para mapear, organizar e gerenciar os dados de mais de <strong>12.000 congregações</strong> da Igreja Pentecostal Deus é Amor no Brasil e no mundo.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    🎯 Objetivos Principais
                  </h4>
                  <ul className="space-y-2.5 font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-0.5">✓</span>
                      <span>
                        <strong>Precisão de Endereço:</strong> Validação rigorosa de coordenadas de latitude e longitude para garantir que os fiéis e visitantes encontrem os templos corretamente.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-0.5">✓</span>
                      <span>
                        <strong>Navegação Pública:</strong> Facilitar o acesso da população às informações das congregações mais próximas e rotas de deslocamento.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-0.5">✓</span>
                      <span>
                        <strong>Decisões Estratégicas:</strong> Auxiliar a liderança geral na análise de cobertura territorial, otimização da malha hierárquica e gestão patrimonial.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 2: Guia e Funcionalidades */}
            {activeTab === 'guia' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Block A: Public Resources */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
                    <span className="text-sm">🌐</span>
                    <span>A. Recursos Públicos (Acessíveis a Todos)</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <Search className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Pesquisa Rápida
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Utilize a barra de busca no topo para encontrar qualquer congregação instantaneamente pesquisando por <strong>Código TOTVS</strong>, <strong>Nome da Igreja</strong>, <strong>Rua</strong> ou <strong>Cidade/UF</strong>.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Visualização do Mapa
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Alterne entre o <strong>Mapa de Ruas (OSM)</strong> e a <strong>Visão de Satélite (Esri)</strong> através do seletor flutuante no canto superior direito do mapa.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Cores e Agrupamentos (Clusters)
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Os círculos coloridos com números agrupam congregações próximas por Região/UF. As cores dos marcadores individuais identificam o <strong>Porte Oficial</strong> da igreja (Estadual, Setorial, Central, Regional, Local, Casa de Oração e Aldeia Indígena).
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <Navigation className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Rota até o Superior
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Ao clicar em uma igreja, selecione o botão <strong>'Rota Superior'</strong> para desenhar a linha do caminho até a Sede direta à qual ela está subordinada.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <Compass className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Definir Origem
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Marque uma congregação inicial como ponto de partida personalizado para calcular rotas e distâncias de viagem no mapa.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <GitCompare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Comparar Rotas
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Acesse o simulador inteligente para comparar distâncias e tempos de viagem de uma igreja em relação a duas sedes candidatas e identificar o caminho mais vantajoso e econômico.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <Network className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Ver Malha
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Acione o botão <strong>'Ver Malha'</strong> no popup da igreja para desenhar a teia de conexões de todas as congregações superiores e subordinadas ligadas àquela unidade.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Block B: Restricted Resources */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4" />
                    <span>B. Recursos Restritos (Para Usuários Autenticados)</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="p-3 bg-amber-50/40 dark:bg-slate-800/60 rounded-xl border border-amber-200/60 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <UserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        Informações do Dirigente e Contatos
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Na aba 'Liderança', visualize o nome do pastor/obreiro responsável, tempo de posse e inicie conversa direta no WhatsApp com os contatos cadastrados.
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50/40 dark:bg-slate-800/60 rounded-xl border border-amber-200/60 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <Package className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        Aba de Patrimônio
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Consulte o inventário de bens cadastrados da congregação (equipamentos de som, mobiliários, climatização) e verifique o estado de conservação atualizado.
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50/40 dark:bg-slate-800/60 rounded-xl border border-amber-200/60 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <History className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        Histórico de Atualizações
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Acompanhe a linha do tempo de alterações de auditoria da igreja para identificar quem realizou as últimas modificações de localização ou cadastros e quando ocorreram.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Suporte & Contato */}
            {activeTab === 'suporte' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    🎧 Atendimento Oficial
                  </h3>
                  <p className="leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                    O suporte técnico e auxílio operacional ao sistema GEO-VALIG são prestados diretamente pelo setor corporativo de <strong>Gestão de Dados IPDA</strong>.
                  </p>
                </div>

                {/* Featured Landline Phone Card */}
                <div className="bg-indigo-50 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
                  <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-sm shrink-0">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                      Setor: Gestão de Dados IPDA
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block font-mono">
                      (11) 3348-0807
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Atendimento em horário comercial
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  💡 Para dúvidas sobre cadastros de igrejas, alteração de sedes, solicitações de acesso ou relatórios customizados, entre em contato com nosso atendimento telefônico oficial.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
