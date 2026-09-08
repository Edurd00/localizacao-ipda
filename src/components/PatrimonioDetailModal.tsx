'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Package, FileText } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
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

  // Critical for Next.js SSR hydration prevention
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen && submissao) {
      setLoading(true);
      setItems([]);

      // First try fetching by submissao.id via /api/patrimonio/detalhes/[id]
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
            // Fallback to totvs endpoint
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

  // Filter: Hide any item where possui is 'Não', 'nao', or empty/null
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

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Package className="h-5 w-5" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">
              Relatório de Patrimônio - TOTVS {submissao.codigo_totvs}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {isClient ? (
              <PDFDownloadLink
                document={<PatrimonioPDF submissao={submissao} itens={items} />}
                fileName={`relatorio-patrimonio-${submissao.codigo_totvs}.pdf`}
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
          {/* Submission summary */}
          <div className="bg-zinc-50 dark:bg-slate-800/60 p-4 rounded-xl border border-zinc-200 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                  {submissao.desc_igreja || `Igreja TOTVS ${submissao.codigo_totvs}`}
                </h4>
                {submissao.municipio && (
                  <p className="text-zinc-500 dark:text-slate-400 font-medium">📍 {submissao.municipio}</p>
                )}
              </div>
              {submissao.ano_referencia && (
                <span className="bg-indigo-100 text-indigo-800 dark:bg-slate-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-mono font-bold text-[10px]">
                  Ref: {submissao.ano_referencia}
                </span>
              )}
            </div>

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
