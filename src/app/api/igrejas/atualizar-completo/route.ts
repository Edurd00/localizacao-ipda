import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saveIgrejaSingle, registrarHistorico, getIgrejas } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token');
  return verifySessionToken(token?.value);
}

export async function PUT(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado. Faça login novamente.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
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

    if (!id && !codigo_totvs) {
      return NextResponse.json(
        { success: false, error: 'ID ou codigo_totvs é obrigatório para atualização.' },
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
    if (dirigente_data_posse !== undefined) {
      if (dirigente_data_posse && typeof dirigente_data_posse === 'string' && dirigente_data_posse.trim() !== '') {
        const rawDate = dirigente_data_posse.trim();
        if (rawDate.includes('/')) {
          const parts = rawDate.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            updates.dirigente_data_posse = `${year}-${month}-${day}`;
          } else {
            updates.dirigente_data_posse = rawDate;
          }
        } else if (rawDate.includes('T')) {
          updates.dirigente_data_posse = rawDate.split('T')[0];
        } else {
          updates.dirigente_data_posse = rawDate;
        }
      } else {
        updates.dirigente_data_posse = null;
      }
    }
    if (financeira_nome !== undefined) updates.financeira_nome = financeira_nome;
    if (financeira_telefone !== undefined) updates.financeira_telefone = financeira_telefone;
    if (financeira_email !== undefined) updates.financeira_email = financeira_email;
    if (qtd_membros !== undefined) updates.qtd_membros = qtd_membros !== '' && qtd_membros !== null ? Number(qtd_membros) : null;
    if (qtd_jovens !== undefined) updates.qtd_jovens = qtd_jovens !== '' && qtd_jovens !== null ? Number(qtd_jovens) : null;
    if (tipo_prebenda !== undefined) updates.tipo_prebenda = tipo_prebenda !== null && tipo_prebenda !== '' ? tipo_prebenda : 'NAO_PREBENDADA';

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

    // Fetch existing record to perform Smart Diff before updating
    const currentChurchRes = await getIgrejas({
      ...(id ? { id } : {}),
      ...(codigo_totvs ? { search: codigo_totvs } : {}),
    });
    const currentChurch = currentChurchRes.data.find(
      (item) => (id && item.id === id) || (codigo_totvs && item.codigo_totvs === codigo_totvs)
    ) || currentChurchRes.data[0];

    const changedFields: Record<string, any> = {};
    if (currentChurch) {
      Object.keys(updates).forEach((key) => {
        const newVal = updates[key];
        const oldVal = (currentChurch as any)[key];

        // Strict value normalization check
        const normNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();
        const normOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();

        if (normNew !== normOld) {
          changedFields[key] = newVal;
        }
      });
    } else {
      Object.assign(changedFields, updates);
    }

    const savedChurch = await saveIgrejaSingle({ id, codigo_totvs }, updates);

    // Record audit history entry only if there are actual changed fields
    const targetTotvs = codigo_totvs || savedChurch.codigo_totvs || id;
    if (targetTotvs && Object.keys(changedFields).length > 0) {
      await registrarHistorico(
        targetTotvs,
        user.nome,
        user.email,
        'EDICAO_DADOS',
        changedFields
      );
    }

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
      data: savedChurch,
      message: `Igreja ${codigo_totvs || id} atualizada com sucesso!`,
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
