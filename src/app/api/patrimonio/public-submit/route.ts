import { NextRequest, NextResponse } from 'next/server';
import { salvarSubmissaoPatrimonio, SalvarPatrimonioInput } from '@/lib/patrimonio';
import { validarTelefoneComDdd } from '@/lib/patrimonioValidation';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corpo da requisição inválido (JSON esperado).' },
        { status: 400 }
      );
    }

    const {
      codigo_totvs,
      nome_responsavel,
      telefone_responsavel,
      cargo_responsavel,
      ano_referencia,
      observacoes,
      itens,
    } = body || {};

    // 1. Validação de TOTVS
    const cleanTotvs = String(codigo_totvs || '').trim();
    if (!cleanTotvs) {
      return NextResponse.json(
        { success: false, error: 'O código TOTVS da igreja é obrigatório.' },
        { status: 400 }
      );
    }

    // 2. Validação do responsável
    const cleanNome = String(nome_responsavel || '').trim();
    if (!cleanNome || cleanNome.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Informe o nome completo do responsável pelo preenchimento.' },
        { status: 400 }
      );
    }

    // 3. Validação do telefone com DDD (10 a 11 dígitos)
    const validacaoTel = validarTelefoneComDdd(String(telefone_responsavel || ''));
    if (!validacaoTel.valido) {
      return NextResponse.json(
        { success: false, error: validacaoTel.erro || 'Telefone inválido.' },
        { status: 400 }
      );
    }
    const cleanTelefone = validacaoTel.digitos!;

    // 3. Validação dos itens
    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { success: false, error: 'É necessário declarar ao menos um item de patrimônio.' },
        { status: 400 }
      );
    }

    const payload: SalvarPatrimonioInput = {
      codigo_totvs: cleanTotvs,
      nome_responsavel: cleanNome,
      telefone_responsavel: cleanTelefone,
      cargo_responsavel: cargo_responsavel ? String(cargo_responsavel).trim() : null,
      ano_referencia: Number(ano_referencia) || new Date().getFullYear(),
      observacoes: observacoes ? String(observacoes).trim() : null,
      itens: itens.map((it: any) => ({
        item_nome: String(it.item_nome || it.item || it.nome_item || it.descricao || '').trim(),
        quantidade: Math.max(0, Number(it.quantidade ?? it.qtd ?? 1)),
        possui: String(it.possui || 'Sim').trim(),
        conservacao: String(it.conservacao || it.estado_conservacao || it.estado || 'BOM').trim().toUpperCase(),
        observacao: it.observacao ? String(it.observacao).trim() : null,
      })),
    };

    const resultado = await salvarSubmissaoPatrimonio(payload);

    try {
      revalidatePath('/gestao-patrimonio');
      revalidatePath(`/patrimonio/${cleanTotvs}`);
      revalidatePath(`/api/patrimonio/${cleanTotvs}`);
      revalidatePath('/api/patrimonio/lista');
    } catch (revalErr) {
      console.warn('Revalidation warning:', revalErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Declaração de patrimônio enviada com sucesso!',
        data: {
          submissao_id: resultado.submissao_id,
          codigo_totvs: resultado.codigo_totvs,
          ano_referencia: resultado.ano_referencia,
          itens_salvos: resultado.itens_salvos,
          data_envio: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Error in POST /api/patrimonio/public-submit:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Ocorreu um erro interno ao processar a submissão de patrimônio.',
      },
      { status: 500 }
    );
  }
}
