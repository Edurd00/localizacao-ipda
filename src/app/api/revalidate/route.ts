import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST() {
  try {
    (revalidateTag as any)('igrejas-tag');
    (revalidateTag as any)('organizacao-tag');
    return NextResponse.json({ success: true, message: 'Cache expurgado com sucesso' });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Erro ao expurgar cache' }, { status: 500 });
  }
}

export async function GET() {
  try {
    (revalidateTag as any)('igrejas-tag');
    (revalidateTag as any)('organizacao-tag');
    return NextResponse.json({ success: true, message: 'Cache expurgado com sucesso' });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Erro ao expurgar cache' }, { status: 500 });
  }
}
