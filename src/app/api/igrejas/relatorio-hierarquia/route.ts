import { NextResponse } from 'next/server';
import { getIgrejas, type Igreja } from '@/lib/db';

export const dynamic = 'force-dynamic';

const REGIAO_GEOGRAFICA_MAPPING: Record<string, string[]> = {
  'Sudeste': ['SP', 'MG', 'ES', 'RJ'],
  'Sudeste - SP': ['SP'],
  'Sudeste - MG': ['MG'],
  'Sudeste - ES e RJ': ['ES', 'RJ'],
  'Sul': ['PR', 'RS', 'SC'],
  'Norte': ['AC', 'AM', 'RO', 'PA', 'AP', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'RN', 'PE', 'PI', 'MA', 'PB', 'SE'],
  'Centro-Oeste': ['MT', 'DF', 'GO', 'MS'],
};

function getPorte(desc: string, porteField?: string | null): string {
  if (porteField && porteField.trim() !== '') {
    return porteField;
  }
  const normalized = (desc || '').toUpperCase();
  if (normalized.includes('ESTADUAL')) return 'ESTADUAL';
  if (normalized.includes('SETORIAL')) return 'SETORIAL';
  if (normalized.includes('CENTRAL')) return 'CENTRAL';
  if (normalized.includes('REGIONAL')) return 'REGIONAL';
  if (
    normalized.includes('CASA DE ORAÇÃO') ||
    normalized.includes('CASA DE ORACOA') ||
    normalized.includes('ORAÇÃO') ||
    normalized.includes('ORACAO')
  ) {
    return 'CASA DE ORAÇÃO';
  }
  if (
    normalized.includes('ALDEIA') ||
    normalized.includes('INDIGENA') ||
    normalized.includes('INDÍGENA')
  ) {
    return 'ALDEIA INDIGENA';
  }
  return 'LOCAL';
}

