import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST() {
  try {
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/api/organizacao');
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ revalidated: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/api/organizacao');
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ revalidated: false }, { status: 500 });
  }
}
