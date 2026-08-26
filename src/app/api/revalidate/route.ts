import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST() {
  try {
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/api/organizacao');
    return NextResponse.json({ success: true, message: 'Cache expurgado com sucesso' });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Erro ao expurgar cache' }, { status: 500 });
  }
}

export async function GET() {
  try {
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/api/organizacao');
    return NextResponse.json({ success: true, message: 'Cache expurgado com sucesso' });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Erro ao expurgar cache' }, { status: 500 });
  }
}
