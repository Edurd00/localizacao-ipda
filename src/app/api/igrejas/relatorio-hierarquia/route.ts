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

const PORTE_PRIORITY: Record<string, number> = {
  'ESTADUAL': 1,
  'SETORIAL': 2,
  'CENTRAL': 3,
  'REGIONAL': 4,
  'LOCAL': 5,
  'CASA DE ORAÇÃO': 6,
  'ALDEIA INDIGENA': 7,
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
  const pTotvs = String(estadualTotvs || '');
  const queue: string[] = [pTotvs];
  const visited = new Set<string>([pTotvs]);

  while (queue.length > 0) {
    const parentTotvs = queue.shift()!;
    const directChildren = allChurches.filter(
      (ig) => String(ig.codigo_totvs_pai || '') === parentTotvs && ig.status !== 'DESATIVADO' && !visited.has(String(ig.codigo_totvs || ''))
    );
    for (const child of directChildren) {
      visited.add(String(child.codigo_totvs || ''));
      descendants.push(child);
      queue.push(String(child.codigo_totvs || ''));
    }
  }
  return descendants;
}

export interface HierarchyNode {
  codigo_totvs: string;
  desc_igreja: string;
  porte: string;
  estado: string;
  municipio: string;
  tipo_prebenda?: string | null;
  dirigente_nome?: string | null;
  qtd_membros: number;
  qtd_jovens: number;
  campo_membros: number;
  campo_jovens: number;
  campo_congregacoes: number;
  children: HierarchyNode[];
}

