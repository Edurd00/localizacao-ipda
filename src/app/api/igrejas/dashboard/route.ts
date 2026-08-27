import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
export const revalidate = 60; // Cache de 1 minuto

export async function GET() {
  if (!pool) return NextResponse.json({ error: 'DB não configurado' }, { status: 500 });
  try {
    const [globalRes, stateRes, valRes] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as qtd FROM igrejas WHERE status != 'DESATIVADO' GROUP BY status`),
      pool.query(`SELECT estado as uf, status, COUNT(*) as qtd FROM igrejas WHERE status != 'DESATIVADO' GROUP BY estado, status`),
      pool.query(`SELECT validado_por, COUNT(*) as qtd FROM igrejas WHERE status = 'VALIDADO' AND validado_por IS NOT NULL AND validado_por != '' GROUP BY validado_por ORDER BY qtd DESC LIMIT 10`)
    ]);

    let total = 0, validadas = 0, pendentes = 0, duvidas = 0, revisoes = 0;
    globalRes.rows.forEach(row => {
      const count = parseInt(row.qtd);
      total += count;
      if (row.status === 'VALIDADO') validadas += count;
      else if (row.status === 'PENDENTE') pendentes += count;
      else if (row.status === 'DUVIDA') duvidas += count;
      else if (row.status === 'PENDENTE_REVISAO' || row.status === 'REVISAO_ENDERECO') revisoes += count;
    });

    const stateMap = new Map();
    stateRes.rows.forEach(row => {
      const uf = row.uf || 'N/A';
      if (!stateMap.has(uf)) stateMap.set(uf, { uf, total: 0, validadas: 0, pendentes: 0, duvidas: 0, revisoes: 0 });
      const st = stateMap.get(uf);
      const count = parseInt(row.qtd);
      st.total += count;
      if (row.status === 'VALIDADO') st.validadas += count;
      else if (row.status === 'PENDENTE') st.pendentes += count;
      else if (row.status === 'DUVIDA') st.duvidas += count;
      else if (row.status === 'PENDENTE_REVISAO' || row.status === 'REVISAO_ENDERECO') st.revisoes += count;
    });

    const validatorMetrics = valRes.rows.map(row => ({
      nome: row.validado_por,
      count: parseInt(row.qtd)
    }));

    return NextResponse.json({
      total, validadas, pendentes, duvidas, revisoes,
      stateMetrics: Array.from(stateMap.values()),
      validatorMetrics
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro no dashboard' }, { status: 500 });
  }
}
