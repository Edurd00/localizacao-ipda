'use client';

import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Loader2 } from 'lucide-react';
import { Igreja } from '@/lib/db';
import { toast } from 'sonner';
import { PORTE_INFO, getPorte, getDescendantCount, formatLeadershipTenure } from './GeneralMapComponent';

export interface ChurchDetailModalProps {
  ig: Igreja;
  igrejas: Igreja[];
  pontoOrigem: Igreja | null;
  setPontoOrigem: (ig: Igreja | null) => void;
  comparisonMode: boolean;
  setComparisonMode: (val: boolean) => void;
  fixedDest: Igreja | null;
  setFixedDest: (ig: Igreja | null) => void;
  sedeCandidataA: Igreja | null;
  setSedeCandidataA: (ig: Igreja | null) => void;
  sedeCandidataB: Igreja | null;
  setSedeCandidataB: (ig: Igreja | null) => void;
  connectionPathSource: string | null;
  isAuthenticated: boolean;
  handleTraceConnectionMesh: (ig: Igreja) => void;
  fetchTerrestrialRoute: (origin: Igreja, dest: Igreja, profile?: 'driving' | 'foot') => Promise<boolean>;
}

export default function ChurchDetailModal({
  ig,
  igrejas,
  pontoOrigem,
  setPontoOrigem,
  comparisonMode,
  setComparisonMode,
  fixedDest,
  setFixedDest,
  sedeCandidataA,
  setSedeCandidataA,
  sedeCandidataB,
  setSedeCandidataB,
  connectionPathSource,
  isAuthenticated,
  handleTraceConnectionMesh,
  fetchTerrestrialRoute,
}: ChurchDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'lideranca' | 'historico'>('geral');
  const [liderancaData, setLiderancaData] = useState<any>(null);
  const [loadingLideranca, setLoadingLideranca] = useState<boolean>(false);
  const [historicoData, setHistoricoData] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState<boolean>(false);

  // Fetch leadership data dynamically in real time for authenticated users
  useEffect(() => {
    if (activeTab === 'lideranca' && ig?.codigo_totvs) {
      setLoadingLideranca(true);
      fetch('/api/igrejas/lideranca?totvs=' + encodeURIComponent(ig.codigo_totvs))
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success && resData.data) {
            setLiderancaData(resData.data);
          } else {
            setLiderancaData(null);
          }
        })
        .catch((err) => {
          console.error('Error fetching leadership data:', err);
          setLiderancaData(null);
        })
        .finally(() => {
          setLoadingLideranca(false);
        });
    }
  }, [activeTab, ig?.codigo_totvs]);

  // Fetch audit history dynamically when history tab is selected
  useEffect(() => {
    if (activeTab === 'historico' && ig?.codigo_totvs) {
      setLoadingHistorico(true);
      fetch('/api/igrejas/historico?totvs=' + encodeURIComponent(ig.codigo_totvs))
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success && Array.isArray(resData.data)) {
            setHistoricoData(resData.data);
          } else {
            setHistoricoData([]);
          }
        })
        .catch((err) => {
          console.error('Error fetching history data:', err);
          setHistoricoData([]);
        })
        .finally(() => {
          setLoadingHistorico(false);
        });
    }
  }, [activeTab, ig?.codigo_totvs]);

  const porte = ig.porte || getPorte(ig.desc_igreja, ig.porte);
  const parentChurch = ig.codigo_totvs_pai
    ? igrejas.find((p) => String(p.codigo_totvs) === String(ig.codigo_totvs_pai))
    : null;
  const totalCascata = getDescendantCount(ig.codigo_totvs, igrejas);

  return (
    <div className="w-[350px] p-4 bg-white rounded-2xl overflow-hidden text-slate-800 space-y-3 font-sans text-xs">
      {/* Title & Header Badges */}
      <div className="border-b border-slate-150 pb-2.5">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
          {ig.desc_igreja}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
            TOTVS: {ig.codigo_totvs}
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border text-white"
            style={{
              backgroundColor: PORTE_INFO[porte]?.color || '#A6A6A6',
              borderColor: 'rgba(0,0,0,0.1)',
            }}
          >
            {porte}
          </span>
          {totalCascata > 0 && (
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full border border-indigo-200 inline-flex items-center gap-1">
              🏛️ {totalCascata} na malha
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('geral')}
          className={`flex-1 py-1.5 text-center text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'geral'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📍 Geral
        </button>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setActiveTab('lideranca')}
            className={`flex-1 py-1.5 text-center text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'lideranca'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            👥 Liderança
          </button>
        )}
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`flex-1 py-1.5 text-center text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'historico'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🕒 Histórico
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="pt-1">
        {activeTab === 'geral' && (
          <div className="space-y-3 text-slate-600">
            {ig.tipo_imovel && (
              <p className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  <span className="font-semibold text-slate-400">Tipo de Imóvel:</span>{' '}
                  <span className="font-bold text-slate-800">{ig.tipo_imovel}</span>
                </span>
              </p>
            )}

            <p className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold text-slate-400">Endereço:</span>{' '}
                <span className="text-slate-800 font-medium">
                  {ig.endereco}
                  {ig.bairro ? `, ${ig.bairro}` : ''}, {ig.municipio} - {ig.estado}
                  {ig.cep ? ` (${ig.cep})` : ''}
                </span>
              </span>
            </p>

            {((ig.qtd_membros !== null && ig.qtd_membros !== undefined && ig.qtd_membros > 0) ||
              (ig.qtd_jovens !== null && ig.qtd_jovens !== undefined && ig.qtd_jovens > 0)) && (
              <div className="flex items-center gap-2 font-bold text-slate-800 bg-slate-100 p-2 rounded-lg border border-slate-200 text-[11px] mt-2">
                <span>👥 {ig.qtd_membros || 0} Membros</span>
                <span className="text-slate-300">|</span>
                <span>⚡ {ig.qtd_jovens || 0} Jovens</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              {comparisonMode ? (
                String(fixedDest?.codigo_totvs) === String(ig.codigo_totvs) ? (
                  <div className="space-y-2.5 my-3">
                    <div className="h-9 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center gap-1">
                      <span>📍 Alvo de Análise</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setComparisonMode(false);
                          setFixedDest(null);
                          setSedeCandidataA(null);
                          setSedeCandidataB(null);
                          toast.info('Modo comparativo desativado.');
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                      >
                        <span className="text-sm">📐</span>
                        <span className="truncate font-semibold">Cancelar Comp.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTraceConnectionMesh(ig)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border rounded-xl transition-all cursor-pointer ${
                          String(connectionPathSource) === String(ig.codigo_totvs)
                            ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <span className="text-sm">{String(connectionPathSource) === String(ig.codigo_totvs) ? '❌' : '🔗'}</span>
                        <span className="truncate font-semibold">{String(connectionPathSource) === String(ig.codigo_totvs) ? 'Ocultar Malha' : 'Ver Malha'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 my-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSedeCandidataA(ig);
                          toast.success(`Sede Candidata A definida: ${ig.desc_igreja}`);
                        }}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border rounded-xl transition-all cursor-pointer ${
                          String(sedeCandidataA?.codigo_totvs) === String(ig.codigo_totvs)
                            ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <span className="text-sm">🟢</span>
                        <span className="truncate font-semibold">Sede Cand. A</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSedeCandidataB(ig);
                          toast.success(`Sede Candidata B definida: ${ig.desc_igreja}`);
                        }}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border rounded-xl transition-all cursor-pointer ${
                          String(sedeCandidataB?.codigo_totvs) === String(ig.codigo_totvs)
                            ? 'border-cyan-500 bg-cyan-500 text-white hover:bg-cyan-600'
                            : 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800'
                        }`}
                      >
                        <span className="text-sm">🔵</span>
                        <span className="truncate font-semibold">Sede Cand. B</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setComparisonMode(true);
                          setFixedDest(ig);
                          setSedeCandidataA(null);
                          setSedeCandidataB(null);
                          toast.success(`Novo destino definido: "${ig.desc_igreja}". Selecione as candidatas A e B.`);
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                      >
                        <span className="text-sm">📐</span>
                        <span className="truncate font-semibold">Comparar Rotas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTraceConnectionMesh(ig)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border rounded-xl transition-all cursor-pointer ${
                          String(connectionPathSource) === String(ig.codigo_totvs)
                            ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <span className="text-sm">{String(connectionPathSource) === String(ig.codigo_totvs) ? '❌' : '🔗'}</span>
                        <span className="truncate font-semibold">{String(connectionPathSource) === String(ig.codigo_totvs) ? 'Ocultar Malha' : 'Ver Malha'}</span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <>
                  {/* Grid 2x2 para os 4 botões de ação */}
                  <div className="grid grid-cols-2 gap-2.5 my-3">
                    {/* 1. Rota Superior */}
                    <button
                      type="button"
                      disabled={!(ig.codigo_totvs_pai && parentChurch)}
                      onClick={() => fetchTerrestrialRoute(ig, parentChurch!)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title={ig.codigo_totvs_pai && parentChurch ? `Rota para Sede Superior: ${parentChurch.desc_igreja}` : 'Sem coligação superior registrada'}
                    >
                      <span className="text-sm">🚗</span>
                      <span className="truncate font-semibold">Rota Superior</span>
                    </button>

                    {/* 2. Definir Origem */}
                    {!pontoOrigem ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPontoOrigem(ig);
                          toast.success(`Origem definida: ${ig.desc_igreja}`);
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                      >
                        <span className="text-sm">📍</span>
                        <span className="truncate font-semibold">Definir Origem</span>
                      </button>
                    ) : String(pontoOrigem.codigo_totvs) !== String(ig.codigo_totvs) ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const routeWasCreated = await fetchTerrestrialRoute(pontoOrigem, ig);
                          if (routeWasCreated) {
                            setPontoOrigem(null);
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-all cursor-pointer shadow-xs"
                        title={`Traçar rota a partir de ${pontoOrigem.desc_igreja}`}
                      >
                        <span className="text-sm">🏁</span>
                        <span className="truncate font-semibold">Traçar Rota</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPontoOrigem(null);
                          toast.info('Origem de rota cancelada.');
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-all cursor-pointer"
                      >
                        <span className="text-sm">❌</span>
                        <span className="truncate font-semibold">Cancelar Origem</span>
                      </button>
                    )}

                    {/* 3. Comparar Rotas */}
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonMode(true);
                        setFixedDest(ig);
                        setSedeCandidataA(null);
                        setSedeCandidataB(null);
                        toast.success(`Modo Comparativo Ativo! "${ig.desc_igreja}" definido como Destino.`);
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                    >
                      <span className="text-sm">📐</span>
                      <span className="truncate font-semibold">Comparar Rotas</span>
                    </button>

                    {/* 4. Ver Malha */}
                    <button
                      type="button"
                      onClick={() => handleTraceConnectionMesh(ig)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border rounded-xl transition-all cursor-pointer ${
                        String(connectionPathSource) === String(ig.codigo_totvs)
                          ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span className="text-sm">{String(connectionPathSource) === String(ig.codigo_totvs) ? '❌' : '🔗'}</span>
                      <span className="truncate font-semibold">{String(connectionPathSource) === String(ig.codigo_totvs) ? 'Ocultar Malha' : 'Ver Malha'}</span>
                    </button>
                  </div>
                </>
              )}

              {/* Botão Principal Roxo em Largura Total */}
              <a
                href={ig.link_google_maps || `https://www.google.com/maps?q=${ig.latitude},${ig.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>🗺️</span>
                <span>Abrir no Google Maps ↗</span>
              </a>

              {/* Bloco de Coligação (Igreja Mãe / Pai) reestruturado ao final da aba Geral */}
              <hr className="my-4 border-zinc-200 dark:border-slate-700" />
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-1">
                <span className="font-bold text-slate-400 text-[9px] uppercase tracking-wider block">Coligada a:</span>
                {ig.codigo_totvs_pai ? (
                  <>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {parentChurch ? parentChurch.desc_igreja : 'Igreja Superior'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Código TOTVS: {ig.codigo_totvs_pai}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 italic text-xs">Sede Raiz (Sem coligação superior).</p>
                )}
              </div>
            </div>
          </div>
        )}

        {isAuthenticated && activeTab === 'lideranca' && (
          <div className="space-y-2">
            {loadingLideranca ? (
              <div className="flex items-center justify-center p-6 text-indigo-600 gap-2 font-medium">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Carregando dados de liderança...</span>
              </div>
            ) : liderancaData && (liderancaData.dirigente_nome || liderancaData.financeira_nome) ? (
              <>
                {liderancaData.dirigente_nome && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg my-1 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-xs truncate flex items-center gap-1">
                          <span>👔</span> {liderancaData.dirigente_nome}
                        </p>
                        <div className="flex items-center gap-1.5 my-1 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-medium">Dirigente Local</span>
                          <span className="text-slate-300">•</span>
                          {liderancaData.tipo_prebenda === 'PREBENDADA' ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                              💼 Prebendado
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-medium">
                              🤝 Voluntário
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {liderancaData.dirigente_data_posse && (
                      <p className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-150 font-bold mt-1.5">
                        📅 {formatLeadershipTenure(liderancaData.dirigente_data_posse)}
                      </p>
                    )}

                    {liderancaData.dirigente_telefone && (
                      <div className="flex items-center justify-between gap-2 pt-1.5 mt-1.5 border-t border-slate-200/60">
                        <a
                          href={`tel:${liderancaData.dirigente_telefone.replace(/\D/g, '')}`}
                          className="text-slate-700 hover:text-blue-600 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          title="Clique para ligar"
                        >
                          <span>📞</span> {liderancaData.dirigente_telefone}
                        </a>

                        <a
                          href={`https://wa.me/55${liderancaData.dirigente_telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors shrink-0"
                        >
                          <span>💬</span> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {liderancaData.financeira_nome && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg my-1 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-xs truncate flex items-center gap-1">
                          <span>💰</span> {liderancaData.financeira_nome}
                        </p>
                        <span className="text-[10px] text-slate-500 font-medium">Voluntária Financeira</span>
                      </div>
                    </div>

                    {liderancaData.financeira_telefone && (
                      <div className="flex items-center justify-between gap-2 pt-1.5 mt-1.5 border-t border-slate-200/60">
                        <a
                          href={`tel:${liderancaData.financeira_telefone.replace(/\D/g, '')}`}
                          className="text-slate-700 hover:text-blue-600 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          title="Clique para ligar"
                        >
                          <span>📞</span> {liderancaData.financeira_telefone}
                        </a>

                        <a
                          href={`https://wa.me/55${liderancaData.financeira_telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors shrink-0"
                        >
                          <span>💬</span> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400 italic text-xs p-2 text-center">Informação indisponível.</p>
            )}
          </div>
        )}


        {isAuthenticated && activeTab === 'historico' && (
          <div className="space-y-3 py-1">
            {loadingHistorico ? (
              <div className="flex items-center justify-center p-6 text-indigo-600 gap-2 font-medium">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Carregando histórico de alterações...</span>
              </div>
            ) : historicoData && historicoData.length > 0 ? (
              <div className="border-l-2 border-zinc-200 ml-2 pl-4 space-y-4 my-2 max-h-[280px] overflow-y-auto pr-1">
                {historicoData.map((item, index) => {
                  const dateFormatted = item.criado_em
                    ? new Date(item.criado_em).toLocaleString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '---';

                  const fieldDictionary: Record<string, string> = {
                    qtd_membros: 'Nº de Membros',
                    qtd_jovens: 'Nº de Jovens',
                    dirigente_nome: 'Dirigente',
                    dirigente_email: 'E-mail do Dirigente',
                    dirigente_telefone: 'Telefone do Dirigente',
                    dirigente_data_posse: 'Data de Posse do Dirigente',
                    financeira_nome: 'Responsável Financeiro',
                    financeira_email: 'E-mail da Financeira',
                    financeira_telefone: 'Telefone da Financeira',
                    tipo_prebenda: 'Tipo de Prebenda',
                    desc_igreja: 'Nome da Igreja',
                    porte: 'Porte',
                    endereco: 'Endereço',
                    bairro: 'Bairro',
                    municipio: 'Município',
                    estado: 'Estado (UF)',
                    cep: 'CEP',
                    status: 'Status',
                    codigo_totvs_pai: 'Sede Coligada (Pai)',
                    reorganizar_filhas_para: 'Transferência de Filhas'
                  };

                  const modifiedKeys = item.detalhes && typeof item.detalhes === 'object'
                    ? Object.keys(item.detalhes).map((k) => fieldDictionary[k] || k)
                    : [];

                  return (
                    <div key={item.id || index} className="relative group">
                      {/* Timeline Node Dot */}
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-500 font-mono">
                          <span>{dateFormatted}</span>
                          <span className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase border border-indigo-150">
                            {item.acao || 'ALTERAÇÃO'}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-800 leading-snug">
                          👤 <strong className="font-bold text-zinc-950">{item.usuario_nome || 'Usuário'}</strong> realizou uma alteração
                        </p>

                        {modifiedKeys.length > 0 && (
                          <p className="text-xs text-zinc-800 dark:text-slate-200 mt-1">
                            Atualizou: <span className="font-semibold">{modifiedKeys.join(', ')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic text-xs p-4 text-center">
                Nenhuma alteração registrada ainda.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
