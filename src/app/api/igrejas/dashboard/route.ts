export const revalidate = 300;

import { NextResponse } from 'next/server';
import { getIgrejas, getDistinctStates } from '@/lib/db';

export async function GET() {
  try {
    const [igrejasResult, statesList] = await Promise.all([
      getIgrejas(undefined, [
        'status',
        'estado',
        'validado_por',
        'usuario_validador',
        'validado_em',
        'data_validacao',
        'observacao_duvida',
        'observacao',
        'observacoes',
        'duvida',
        'updated_at',
      ]),
      getDistinctStates(),
    ]);
    const igrejas = igrejasResult.data;

    let total = 0;
    let validadas = 0;
    let duvidas = 0;
    let revisoes = 0;
    let pendentes = 0;

    const stateMap = new Map<
      string,
      { uf: string; total: number; validadas: number; duvidas: number; revisoes: number; pendentes: number }
    >();

    statesList.forEach((uf) => {
      if (uf) {
        stateMap.set(uf, { uf, total: 0, validadas: 0, duvidas: 0, revisoes: 0, pendentes: 0 });
      }
    });

    const validatorMap = new Map<string, { name: string; total: number; lastAction: string }>();

    igrejas.forEach((ig: any) => {
      if (ig.status === 'DESATIVADO') return;

      const uf = ig.estado || 'Outros';
      if (!stateMap.has(uf)) {
        stateMap.set(uf, { uf, total: 0, validadas: 0, duvidas: 0, revisoes: 0, pendentes: 0 });
      }
      const st = stateMap.get(uf)!;

      const dataValidacao = ig.data_validacao || ig.validado_em;
      const isValidada = Boolean(dataValidacao) || ig.status === 'VALIDADO';

      const obsDuvidaText =
        (ig.observacao_duvida && String(ig.observacao_duvida).trim()) ||
        (ig.observacao && String(ig.observacao).trim()) ||
        (ig.observacoes && String(ig.observacoes).trim()) ||
        (ig.duvida && String(ig.duvida).trim());

      const hasDuvidaTextOrStatus = Boolean(obsDuvidaText) || ig.status === 'DUVIDA';
      const isRevisao = ig.status === 'PENDENTE_REVISAO' || ig.status === 'REVISAO_ENDERECO';

      total++;
      st.total++;

      if (isValidada) {
        validadas++;
        st.validadas++;

        const validator = ig.validado_por || ig.usuario_validador;
        if (validator) {
          const valName = String(validator).trim();
          if (valName) {
            if (!validatorMap.has(valName)) {
              validatorMap.set(valName, { name: valName, total: 0, lastAction: '' });
            }
            const vItem = validatorMap.get(valName)!;
            vItem.total += 1;

            const dateStr = ig.validado_em || ig.updated_at;
            if (dateStr) {
              if (!vItem.lastAction || new Date(dateStr) > new Date(vItem.lastAction)) {
                vItem.lastAction = String(dateStr);
              }
            }
          }
        }
      } else if (hasDuvidaTextOrStatus) {
        duvidas++;
        st.duvidas++;
      } else if (isRevisao) {
        revisoes++;
        st.revisoes++;
      } else {
        pendentes++;
        st.pendentes++;
      }
    });

    const porEstado = Array.from(stateMap.values()).sort((a, b) => b.total - a.total);
    const porValidador = Array.from(validatorMap.values()).sort((a, b) => b.total - a.total);

    return NextResponse.json(
      {
        success: true,
        summary: {
          total,
          validadas,
          duvidas,
          revisoes,
          pendentes,
          validadasPct: total > 0 ? ((validadas / total) * 100).toFixed(1) : '0.0',
          duvidasPct: total > 0 ? ((duvidas / total) * 100).toFixed(1) : '0.0',
          revisoesPct: total > 0 ? ((revisoes / total) * 100).toFixed(1) : '0.0',
          pendentesPct: total > 0 ? ((pendentes / total) * 100).toFixed(1) : '0.0',
        },
        por_estado: porEstado,
        por_validador: porValidador,
        updated_at: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err: unknown) {
    console.error('API Error in GET /api/igrejas/dashboard:', err);
    const errMsg = err instanceof Error ? err.message : 'Error calculating dashboard metrics';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
