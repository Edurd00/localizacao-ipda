import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST() {
  try {
    // Invalida o cache do endpoint e da pagina do mapa na Vercel CDN
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/');
    revalidatePath('/organizacao');

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    console.error('Erro ao revalidar cache:', err);
    return NextResponse.json({ message: 'Erro ao revalidar cache' }, { status: 500 });
  }
}
