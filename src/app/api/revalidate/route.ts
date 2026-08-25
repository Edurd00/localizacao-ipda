import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST() {
  try {
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/');
    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