function buildHierarchyTree(
  parentCode: string,
  allChurchesMap: Map<string, Igreja>,
  childrenMap: Map<string, string[]>,
  visited = new Set<string>()
): HierarchyNode[] {
  const childCodes = childrenMap.get(parentCode) || [];
  const nodes: HierarchyNode[] = [];

  for (const code of childCodes) {
    if (visited.has(code)) continue;
    visited.add(code);

    const ig = allChurchesMap.get(code);
    if (!ig || ig.status === 'DESATIVADO') continue;

    const childrenNodes = buildHierarchyTree(code, allChurchesMap, childrenMap, visited);

    const selfMembros = Number(ig.qtd_membros || 0);
    const selfJovens = Number(ig.qtd_jovens || 0);

    const subMembros = childrenNodes.reduce((acc, c) => acc + c.campo_membros, 0);
    const subJovens = childrenNodes.reduce((acc, c) => acc + c.campo_jovens, 0);
    const subCongregacoes = childrenNodes.reduce((acc, c) => acc + 1 + c.campo_congregacoes, 0);

    nodes.push({
      codigo_totvs: ig.codigo_totvs,
      desc_igreja: ig.desc_igreja,
      porte: getPorte(ig.desc_igreja, ig.porte),
      estado: ig.estado,
      municipio: ig.municipio,
      tipo_prebenda: ig.tipo_prebenda,
      dirigente_nome: ig.dirigente_nome,
      qtd_membros: selfMembros,
      qtd_jovens: selfJovens,
      campo_membros: selfMembros + subMembros,
      campo_jovens: selfJovens + subJovens,
      campo_congregacoes: childrenNodes.length > 0 ? subCongregacoes : 0,
      children: childrenNodes,
    });
  }

  return nodes.sort((a, b) => {
    const pA = PORTE_PRIORITY[a.porte] || 99;
    const pB = PORTE_PRIORITY[b.porte] || 99;
    if (pA !== pB) return pA - pB;
    return a.desc_igreja.localeCompare(b.desc_igreja);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterRegiao = searchParams.get('regiao') || 'ALL';
    const filterEstado = searchParams.get('estado') || 'ALL';
    const filterEstadual = searchParams.get('estadual') || 'ALL';
    const filterCondicao = searchParams.get('condicao_pastoral') || 'ALL';

    const allChurchesRes = await getIgrejas({ status: 'ALL', estado: 'ALL' });
    const allChurches = allChurchesRes.data;
    const activeChurches = allChurches.filter((ig) => ig.status !== 'DESATIVADO');

    // Populate lookup maps
    const allChurchesMap = new Map<string, Igreja>();
    const childrenMap = new Map<string, string[]>();

    activeChurches.forEach((ig) => {
      allChurchesMap.set(ig.codigo_totvs, ig);
      if (ig.codigo_totvs_pai) {
        const list = childrenMap.get(ig.codigo_totvs_pai) || [];
        list.push(ig.codigo_totvs);
        childrenMap.set(ig.codigo_totvs_pai, list);
      }
    });

    // 1. Identify UFs allowed by region
    let allowedUFs: string[] | null = null;
    if (filterRegiao !== 'ALL') {
      allowedUFs = REGIAO_GEOGRAFICA_MAPPING[filterRegiao] || null;
      if (!allowedUFs) {
        const matchedKey = Object.keys(REGIAO_GEOGRAFICA_MAPPING).find(
          (k) => String(k || '').toLowerCase() === String(filterRegiao || '').toLowerCase()
        );
        if (matchedKey) {
          allowedUFs = REGIAO_GEOGRAFICA_MAPPING[matchedKey];
        }
      }
    }

    // 2. Options for Estadual selector (all active Estaduais in active scope)
    const estaduaisOptions = activeChurches
      .filter((ig) => {
        const porte = getPorte(ig.desc_igreja, ig.porte);
        if (porte !== 'ESTADUAL') return false;
        if (allowedUFs && !allowedUFs.includes(ig.estado)) return false;
        if (filterEstado !== 'ALL' && ig.estado !== filterEstado) return false;
        return true;
      })
      .map((e) => ({
        codigo_totvs: e.codigo_totvs,
        desc_igreja: e.desc_igreja,
        estado: e.estado,
        municipio: e.municipio,
      }))
      .sort((a, b) => a.desc_igreja.localeCompare(b.desc_igreja));

    // 3. Identify target Estaduais for reporting
    let targetEstaduais: Igreja[] = [];

    if (filterEstadual !== 'ALL' && filterEstadual.trim() !== '') {
      // STRICT FILTER BY ESTADUAL: isolate this specific Estadual and all its subordinate tree
      const found = activeChurches.find((ig) => ig.codigo_totvs === filterEstadual.trim());
      if (found) {
        targetEstaduais = [found];
      }
    } else {
      // Find all Estaduais matching region and state filters
      targetEstaduais = activeChurches.filter((ig) => {
        const porte = getPorte(ig.desc_igreja, ig.porte);
        if (porte !== 'ESTADUAL') return false;
        if (allowedUFs && !allowedUFs.includes(ig.estado)) return false;
        if (filterEstado !== 'ALL' && ig.estado !== filterEstado) return false;
        return true;
      });
    }

    // 4. Gather church list from target Estaduais or overall scope
    const selectedChurchSet = new Map<string, Igreja>();

    if (targetEstaduais.length > 0) {
      targetEstaduais.forEach((e) => {
        selectedChurchSet.set(e.codigo_totvs, e);
        const descendants = getDescendants(e.codigo_totvs, activeChurches);
        descendants.forEach((d) => selectedChurchSet.set(d.codigo_totvs, d));
      });
    } else {
      // Fallback if no Estaduais match: gather all active churches matching region/state filters
      activeChurches.forEach((ig) => {
        if (allowedUFs && !allowedUFs.includes(ig.estado)) return;
        if (filterEstado !== 'ALL' && ig.estado !== filterEstado) return;
        selectedChurchSet.set(ig.codigo_totvs, ig);
      });
    }

    let churchList = Array.from(selectedChurchSet.values());

    // 5. Apply pastoral condition filter if requested
    if (filterCondicao === 'PREBENDADA') {
      churchList = churchList.filter((ig) => ig.tipo_prebenda === 'PREBENDADA');
    } else if (filterCondicao === 'NAO_PREBENDADA' || filterCondicao === 'VOLUNTARIA') {
      churchList = churchList.filter((ig) => ig.tipo_prebenda !== 'PREBENDADA');
    }

    // 6. Aggregate KPIs
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
    const pctPrebendados = totalIgrejas > 0 ? parseFloat(((totalPrebendados / totalIgrejas) * 100).toFixed(1)) : 0;
    const pctVoluntarios = totalIgrejas > 0 ? parseFloat(((totalVoluntarios / totalIgrejas) * 100).toFixed(1)) : 0;

    const ufBreakdown = Object.values(ufMap).sort((a, b) => b.membros - a.membros);

    const porteBreakdown = [
      { name: 'Setoriais', porte: 'SETORIAL', value: porteBreakdownMap['SETORIAL'], color: '#EAB308' },
      { name: 'Centrais', porte: 'CENTRAL', value: porteBreakdownMap['CENTRAL'], color: '#F97316' },
      { name: 'Regionais', porte: 'REGIONAL', value: porteBreakdownMap['REGIONAL'], color: '#22C55E' },
      { name: 'Locais', porte: 'LOCAL', value: porteBreakdownMap['LOCAL'], color: '#6B7280' },
      { name: 'Casas de Oração', porte: 'CASA DE ORAÇÃO', value: porteBreakdownMap['CASA DE ORAÇÃO'], color: '#EC4899' },
      { name: 'Aldeias Indígenas', porte: 'ALDEIA INDIGENA', value: porteBreakdownMap['ALDEIA INDIGENA'], color: '#06B6D4' },
      { name: 'Estaduais', porte: 'ESTADUAL', value: porteBreakdownMap['ESTADUAL'], color: '#3B82F6' },
    ].filter((item) => item.value > 0);

    // 7. Construct Drill-down Tree Nodes
    const treeRoots: HierarchyNode[] = targetEstaduais.map((est) => {
      const childrenNodes = buildHierarchyTree(est.codigo_totvs, allChurchesMap, childrenMap);

      const selfMembros = Number(est.qtd_membros || 0);
      const selfJovens = Number(est.qtd_jovens || 0);

      const subMembros = childrenNodes.reduce((acc, c) => acc + c.campo_membros, 0);
      const subJovens = childrenNodes.reduce((acc, c) => acc + c.campo_jovens, 0);
      const subCongregacoes = childrenNodes.reduce((acc, c) => acc + 1 + c.campo_congregacoes, 0);

      return {
        codigo_totvs: est.codigo_totvs,
        desc_igreja: est.desc_igreja,
        porte: getPorte(est.desc_igreja, est.porte),
        estado: est.estado,
        municipio: est.municipio,
        tipo_prebenda: est.tipo_prebenda,
        dirigente_nome: est.dirigente_nome,
        qtd_membros: selfMembros,
        qtd_jovens: selfJovens,
        campo_membros: selfMembros + subMembros,
        campo_jovens: selfJovens + subJovens,
        campo_congregacoes: childrenNodes.length > 0 ? subCongregacoes : 0,
        children: childrenNodes,
      };
    }).sort((a, b) => b.campo_membros - a.campo_membros);

    // 8. Detailed Synthetic Summary per Estadual
    const estaduaisSummary = targetEstaduais.map((est) => {
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
        pct_prebendados: pctPrebendados,
        pct_voluntarios: pctVoluntarios,
      },
      porte_breakdown: porteBreakdown,
      uf_breakdown: ufBreakdown,
      tree_nodes: treeRoots,
      estaduais_summary: estaduaisSummary,
      estaduais_options: estaduaisOptions,
    });
  } catch (error: unknown) {
    console.error('Error in /api/igrejas/relatorio-hierarquia:', error);
    const errMsg = error instanceof Error ? error.message : 'Erro interno no servidor';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
