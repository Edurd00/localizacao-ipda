import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getIgrejas } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Try reading pre-built static JSON asset first to save database egress & queries
    const staticFilePath = path.join(process.cwd(), 'public', 'data', 'igrejas.json');
    if (fs.existsSync(staticFilePath)) {
      const fileData = fs.readFileSync(staticFilePath, 'utf8');
      const staticJson = JSON.parse(fileData);
      return NextResponse.json(staticJson, {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'CDN-Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // 2. Fallback to database query if static file is missing
    const igrejas = await getIgrejas({ status: 'VALIDADO' }, [
      'id',
      'codigo_totvs',
      'desc_igreja',
      'latitude',
      'longitude',
      'status',
      'porte',
      'codigo_totvs_pai',
      'estado',
      'municipio',
      'tipo_imovel',
      'endereco',
      'bairro',
      'cep',
      'link_google_maps',
      'usuario_validador',
      'validado_por',
      'validado_em',
      'updated_at',
      'dirigente_nome',
      'dirigente_telefone',
      'dirigente_email',
      'dirigente_data_posse',
      'financeira_nome',
      'financeira_telefone',
      'financeira_email',
      'qtd_membros',
      'qtd_jovens',
      'tipo_prebenda',
    ]);
    const data = {
      success: true,
      igrejas,
    };
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (err: unknown) {
    console.error('API Error in GET /api/igrejas/validadas:', err);
    const errMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