function getDescendants(estadualTotvs: string, allChurches: Igreja[]): Igreja[] {
  const descendants: Igreja[] = [];
  const queue: string[] = [estadualTotvs];
  const visited = new Set<string>([estadualTotvs]);

  while (queue.length > 0) {
    const parentTotvs = queue.shift()!;
    const directChildren = allChurches.filter(
      (ig) => ig.codigo_totvs_pai === parentTotvs && ig.status !== 'DESATIVADO' && !visited.has(ig.codigo_totvs)
    );
    for (const child of directChildren) {
      visited.add(child.codigo_totvs);
      descendants.push(child);
      queue.push(child.codigo_totvs);
    }
  }
  return descendants;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterRegiao = searchParams.get('regiao') || 'ALL';
    const filterEstado = searchParams.get('estado') || 'ALL';
    const filterEstadual = searchParams.get('estadual') || 'ALL';
    const filterCondicao = searchParams.get('condicao_pastoral') || 'ALL';

    const allChurches = await getIgrejas({ status: 'ALL', estado: 'ALL' });
    const activeChurches = allChurches.filter((ig) => ig.status !== 'DESATIVADO');

    // 1. Identify UFs allowed by region
    let allowedUFs: string[] | null = null;
    if (filterRegiao !== 'ALL') {
      allowedUFs = REGIAO_GEOGRAFICA_MAPPING[filterRegiao] || null;
      if (!allowedUFs) {
        // Fallback for partial region names like 'Norte'
        const matchedKey = Object.keys(REGIAO_GEOGRAFICA_MAPPING).find(
          (k) => k.toLowerCase() === filterRegiao.toLowerCase()
        );
        if (matchedKey) {
          allowedUFs = REGIAO_GEOGRAFICA_MAPPING[matchedKey];
        }
      }
    }

    // 2. Identify all Estaduais matching region & estado filters
    let estaduais = activeChurches.filter((ig) => {
      const porte = getPorte(ig.desc_igreja, ig.porte);
      if (porte !== 'ESTADUAL') return false;

      if (allowedUFs && !allowedUFs.includes(ig.estado)) {
        return false;
      }

      if (filterEstado !== 'ALL' && ig.estado !== filterEstado) {
        return false;
      }

      return true;
    });

    const estaduaisOptions = estaduais.map((e) => ({
      codigo_totvs: e.codigo_totvs,
      desc_igreja: e.desc_igreja,
      estado: e.estado,
      municipio: e.municipio,
    })).sort((a, b) => a.desc_igreja.localeCompare(b.desc_igreja));

    // If a specific Estadual TOTVS filter is passed
    if (filterEstadual !== 'ALL' && filterEstadual.trim() !== '') {
      estaduais = estaduais.filter((e) => e.codigo_totvs === filterEstadual.trim());
      if (estaduais.length === 0) {
        // Fallback if estadual wasn't in filtered list
        const found = activeChurches.find((ig) => ig.codigo_totvs === filterEstadual.trim());
        if (found) {
          estaduais = [found];
        }
      }
    }

    // 3. For the selected Estaduais, gather all churches in their hierarchy
    const selectedChurchSet = new Map<string, Igreja>();

    if (estaduais.length > 0) {
      estaduais.forEach((e) => {
        selectedChurchSet.set(e.codigo_totvs, e);
        const descendants = getDescendants(e.codigo_totvs, activeChurches);
        descendants.forEach((d) => selectedChurchSet.set(d.codigo_totvs, d));
      });
    } else {
      // If no Estaduais found, fall back to active churches matching region/UF filters
      activeChurches.forEach((ig) => {
        if (allowedUFs && !allowedUFs.includes(ig.estado)) return;
        if (filterEstado !== 'ALL' && ig.estado !== filterEstado) return;
        selectedChurchSet.set(ig.codigo_totvs, ig);
      });
    }

    let churchList = Array.from(selectedChurchSet.values());

    // 4. Apply pastoral condition filter if requested
    if (filterCondicao === 'PREBENDADA') {
      churchList = churchList.filter((ig) => ig.tipo_prebenda === 'PREBENDADA');
    } else if (filterCondicao === 'NAO_PREBENDADA' || filterCondicao === 'VOLUNTARIA') {
      churchList = churchList.filter((ig) => ig.tipo_prebenda !== 'PREBENDADA');
    }

    // 5. Aggregate KPIs
    const totalIgrejas = churchList.length;
    let totalMembros = 0;
    let totalJovens = 0;
    let totalPrebendados = 0;
    let totalVoluntarios = 0;

    const porteBreakdownMap: Record<string, number> = {
      SETORIAL: 0,
      CENTRAL: 0,
      REGIONAL: 0,
      LOCAL: 0,
      'CASA DE ORAÇÃO': 0,
      'ALDEIA INDIGENA': 0,
      ESTADUAL: 0,
    };

    const ufMap: Record<string, { estado: string; membros: number; jovens: number; igrejas: number }> = {};

    churchList.forEach((ig) => {
      const membros = Number(ig.qtd_membros || 0);
      const jovens = Number(ig.qtd_jovens || 0);
      totalMembros += membros;
      totalJovens += jovens;

      if (ig.tipo_prebenda === 'PREBENDADA') {
        totalPrebendados++;
      } else {
        totalVoluntarios++;
      }

      const porte = getPorte(ig.desc_igreja, ig.porte);
      if (porteBreakdownMap[porte] !== undefined) {
        porteBreakdownMap[porte]++;
      } else {
        porteBreakdownMap['LOCAL']++;
      }

      const uf = (ig.estado || 'Outros').toUpperCase().trim();
      if (!ufMap[uf]) {
        ufMap[uf] = { estado: uf, membros: 0, jovens: 0, igrejas: 0 };
      }
      ufMap[uf].membros += membros;
      ufMap[uf].jovens += jovens;
      ufMap[uf].igrejas += 1;
    });

    const pctJovens = totalMembros > 0 ? parseFloat(((totalJovens / totalMembros) * 100).toFixed(1)) : 0;

    // Format UF breakdown for BarChart (sorted by UF or membros)
    const ufBreakdown = Object.values(ufMap).sort((a, b) => b.membros - a.membros);

    // Format Porte breakdown for PieChart
    const porteBreakdown = [
      { name: 'Setoriais', porte: 'SETORIAL', value: porteBreakdownMap['SETORIAL'], color: '#EAB308' },
      { name: 'Centrais', porte: 'CENTRAL', value: porteBreakdownMap['CENTRAL'], color: '#F97316' },
      { name: 'Regionais', porte: 'REGIONAL', value: porteBreakdownMap['REGIONAL'], color: '#22C55E' },
      { name: 'Locais', porte: 'LOCAL', value: porteBreakdownMap['LOCAL'], color: '#6B7280' },
      { name: 'Casas de Oração', porte: 'CASA DE ORAÇÃO', value: porteBreakdownMap['CASA DE ORAÇÃO'], color: '#EC4899' },
      { name: 'Aldeias Indígenas', porte: 'ALDEIA INDIGENA', value: porteBreakdownMap['ALDEIA INDIGENA'], color: '#06B6D4' },
      { name: 'Estaduais', porte: 'ESTADUAL', value: porteBreakdownMap['ESTADUAL'], color: '#3B82F6' },
    ].filter((item) => item.value > 0);

    // 6. Detailed Synthetic Table per Estadual
    const estaduaisSummary = estaduais.map((est) => {
      const descendants = getDescendants(est.codigo_totvs, activeChurches);

      let fieldChurches = [est, ...descendants];

      if (filterCondicao === 'PREBENDADA') {
        fieldChurches = fieldChurches.filter((ig) => ig.tipo_prebenda === 'PREBENDADA');
      } else if (filterCondicao === 'NAO_PREBENDADA' || filterCondicao === 'VOLUNTARIA') {
        fieldChurches = fieldChurches.filter((ig) => ig.tipo_prebenda !== 'PREBENDADA');
      }

      const campoMembros = fieldChurches.reduce((acc, ig) => acc + Number(ig.qtd_membros || 0), 0);
      const campoJovens = fieldChurches.reduce((acc, ig) => acc + Number(ig.qtd_jovens || 0), 0);
      const campoPrebendados = fieldChurches.filter((ig) => ig.tipo_prebenda === 'PREBENDADA').length;
      const campoVoluntarios = fieldChurches.filter((ig) => ig.tipo_prebenda !== 'PREBENDADA').length;

      return {
        codigo_totvs: est.codigo_totvs,
        desc_igreja: est.desc_igreja,
        estado: est.estado,
        municipio: est.municipio,
        qtd_congregacoes: descendants.length,
        total_membros: campoMembros,
        total_jovens: campoJovens,
        prebendados: campoPrebendados,
        voluntarios: campoVoluntarios,
      };
    }).sort((a, b) => b.total_membros - a.total_membros);

    return NextResponse.json({
      success: true,
      kpis: {
        total_igrejas: totalIgrejas,
        total_membros: totalMembros,
        total_jovens: totalJovens,
        pct_jovens: pctJovens,
        total_prebendados: totalPrebendados,
        total_voluntarios: totalVoluntarios,
      },
      porte_breakdown: porteBreakdown,
      uf_breakdown: ufBreakdown,
      estaduais_summary: estaduaisSummary,
      estaduais_options: estaduaisOptions,
    });
  } catch (error: unknown) {
    console.error('Error in /api/igrejas/relatorio-hierarquia:', error);
    const errMsg = error instanceof Error ? error.message : 'Erro interno no servidor';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
