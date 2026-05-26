import { supabaseAdmin } from '@/lib/supabase/admin';
const LOOKBACK_DAYS = 28;

export interface RestockScheduleSuggestion {
  machine_id: string;
  machine_name: string;
  location_name: string | null;
  best_weekday: number;
  best_weekday_label: string;
  best_hour: number;
  reason: string;
  reason_detail: string[];
  last_visit_at: string | null;
  days_since_last_visit: number | null;
  avg_daily_sales: number;
  next_suggested_date: string;
  urgency: 'low' | 'medium' | 'high';
}

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export async function suggestRestockSchedule(tenantId: string): Promise<RestockScheduleSuggestion[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  const [{ data: machines }, { data: tenantRow }] = await Promise.all([
    supabaseAdmin
      .from('machines')
      .select('id, name, location:locations(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    supabaseAdmin
      .from('tenants')
      .select('active_restockers_count, avg_visits_per_day_per_restocker')
      .eq('id', tenantId)
      .single(),
  ]);

  if (!machines?.length) return [];

  const restockers = (tenantRow?.active_restockers_count as number) || 1;
  const visitsPerDay = (tenantRow?.avg_visits_per_day_per_restocker as number) || 4;
  const dailyCapacity = Math.max(1, Math.round(restockers * visitsPerDay));

  const machineIds = machines.map(m => m.id);

  const [{ data: allSales }, { data: allVisits }] = await Promise.all([
    supabaseAdmin
      .from('sales')
      .select('machine_id, sale_datetime, quantity')
      .eq('tenant_id', tenantId)
      .in('machine_id', machineIds)
      .gte('sale_datetime', since),
    supabaseAdmin
      .from('restocking_visits')
      .select('machine_id, checkin_at')
      .eq('tenant_id', tenantId)
      .in('machine_id', machineIds)
      .order('checkin_at', { ascending: false }),
  ]);

  type MachineStats = { byWeekday: number[]; byHour: number[]; totalSales: number };
  const statsByMachine = new Map<string, MachineStats>();
  for (const id of machineIds) {
    statsByMachine.set(id, { byWeekday: new Array(7).fill(0), byHour: new Array(24).fill(0), totalSales: 0 });
  }
  for (const s of allSales ?? []) {
    const stat = statsByMachine.get(s.machine_id);
    if (!stat) continue;
    const dt = new Date(s.sale_datetime);
    const qty = Number(s.quantity ?? 1);
    stat.byWeekday[dt.getDay()] += qty;
    stat.byHour[dt.getHours()] += qty;
    stat.totalSales += qty;
  }

  const lastVisitByMachine = new Map<string, string>();
  for (const v of allVisits ?? []) {
    if (!lastVisitByMachine.has(v.machine_id)) {
      lastVisitByMachine.set(v.machine_id, v.checkin_at);
    }
  }

  interface RawSuggestion {
    machine: typeof machines[number];
    stat: MachineStats;
    bestWeekday: number;
    bestHour: number;
    lastVisitAt: string | null;
    daysSinceVisit: number | null;
    urgency: 'low' | 'medium' | 'high';
    avgDailySales: number;
  }

  const raw: RawSuggestion[] = [];

  for (const m of machines) {
    const stat = statsByMachine.get(m.id)!;
    if (stat.totalSales === 0) continue;

    const { byWeekday, byHour, totalSales } = stat;
    const bestWeekday = byWeekday.indexOf(Math.min(...byWeekday));
    const usefulHours = byHour.slice(8, 20);
    const minUseful = Math.min(...usefulHours);
    const bestHour = byHour.slice(8, 20).indexOf(minUseful) + 8;

    const lastVisitAt = lastVisitByMachine.get(m.id) ?? null;
    const daysSinceVisit = lastVisitAt
      ? Math.floor((Date.now() - new Date(lastVisitAt).getTime()) / 86400000)
      : null;

    const urgency: 'low' | 'medium' | 'high' =
      daysSinceVisit == null || daysSinceVisit > 14 ? 'high'
      : daysSinceVisit > 7 ? 'medium' : 'low';

    const avgDailySales = Math.round((totalSales / LOOKBACK_DAYS) * 10) / 10;

    raw.push({ machine: m, stat, bestWeekday, bestHour, lastVisitAt, daysSinceVisit, urgency, avgDailySales });
  }

  // Sort by urgency (high first), then by days since visit (longest first)
  raw.sort((a, b) => {
    const ord = { high: 0, medium: 1, low: 2 };
    if (ord[a.urgency] !== ord[b.urgency]) return ord[a.urgency] - ord[b.urgency];
    return (b.daysSinceVisit ?? 999) - (a.daysSinceVisit ?? 999);
  });

  // Capacity-aware scheduling: distribute machines across days
  const now = new Date();
  const daySlots = new Map<string, number>(); // ISO date → count assigned

  function getNextAvailableDate(preferredWeekday: number): string {
    const daysAhead = (preferredWeekday - now.getDay() + 7) % 7 || 7;
    let candidate = new Date(now.getTime() + daysAhead * 86400000);

    for (let attempt = 0; attempt < 14; attempt++) {
      const key = candidate.toISOString().split('T')[0];
      const used = daySlots.get(key) ?? 0;
      if (used < dailyCapacity) {
        daySlots.set(key, used + 1);
        return key;
      }
      candidate = new Date(candidate.getTime() + 86400000);
    }
    // Fallback: assign anyway
    const key = candidate.toISOString().split('T')[0];
    daySlots.set(key, (daySlots.get(key) ?? 0) + 1);
    return key;
  }

  const results: RestockScheduleSuggestion[] = [];

  for (const r of raw) {
    const { machine: m, stat, bestWeekday, bestHour, lastVisitAt, daysSinceVisit, urgency, avgDailySales } = r;
    const nextDate = getNextAvailableDate(bestWeekday);

    const locName = Array.isArray(m.location) ? m.location[0]?.name : (m.location as { name?: string } | null)?.name;
    const bestHourSales = stat.byHour[bestHour];
    const peakHour = stat.byHour.indexOf(Math.max(...stat.byHour.slice(8, 20)));
    const peakHourSales = stat.byHour[peakHour];

    const reasonDetail: string[] = [
      `${avgDailySales} venda(s)/dia em média nas últimas ${LOOKBACK_DAYS / 7} semanas`,
      `${WEEKDAY_LABELS[bestWeekday]} é o dia com menor movimento (${stat.byWeekday[bestWeekday]} vendas no período)`,
      `Entre ${String(bestHour).padStart(2, '0')}h-${String(bestHour + 1).padStart(2, '0')}h só ${bestHourSales} venda(s) — pico é ${String(peakHour).padStart(2, '0')}h com ${peakHourSales}`,
    ];
    if (daysSinceVisit != null) {
      reasonDetail.push(
        daysSinceVisit > 14
          ? `Sem visita há ${daysSinceVisit} dias — possível ruptura de produtos`
          : daysSinceVisit > 7
          ? `Última visita há ${daysSinceVisit} dias`
          : `Última visita recente (${daysSinceVisit}d)`
      );
    } else {
      reasonDetail.push('Nenhuma visita registrada ainda');
    }

    const scheduledDate = new Date(nextDate);
    const scheduledWeekday = scheduledDate.getDay();
    if (scheduledWeekday !== bestWeekday) {
      reasonDetail.push(
        `Reagendado de ${WEEKDAY_LABELS[bestWeekday]} para ${WEEKDAY_LABELS[scheduledWeekday]} (capacidade: ${dailyCapacity} visitas/dia)`
      );
    }

    results.push({
      machine_id: m.id,
      machine_name: m.name,
      location_name: locName ?? null,
      best_weekday: bestWeekday,
      best_weekday_label: WEEKDAY_LABELS[bestWeekday],
      best_hour: bestHour,
      reason: `Melhor horário: ${WEEKDAY_LABELS[bestWeekday]} ${String(bestHour).padStart(2, '0')}h`,
      reason_detail: reasonDetail,
      last_visit_at: lastVisitAt,
      days_since_last_visit: daysSinceVisit,
      avg_daily_sales: avgDailySales,
      next_suggested_date: nextDate,
      urgency,
    });
  }

  results.sort((a, b) => {
    const ord = { high: 0, medium: 1, low: 2 };
    if (ord[a.urgency] !== ord[b.urgency]) return ord[a.urgency] - ord[b.urgency];
    return a.next_suggested_date.localeCompare(b.next_suggested_date);
  });

  return results;
}
