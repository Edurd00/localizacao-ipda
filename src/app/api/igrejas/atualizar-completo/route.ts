import { NextResponse } from 'next/server';
import { saveIgrejaSingle } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
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
      qtd_jovens
    } = body;

    if (!codigo_totvs) {
      return NextResponse.json(
        { success: false, error: 'O campo "codigo_totvs" é obrigatório para atualização.' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};
    if (desc_igreja !== undefined) updates.desc_igreja = desc_igreja;
    if (tipo_imovel !== undefined) updates.tipo_imovel = tipo_imovel;
    if (endereco !== undefined) updates.endereco = endereco;
    if (bairro !== undefined) updates.bairro = bairro;
    if (municipio !== undefined) updates.municipio = municipio;
    if (estado !== undefined) updates.estado = estado;
    if (cep !== undefined) updates.cep = cep;
    if (status !== undefined) updates.status = status;
    if (porte !== undefined) updates.porte = porte;
    if (codigo_totvs_pai !== undefined) updates.codigo_totvs_pai = codigo_totvs_pai || null;

    if (dirigente_nome !== undefined) updates.dirigente_nome = dirigente_nome;
    if (dirigente_telefone !== undefined) updates.dirigente_telefone = dirigente_telefone;
    if (dirigente_email !== undefined) updates.dirigente_email = dirigente_email;
    if (dirigente_data_posse !== undefined) updates.dirigente_data_posse = dirigente_data_posse || null;
    if (financeira_nome !== undefined) updates.financeira_nome = financeira_nome;
    if (financeira_telefone !== undefined) updates.financeira_telefone = financeira_telefone;
    if (financeira_email !== undefined) updates.financeira_email = financeira_email;
    if (qtd_membros !== undefined) updates.qtd_membros = qtd_membros !== '' && qtd_membros !== null ? Number(qtd_membros) : null;
    if (qtd_jovens !== undefined) updates.qtd_jovens = qtd_jovens !== '' && qtd_jovens !== null ? Number(qtd_jovens) : null;

    // Recalculate coordinates from Google Maps Link if link changed
    if (link_google_maps !== undefined) {
      updates.link_google_maps = link_google_maps;
      if (link_google_maps) {
        let match = link_google_maps.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (!match) match = link_google_maps.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (!match) match = link_google_maps.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
          updates.latitude = parseFloat(match[1]);
          updates.longitude = parseFloat(match[2]);
        }
      }
    }

    await saveIgrejaSingle(codigo_totvs, updates);

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
      message: `Igreja ${codigo_totvs} atualizada com sucesso!`,
      latitude: updates.latitude,
      longitude: updates.longitude
    });
  } catch (err: unknown) {
    console.error('API Error in PUT /api/igrejas/atualizar-completo:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao atualizar igreja.';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
