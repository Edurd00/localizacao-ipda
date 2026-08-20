import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { verifySessionToken } from '@/lib/auth';
import { processContactsCsvContent } from '../../../../../scripts/import-contacts';

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token');
  return verifySessionToken(token?.value);
}

export async function GET() {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado. Faça login novamente.' },
        { status: 401 }
      );
    }

    const csvPath = path.join(process.cwd(), 'relatorio_igrejas_2026-08-14.csv');
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { success: false, error: 'Arquivo relatorio_igrejas_2026-08-14.csv não encontrado no servidor.' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const result = await processContactsCsvContent(fileContent);

    revalidatePath('/api/igrejas/validadas');
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error('Error in GET /api/admin/import-contacts:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro interno ao processar contatos.';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado. Faça login novamente.' },
        { status: 401 }
      );
    }

    let csvContent = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Nenhum arquivo enviado no formulário.' },
          { status: 400 }
        );
      }
      csvContent = await file.text();
    } else {
      csvContent = await req.text();
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Conteúdo da planilha CSV está vazio.' },
        { status: 400 }
      );
    }

    const result = await processContactsCsvContent(csvContent);
    revalidatePath('/api/igrejas/validadas');
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error('Error in POST /api/admin/import-contacts:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro interno ao importar planilha de contatos.';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
