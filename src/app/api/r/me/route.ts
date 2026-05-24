import { NextResponse } from 'next/server';
import { getRestockerContext } from '@/lib/auth/restocker';

export async function GET() {
  const ctx = await getRestockerContext();
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } },
      { status: 401 }
    );
  }
  return NextResponse.json({ success: true, data: ctx });
}
