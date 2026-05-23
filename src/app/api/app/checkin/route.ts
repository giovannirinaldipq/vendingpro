import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant';
import { haversineMeters, isCheckinValid } from '@/lib/restocking';

const schema = z.object({
  machine_id: z.string().uuid(),
  restocker_id: z.string().uuid().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_input', details: String(e) }, { status: 400 });
  }

  // Busca a máquina + local pra calcular distância
  const { data: machine, error: mErr } = await ctx.supabase
    .from('machines')
    .select('id, restocker_id, location:locations(latitude, longitude)')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', body.machine_id)
    .maybeSingle();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!machine) return NextResponse.json({ error: 'machine_not_found' }, { status: 404 });

  const loc = Array.isArray(machine.location) ? machine.location[0] : machine.location;
  let distanceMeters: number | null = null;
  if (loc?.latitude != null && loc?.longitude != null && body.latitude != null && body.longitude != null) {
    distanceMeters = haversineMeters(
      Number(loc.latitude),
      Number(loc.longitude),
      body.latitude,
      body.longitude
    );
  }

  const isValid = isCheckinValid(distanceMeters);
  const restockerId = body.restocker_id ?? machine.restocker_id;

  const { data: visit, error: insertErr } = await ctx.supabase
    .from('restocking_visits')
    .insert({
      tenant_id: ctx.tenantId,
      machine_id: body.machine_id,
      restocker_id: restockerId,
      checkin_at: new Date().toISOString(),
      checkin_latitude: body.latitude ?? null,
      checkin_longitude: body.longitude ?? null,
      checkin_distance_meters: distanceMeters,
      checkin_photo_url: body.photo_url ?? null,
      is_location_valid: isValid,
      notes: body.notes ?? null,
    })
    .select('id')
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ data: { id: visit.id, is_location_valid: isValid, distance_meters: distanceMeters } }, { status: 201 });
}
