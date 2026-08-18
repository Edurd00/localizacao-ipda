export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getIgrejas, getDistinctStates } from '@/lib/db';

export async function GET() {
  try {
    // Force revalidation for the dashboard API route
    revalidatePath('/api/igrejas/dashboard');

    const [igrejas, statesList] = await Promise.all([
      getIgrejas(),
      getDistinctStates(),
    ]);

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

    igrejas.forEach((ig: any) => {
      // Ignore inactive churches in operational mapping calculations
      if (ig.status === 'DESATIVADO') return;

      const uf = ig.estado || 'Outros';
      if (!stateMap.has(uf)) {
        stateMap.set(uf, { uf, total: 0, validadas: 0, duvidas: 0, revisoes: 0, pendentes: 0 });
      }
      const st = stateMap.get(uf)!;

      // Rule 1: VALIDADAS (data_validacao or validado_em is NOT NULL or status === 'VALIDADO')
      const dataValidacao = ig.data_validacao || ig.validado_em;
      const isValidada = Boolean(dataValidacao) || ig.status === 'VALIDADO';

      // Rule 2: DÚVIDAS (text in observation/doubt column or status === 'DUVIDA')
      const obsDuvidaText =
        (ig.observacao_duvida && String(ig.observacao_duvida).trim()) ||
        (ig.observacao && String(ig.observacao).trim()) ||
        (ig.observacoes && String(ig.observacoes).trim()) ||
        (ig.duvida && String(ig.duvida).trim());

      const hasDuvidaTextOrStatus = Boolean(obsDuvidaText) || ig.status === 'DUVIDA';

      // Rule 3: REVISÕES (status === 'PENDENTE_REVISAO' or 'REVISAO_ENDERECO')
      const isRevisao = ig.status === 'PENDENTE_REVISAO' || ig.status === 'REVISAO_ENDERECO';

      total++;
      st.total++;

      if (isValidada) {
        validadas++;
        st.validadas++;
      } else if (hasDuvidaTextOrStatus) {
        duvidas++;
        st.duvidas++;
      } else if (isRevisao) {
        revisoes++;
        st.revisoes++;
      } else {
        // Rule 4: PENDENTES (Churches without data_validacao and without doubt text)
        pendentes++;
        st.pendentes++;
      }
    });

    const porEstado = Array.from(stateMap.values()).sort((a, b) => b.total - a.total);

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
        updated_at: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    console.error('API Error in GET /api/igrejas/dashboard:', err);
    const errMsg = err instanceof Error ? err.message : 'Error calculating dashboard metrics';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
