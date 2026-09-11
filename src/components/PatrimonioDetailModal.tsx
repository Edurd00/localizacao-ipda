'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Package, FileText, Edit3, Check, AlertCircle } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Toaster, toast } from 'sonner';
import PatrimonioPDF from '@/components/PatrimonioPDF';

export interface PatrimonioSubmissao {
  id: string;
  codigo_totvs: string;
  desc_igreja?: string | null;
  municipio?: string | null;
  nome_responsavel?: string | null;
  telefone_responsavel?: string | null;
  ano_referencia?: number | string | null;
  data_envio?: string | null;
  criado_em?: string | null;
  created_at?: string | null;
}

export interface PatrimonioItem {
  id: string;
  submissao_id?: string;
  item_nome?: string;
  item?: string;
  nome_item?: string;
  descricao?: string;
  quantidade?: number | string;
  qtd?: number | string;
  possui?: string;
  conservacao?: string;
  estado_conservacao?: string;
  estado?: string;
}

interface PatrimonioDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissao: PatrimonioSubmissao | null;
}

export default function PatrimonioDetailModal({
  isOpen,
  onClose,
  submissao,
}: PatrimonioDetailModalProps) {
  const [items, setItems] = useState<PatrimonioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Estado para correção manual de TOTVS
  const [displayTotvs, setDisplayTotvs] = useState<string>('');
  const [editandoTotvs, setEditandoTotvs] = useState(false);
  const [novoTotvsInput, setNovoTotvsInput] = useState('');
  const [salvandoTotvs, setSalvandoTotvs] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen && submissao) {
      setLoading(true);
      setItems([]);
      setDisplayTotvs(submissao.codigo_totvs || '');
      setNovoTotvsInput(submissao.codigo_totvs || '');
      setEditandoTotvs(false);

      const fetchUrl = submissao.id
        ? `/api/patrimonio/detalhes/${encodeURIComponent(submissao.id)}`
        : `/api/patrimonio/${encodeURIComponent(submissao.codigo_totvs)}`;

      fetch(fetchUrl)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setItems(json.data);
          } else if (json.data && Array.isArray(json.data.patrimonio_itens)) {
            setItems(json.data.patrimonio_itens);
          } else {
            return fetch(`/api/patrimonio/${encodeURIComponent(submissao.codigo_totvs)}`)
              .then((res) => res.json())
              .then((jsonFallback) => {
                if (jsonFallback.data && Array.isArray(jsonFallback.data.patrimonio_itens)) {
                  setItems(jsonFallback.data.patrimonio_itens);
                }
              });
          }
        })
        .catch((err) => {
          console.error('Erro ao buscar detalhes do patrimônio:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, submissao]);

  if (!isOpen || !submissao) return null;

  const validItems = items.filter((item) => {
    const val = String(item.possui || '').trim().toLowerCase();
    return val === 'sim' || val === 's' || val === 'true';
  });

  const formatDate = (rawDate?: string | null) => {
    if (!rawDate) return '---';
    try {
      const d = new Date(rawDate);
      return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('pt-BR');
    } catch {
      return '---';
    }
  };

  const handleSalvarNovoTotvs = async () => {
    const clean = novoTotvsInput.trim().toUpperCase();
    if (!clean) {
      toast.warning('Digite o novo Código TOTVS.');
      return;
    }

    setSalvandoTotvs(true);
    try {
      const res = await fetch('/api/patrimonio/corrigir-totvs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissao_id: submissao.id,
          novo_codigo_totvs: clean,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao corrigir Código TOTVS.');
      }

      setDisplayTotvs(clean);
      submissao.codigo_totvs = clean;
      setEditandoTotvs(false);
      toast.success('Código TOTVS corrigido com sucesso!');
    } catch (err: any) {
      console.error('Erro ao corrigir TOTVS:', err);
      toast.error(err.message || 'Erro ao corrigir Código TOTVS.');
    } finally {
      setSalvandoTotvs(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <Toaster position="top-center" richColors />
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Package className="h-5 w-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">
              Relatório de Patrimônio - TOTVS {displayTotvs}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {isClient ? (
              <PDFDownloadLink
                document={<PatrimonioPDF submissao={{ ...submissao, codigo_totvs: displayTotvs }} itens={items} />}
                fileName={`relatorio-patrimonio-${displayTotvs}.pdf`}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {({ loading: pdfLoading }) =>
                  pdfLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Gerando documento...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      <span>📄 Exportar Relatório</span>
                    </>
                  )
                }
              </PDFDownloadLink>
            ) : (
              <button
                type="button"
                disabled
                className="px-3 py-1.5 bg-indigo-600/50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 opacity-60"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>📄 Exportar Relatório</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Submission summary with discrete "Corrigir Código TOTVS" button */}
          <div className="bg-zinc-50 dark:bg-slate-800/60 p-4 rounded-xl border border-zinc-200 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                  {submissao.desc_igreja || `Igreja TOTVS ${displayTotvs}`}
                </h4>
                {submissao.municipio && (
                  <p className="text-zinc-500 dark:text-slate-400 font-medium">📍 {submissao.municipio}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-900 dark:bg-slate-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-mono font-bold text-xs">
                  TOTVS: {displayTotvs}
                </span>

                <button
                  type="button"
                  onClick={() => setEditandoTotvs(!editandoTotvs)}
                  className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  title="Corrigir Código TOTVS manualmente"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Corrigir Código TOTVS</span>
                </button>
              </div>
            </div>

            {/* Painel de edição discreta do TOTVS */}
            {editandoTotvs && (
              <div className="mt-3 p-3 bg-indigo-50/90 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-xl space-y-2 animate-in fade-in duration-150">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
                  Digite o Código TOTVS correto para esta submissão:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoTotvsInput}
                    onChange={(e) => setNovoTotvsInput(e.target.value.toUpperCase())}
                    placeholder="Ex: 15280"
                    className="flex-1 h-9 px-3 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSalvarNovoTotvs}
                    disabled={salvandoTotvs || !novoTotvsInput.trim()}
                    className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {salvandoTotvs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoTotvs(false)}
                    className="h-9 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/60 dark:border-slate-700/60 text-zinc-700 dark:text-slate-300">
              <div>
                <span className="font-bold text-zinc-500 block text-[10px] uppercase">Responsável</span>
                <span className="font-semibold">{submissao.nome_responsavel || '---'}</span>
              </div>
              <div>
                <span className="font-bold text-zinc-500 block text-[10px] uppercase">Telefone</span>
                <span className="font-mono">{submissao.telefone_responsavel || '---'}</span>
              </div>
              <div>
                <span className="font-bold text-zinc-500 block text-[10px] uppercase">Data de Envio</span>
                <span className="font-mono">
                  {formatDate(submissao.data_envio || submissao.criado_em || submissao.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Items zebra-striped table */}
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-indigo-500" />
              Itens Declarados no Patrimônio
            </h5>

            {loading ? (
              <div className="flex items-center justify-center p-8 text-indigo-600 gap-2 font-medium bg-zinc-50 dark:bg-slate-800/40 rounded-xl border border-zinc-200 dark:border-slate-800">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Carregando itens de patrimônio...</span>
              </div>
            ) : validItems.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 dark:text-slate-400 bg-zinc-50 dark:bg-slate-800/40 rounded-xl border border-zinc-200 dark:border-slate-800 text-xs italic">
                Nenhum item marcado como existente neste relatório.
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto border border-zinc-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 font-bold border-b border-zinc-200 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Item</th>
                      <th className="px-3 py-2.5 text-center">Quantidade</th>
                      <th className="px-3 py-2.5">Conservação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-slate-800 text-zinc-800 dark:text-slate-200">
                    {validItems.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={
                          idx % 2 === 0
                            ? 'bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors'
                            : 'bg-zinc-50/80 dark:bg-slate-800/30 hover:bg-zinc-100/80 dark:hover:bg-slate-800/60 transition-colors'
                        }
                      >
                        <td className="px-3 py-2.5 font-medium">
                          {item.item_nome || item.item || item.nome_item || item.descricao || '---'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-indigo-900 dark:text-indigo-300 font-mono">
                          {item.quantidade ?? item.qtd ?? '---'}
                        </td>
                        <td className="px-3 py-2.5 text-zinc-600 dark:text-slate-400">
                          {item.conservacao || item.estado_conservacao || item.estado || '---'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-800/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-zinc-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
