import { NextResponse } from 'next/server';
import { criarIgrejaSingle, getIgrejas } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      codigo_totvs,
      desc_igreja,
      tipo_imovel,
      endereco,
      bairro,
      municipio,
      estado,
      cep,
      link_google_maps,
      status,
      porte,
      codigo_totvs_pai,
      dirigente_nome,
      dirigente_telefone,
      dirigente_email,
      dirigente_data_posse,
      financeira_nome,
      financeira_telefone,
      financeira_email,
      qtd_membros,
      qtd_jovens,
      tipo_prebenda
    } = body;

    if (!codigo_totvs || !desc_igreja) {
      return NextResponse.json(
        { success: false, error: 'Campos Código TOTVS e Descrição são obrigatórios.' },
        { status: 400 }
      );
    }

    // Try to extract coordinates from Google Maps Link if present
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (link_google_maps) {
      let match = link_google_maps.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (!match) match = link_google_maps.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (!match) match = link_google_maps.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        latitude = parseFloat(match[1]);
        longitude = parseFloat(match[2]);
      }
    }

    await criarIgrejaSingle({
      codigo_totvs,
      desc_igreja,
      tipo_imovel: tipo_imovel || 'ALUGADO',
      endereco: endereco || '',
      bairro: bairro || '',
      municipio: municipio || '',
      estado: estado || '',
      cep: cep || '',
      link_google_maps: link_google_maps || '',
      latitude,
      longitude,
      status: status || 'PENDENTE',
      codigo_totvs_pai: codigo_totvs_pai || null,
      porte: porte || 'LOCAL',
      dirigente_nome: dirigente_nome || '',
      dirigente_telefone: dirigente_telefone || '',
      dirigente_email: dirigente_email || '',
      dirigente_data_posse: dirigente_data_posse || null,
      financeira_nome: financeira_nome || '',
      financeira_telefone: financeira_telefone || '',
      financeira_email: financeira_email || '',
      qtd_membros: qtd_membros !== undefined && qtd_membros !== '' ? Number(qtd_membros) : null,
      qtd_jovens: qtd_jovens !== undefined && qtd_jovens !== '' ? Number(qtd_jovens) : null,
      tipo_prebenda: tipo_prebenda || 'NAO_PREBENDADA'
    });

    // On-demand revalidation to ensure changes appear instantly on Map and Tree
    try {
      revalidatePath('/api/igrejas/validadas');
      revalidatePath('/api/organizacao');
      revalidatePath('/api/igrejas/dashboard');
      revalidatePath('/gestao');
      revalidatePath('/');
      revalidatePath('/organizacao');
    } catch (revalErr) {
      console.warn('Revalidation failed (non-fatal):', revalErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Igreja cadastrada com sucesso!',
      latitude,
      longitude
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/igrejas/criar:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao cadastrar igreja.';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
