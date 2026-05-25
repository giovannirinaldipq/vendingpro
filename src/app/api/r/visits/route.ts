/**
 * GET — Máquinas atribuídas ao reabastecedor logado + status da visita do dia
 * POST — Inicia visita (check-in): cria registro com geo + foto opcional
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRestockerContext, restockerSupabaseAdmin } from '@/lib/auth/restocker';

const checkinSchema = z.object({
  machine_id: z.string().uuid(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  photo_url: z.string().url().optional(),
});

function todayBoundsISO() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export async function GET() {
  const ctx = await getRestockerContext();
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } },
      { status: 401 }
    );
  }

  // Máquinas atribuídas
  const { data: machines } = await restockerSupabaseAdmin
    .from('machines')
    .select('id, code, name, location:locations(id, name, address_street, address_city, latitude, longitude)')
    .eq('tenant_id', ctx.tenantId)
    .eq('restocker_id', ctx.restockerId)
    .eq('status', 'active')
    .order('name');

  // Visitas iniciadas hoje
  const { startISO, endISO } = todayBoundsISO();
  const { data: todayVisits } = await restockerSupabaseAdmin
    .from('restocking_visits')
    .select('id, machine_id, checkin_at, checkout_at, checkin_photo_url, checkout_photo_url')
    .eq('tenant_id', ctx.tenantId)
    .eq('restocker_id', ctx.restockerId)
    .gte('checkin_at', startISO)
    .lt('checkin_at', endISO);

  type VisitRow = NonNullable<typeof todayVisits>[number];
  const visitByMachine = new Map<string, VisitRow>();
  for (const v of todayVisits ?? []) {
    visitByMachine.set(v.machine_id, v);
  }

  const enriched = (machines ?? []).map(m => {
    const visit = visitByMachine.get(m.id);
    let status: 'pending' | 'in_progress' | 'done' = 'pending';
    if (visit?.checkout_at) status = 'done';
    else if (visit) status = 'in_progress';
    return { ...m, today_visit: visit ?? null, status };
  });

  return NextResponse.json({
    success: true,
    data: {
      machines: enriched,
      summary: {
        total: enriched.length,
        pending: enriched.filter(m => m.status === 'pending').length,
        in_progress: enriched.filter(m => m.status === 'in_progress').length,
        done: enriched.filter(m => m.status === 'done').length,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getRestockerContext();
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const v = checkinSchema.safeParse(body);
  if (!v.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: v.error.issues[0].message } },
      { status: 400 }
    );
  }

  // Garante que a máquina pertence ao tenant E está atribuída a este reabastecedor
  const { data: machine } = await restockerSupabaseAdmin
    .from('machines')
    .select('id, location:locations(latitude, longitude)')
    .eq('id', v.data.machine_id)
    .eq('tenant_id', ctx.tenantId)
    .eq('restocker_id', ctx.restockerId)
    .maybeSingle();

  if (!machine) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_ASSIGNED', message: 'Esta máquina não está atribuída a você' } },
      { status: 403 }
    );
  }

  // Calcula distância (haversine) se temos coordenadas em ambos os lados
  let distance: number | null = null;
  let isLocationValid: boolean | null = null;
  const loc = Array.isArray(machine.location) ? machine.location[0] : machine.location;
  if (v.data.latitude && v.data.longitude && loc?.latitude && loc?.longitude) {
    distance = haversine(
      v.data.latitude, v.data.longitude,
      Number(loc.latitude), Number(loc.longitude)
    );
    isLocationValid = distance <= 100;
  }

  const { data: visit, error } = await restockerSupabaseAdmin
    .from('restocking_visits')
    .insert({
      tenant_id: ctx.tenantId,
      restocker_id: ctx.restockerId,
      machine_id: v.data.machine_id,
      checkin_at: new Date().toISOString(),
      checkin_latitude: v.data.latitude ?? null,
      checkin_longitude: v.data.longitude ?? null,
      checkin_distance_meters: distance,
      checkin_photo_url: v.data.photo_url ?? null,
      is_location_valid: isLocationValid,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: visit }, { status: 201 });
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // raio da Terra em metros
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}
