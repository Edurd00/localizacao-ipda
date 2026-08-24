'use client';

import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { Igreja } from '@/lib/db';
import { toast } from 'sonner';

interface SearchableChurchSelectProps {
  label: string;
  selectedChurch: Igreja | null;
  igrejas: Igreja[];
  onSelect: (church: Igreja) => void;
  accentColorClass: string;
}

function SearchableChurchSelect({
  label,
  selectedChurch,
  igrejas,
  onSelect,
  accentColorClass,
}: SearchableChurchSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return igrejas.slice(0, 8);
    return igrejas
      .filter(
        (ig) =>
          String(ig.codigo_totvs).toLowerCase().includes(q) ||
          ig.desc_igreja.toLowerCase().includes(q) ||
          (ig.municipio && ig.municipio.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [igrejas, query]);

  return (
    <div className="relative w-full">
      <label className={`text-[9px] font-bold ${accentColorClass} uppercase tracking-wider block mb-1`}>
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder={selectedChurch ? `${selectedChurch.desc_igreja} (${selectedChurch.codigo_totvs})` : 'Buscar igreja por nome ou TOTVS...'}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="w-full text-xs font-semibold bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-lg pl-7 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-800 dark:text-slate-100 placeholder:text-zinc-400"
        />
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-400" />
      </div>

      {isOpen && filtered.length > 0 && (
        <>
          <div className="fixed inset-0 z-[1040]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-xl shadow-xl z-[1050] max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-slate-800">
            {filtered.map((ig) => (
              <button
                key={ig.codigo_totvs}
                type="button"
                onClick={() => {
                  onSelect(ig);
                  setQuery('');
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2 hover:bg-zinc-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors ${
                  selectedChurch && String(selectedChurch.codigo_totvs) === String(ig.codigo_totvs)
                    ? 'bg-indigo-50 text-indigo-900 font-bold'
                    : 'text-zinc-800 dark:text-slate-200'
                }`}
              >
                <div className="font-bold truncate">{ig.desc_igreja}</div>
                <div className="text-[10px] text-zinc-400">
                  TOTVS: {ig.codigo_totvs} • {ig.municipio} - {ig.estado}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export interface RouteCompareModalProps {
  comparisonMode: boolean;
  fixedDest: Igreja | null;
  igrejas: Igreja[];
  sedeCandidataA: Igreja | null;
  sedeCandidataB: Igreja | null;
  metaAtual: { distance: number; duration: string } | null;
  metaCandidataA: { distance: number; duration: string } | null;
  metaCandidataB: { distance: number; duration: string } | null;
  isAuthenticated: boolean;
  setComparisonMode: (val: boolean) => void;
  setFixedDest: (ig: Igreja | null) => void;
  setSedeCandidataA: (ig: Igreja | null) => void;
  setSedeCandidataB: (ig: Igreja | null) => void;
  handleTransferColigacao: (candidata: Igreja) => void;
}

export default function RouteCompareModal({
  comparisonMode,
  fixedDest,
  igrejas,
  sedeCandidataA,
  sedeCandidataB,
  metaAtual,
  metaCandidataA,
  metaCandidataB,
  isAuthenticated,
  setComparisonMode,
  setFixedDest,
  setSedeCandidataA,
  setSedeCandidataB,
  handleTransferColigacao,
}: RouteCompareModalProps) {
  const [comparisonTransportMode, setComparisonTransportMode] = useState<'car' | 'bus'>('car');

  if (!comparisonMode || !fixedDest) return null;

  const parentChurch = fixedDest.codigo_totvs_pai
    ? igrejas.find((p) => String(p.codigo_totvs) === String(fixedDest.codigo_totvs_pai))
    : null;

  const shortestOption = (() => {
    const options = [];
    if (metaAtual) options.push({ type: 'atual', distance: metaAtual.distance });
    if (metaCandidataA) options.push({ type: 'A', distance: metaCandidataA.distance });
    if (metaCandidataB) options.push({ type: 'B', distance: metaCandidataB.distance });

    if (options.length === 0) return null;
    let minOpt = options[0];
    for (let i = 1; i < options.length; i++) {
      if (options[i].distance < minOpt.distance) {
        minOpt = options[i];
      }
    }
    return minOpt.type;
  })();

  const economyA = metaAtual && metaCandidataA
    ? (metaAtual.distance - metaCandidataA.distance).toFixed(1)
    : null;

  const economyB = metaAtual && metaCandidataB
    ? (metaAtual.distance - metaCandidataB.distance).toFixed(1)
    : null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1025] md:hidden"
        onClick={() => {
          setComparisonMode(false);
          setFixedDest(null);
        }}
      />
      <div className="fixed bottom-0 left-0 right-0 top-auto md:absolute md:top-24 md:right-6 md:bottom-auto md:left-auto w-full md:w-96 rounded-t-3xl md:rounded-2xl border-t md:border border-zinc-200 bg-white shadow-2xl p-5 space-y-4 z-[1030] max-h-[85vh] overflow-y-auto duration-300 animate-in slide-in-from-bottom md:slide-in-from-top-2 flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-150 pb-2.5 gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-900">
            <span className="text-base">📐</span>
            <h3 className="text-xs font-black uppercase tracking-wider">
              Comparativo de Rotas e Proximidade
            </h3>
          </div>
          <button
            onClick={() => {
              setComparisonMode(false);
              setFixedDest(null);
              toast.info('Modo comparativo desativado.');
            }}
            className="text-zinc-400 hover:text-zinc-650 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-zinc-100 rounded-full transition-all"
            title="Fechar Comparador"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5 text-xs shrink-0">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Igreja Alvo (Destino)</span>
          <span className="font-bold text-zinc-900 block truncate" title={fixedDest.desc_igreja}>{fixedDest.desc_igreja}</span>
        </div>

        {/* Transport Mode Toggle */}
        <div className="flex bg-zinc-100 dark:bg-slate-800 p-1 rounded-xl border border-zinc-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => setComparisonTransportMode('car')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              comparisonTransportMode === 'car'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-slate-200 hover:bg-zinc-50 dark:hover:bg-slate-750'
            }`}
          >
            <span>🚗 Carro / Moto</span>
          </button>
          <button
            type="button"
            onClick={() => setComparisonTransportMode('bus')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              comparisonTransportMode === 'bus'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-slate-200 hover:bg-zinc-50 dark:hover:bg-slate-750'
            }`}
          >
            <span>🚌 Ônibus / Trem</span>
          </button>
        </div>

        <div className="space-y-3 pt-1 border-t border-zinc-100 overflow-y-auto">
          {/* Sede Atual Card */}
          <div className="p-2.5 bg-zinc-50 dark:bg-slate-800/50 border border-zinc-150 dark:border-slate-800 rounded-xl space-y-2 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Sede Atual (Vinculada)
                </span>
                {shortestOption === 'atual' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-250">
                    ⚡ Mais Próxima
                  </span>
                )}
              </div>
              {metaAtual && (
                <span className="text-xs font-black text-zinc-800 dark:text-slate-250">
                  {metaAtual.distance} km • {metaAtual.duration}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-600 dark:text-slate-400 font-bold block truncate max-w-[150px]">
                {parentChurch ? parentChurch.desc_igreja : fixedDest.codigo_totvs_pai ? `TOTVS: ${fixedDest.codigo_totvs_pai}` : 'Nenhuma vinculada'}
              </span>
              {parentChurch && parentChurch.latitude && parentChurch.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${parentChurch.latitude},${parentChurch.longitude}&destination=${fixedDest.latitude},${fixedDest.longitude}&travelmode=${comparisonTransportMode === 'bus' ? 'transit' : 'driving'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 min-h-[44px] transition-all border ${
                    comparisonTransportMode === 'bus'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-250 hover:bg-amber-100'
                      : 'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 border-zinc-200 dark:border-slate-700 hover:bg-zinc-200 dark:hover:bg-slate-700'
                  }`}
                  title="Ver trajeto e custos no Google Maps"
                >
                  <span>{comparisonTransportMode === 'bus' ? '🚌 Ônibus' : '🚗 Carro'}</span>
                </a>
              )}
            </div>
          </div>

          {/* Sede Candidata A Card (Select / Combobox) */}
          <div className="p-2.5 bg-zinc-50 dark:bg-slate-800/50 border border-zinc-150 dark:border-slate-800 rounded-xl space-y-2 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Candidata A
                </span>
                {shortestOption === 'A' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-250 animate-pulse">
                    ⚡ Mais Próxima {economyA && Number(economyA) > 0 ? `(Economia de ${economyA} km)` : ''}
                  </span>
                )}
              </div>
              {metaCandidataA && (
                <span className="text-xs font-black text-zinc-800 dark:text-slate-250">
                  {metaCandidataA.distance} km • {metaCandidataA.duration}
                </span>
              )}
            </div>

            <SearchableChurchSelect
              label="Selecionar Candidata A"
              selectedChurch={sedeCandidataA}
              igrejas={igrejas}
              onSelect={(church) => {
                setSedeCandidataA(church);
                toast.success(`Candidata A: ${church.desc_igreja}`);
              }}
              accentColorClass="text-emerald-700"
            />

            {sedeCandidataA && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-800 dark:text-slate-200 font-bold block truncate max-w-[180px]" title={sedeCandidataA.desc_igreja}>
                    {sedeCandidataA.desc_igreja}
                  </span>
                  {sedeCandidataA.latitude && sedeCandidataA.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${sedeCandidataA.latitude},${sedeCandidataA.longitude}&destination=${fixedDest.latitude},${fixedDest.longitude}&travelmode=${comparisonTransportMode === 'bus' ? 'transit' : 'driving'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 min-h-[44px] transition-all border ${
                        comparisonTransportMode === 'bus'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-250 hover:bg-amber-100'
                          : 'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 border-zinc-200 dark:border-slate-700 hover:bg-zinc-200 dark:hover:bg-slate-700'
                      }`}
                      title="Ver trajeto e custos no Google Maps"
                    >
                      <span>{comparisonTransportMode === 'bus' ? '🚌 Ônibus' : '🚗 Carro'}</span>
                    </a>
                  )}
                </div>

                {metaAtual && metaCandidataA && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-slate-800">
                    {metaAtual.distance - metaCandidataA.distance > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 px-2.5 py-1.5 rounded-full border border-emerald-250 text-center">
                        🟢 {(metaAtual.distance - metaCandidataA.distance).toFixed(1)}km mais perto
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300 px-2.5 py-1.5 rounded-full border border-rose-250 text-center">
                        🔴 {Math.abs(metaAtual.distance - metaCandidataA.distance).toFixed(1)}km mais longe
                      </span>
                    )}

                    {isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => handleTransferColigacao(sedeCandidataA)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm w-full py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5"
                        title="Gravar nova vinculação hierárquica"
                      >
                        <span>🔄 Transferir Coligação para Candidata A</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-400 dark:text-slate-500 font-black italic bg-zinc-100 dark:bg-slate-800/85 border border-zinc-200 dark:border-slate-700 px-3 py-2 rounded-xl text-center">
                        🔒 Transferência bloqueada (Login requerido)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sede Candidata B Card (Select / Combobox) */}
          <div className="p-2.5 bg-zinc-50 dark:bg-slate-800/50 border border-zinc-150 dark:border-slate-800 rounded-xl space-y-2 border-l-4 border-l-cyan-500">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  Candidata B
                </span>
                {shortestOption === 'B' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-250 animate-pulse">
                    ⚡ Mais Próxima {economyB && Number(economyB) > 0 ? `(Economia de ${economyB} km)` : ''}
                  </span>
                )}
              </div>
              {metaCandidataB && (
                <span className="text-xs font-black text-zinc-800 dark:text-slate-250">
                  {metaCandidataB.distance} km • {metaCandidataB.duration}
                </span>
              )}
            </div>

            <SearchableChurchSelect
              label="Selecionar Candidata B"
              selectedChurch={sedeCandidataB}
              igrejas={igrejas}
              onSelect={(church) => {
                setSedeCandidataB(church);
                toast.success(`Candidata B: ${church.desc_igreja}`);
              }}
              accentColorClass="text-cyan-700"
            />

            {sedeCandidataB && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-800 dark:text-slate-200 font-bold block truncate max-w-[180px]" title={sedeCandidataB.desc_igreja}>
                    {sedeCandidataB.desc_igreja}
                  </span>
                  {sedeCandidataB.latitude && sedeCandidataB.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${sedeCandidataB.latitude},${sedeCandidataB.longitude}&destination=${fixedDest.latitude},${fixedDest.longitude}&travelmode=${comparisonTransportMode === 'bus' ? 'transit' : 'driving'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 min-h-[44px] transition-all border bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 border-zinc-200 dark:border-slate-700 hover:bg-zinc-200 dark:hover:bg-slate-700"
                      title="Ver trajeto e custos no Google Maps"
                    >
                      <span>{comparisonTransportMode === 'bus' ? '🚌 Ônibus' : '🚗 Carro'}</span>
                    </a>
                  )}
                </div>

                {metaAtual && metaCandidataB && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-slate-800">
                    {metaAtual.distance - metaCandidataB.distance > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 px-2.5 py-1.5 rounded-full border border-emerald-250 text-center">
                        🟢 {(metaAtual.distance - metaCandidataB.distance).toFixed(1)}km mais perto
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300 px-2.5 py-1.5 rounded-full border border-rose-250 text-center">
                        🔴 {Math.abs(metaAtual.distance - metaCandidataB.distance).toFixed(1)}km mais longe
                      </span>
                    )}

                    {isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => handleTransferColigacao(sedeCandidataB)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm w-full py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5"
                        title="Gravar nova vinculação hierárquica"
                      >
                        <span>🔄 Transferir Coligação para Candidata B</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-400 dark:text-slate-500 font-black italic bg-zinc-100 dark:bg-slate-800/85 border border-zinc-200 dark:border-slate-700 px-3 py-2 rounded-xl text-center">
                        🔒 Transferência bloqueada (Login requerido)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-100 dark:border-slate-800 text-[9px] text-zinc-500 leading-normal shrink-0">
          <span>ℹ️ Nota: É possível buscar qualquer outra igreja do sistema via menu suspenso ou clicando nos marcadores do mapa.</span>
        </div>
      </div>
    </>
  );
}
