import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LOOKBACK_DAYS = 28; // 4 semanas

export interface RestockScheduleSuggestion {
  machine_id: string;
  machine_name: string;
  location_name: string | null;
  best_weekday: number;        // 0 = domingo, 6 = sábado
  best_weekday_label: string;
  best_hour: number;           // 0-23
  /** Resumo (1 linha) */
  reason: string;
  /** Bullets explicando o "por quê" da sugestão */
  reason_detail: string[];
  last_visit_at: string | null;
  days_since_last_visit: number | null;
  avg_daily_sales: number;
  next_suggested_date: string; // ISO date
  urgency: 'low' | 'medium' | 'high';
}

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/**
 * Refatorado para 3 queries totais (não N+1):
 *   1. machines do tenant
 *   2. todas vendas dos últimos LOOKBACK_DAYS pra essas máquinas (1 query)
 *   3. últimas visitas por máquina (1 query, group by machine_id)
 *
 * Performance: tenant com 100 máquinas e 5k vendas/mês = 3 queries totais
 * (antes: 201 queries = 1 machines + 100 sales + 100 lastVisit).
 */
export async function suggestRestockSchedule(tenantId: string): Promise<RestockScheduleSuggestion[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  const { data: machines } = await supabaseAdmin
    .from('machines')
    .select('id, name, location:locations(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (!machines?.length) return [];

  const machineIds = machines.map(m => m.id);

  // Query 2: TODAS as vendas dessas máquinas no período (1 query, agregação em memória)
  const { data: allSales } = await supabaseAdmin
    .from('sales')
    .select('machine_id, sale_datetime, quantity')
    .eq('tenant_id', tenantId)
    .in('machine_id', machineIds)
    .gte('sale_datetime', since);

  // Query 3: última visita por máquina (1 query — Postgres distinct on é melhor mas
  // .select com order+limit não suporta, então ordenamos e pegamos a primeira em memória)
  const { data: allVisits } = await supabaseAdmin
    .from('restocking_visits')
    .select('machine_id, checkin_at')
    .eq('tenant_id', tenantId)
    .in('machine_id', machineIds)
    .order('checkin_at', { ascending: false });

  // Agregação por máquina em memória
  type MachineStats = {
    byWeekday: number[];
    byHour: number[];
    totalSales: number;
  };
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

  // Última visita por máquina (primeira ocorrência na lista ordenada)
  const lastVisitByMachine = new Map<string, string>();
  for (const v of allVisits ?? []) {
    if (!lastVisitByMachine.has(v.machine_id)) {
      lastVisitByMachine.set(v.machine_id, v.checkin_at);
    }
  }

  const results: RestockScheduleSuggestion[] = [];

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

    const now = new Date();
    const daysAhead = (bestWeekday - now.getDay() + 7) % 7 || 7;
    const next = new Date(now.getTime() + daysAhead * 86400000);

    const locName = Array.isArray(m.location) ? m.location[0]?.name : (m.location as { name?: string } | null)?.name;
    const avgDailySales = Math.round((totalSales / LOOKBACK_DAYS) * 10) / 10;
    const bestHourSales = byHour[bestHour];
    const peakHour = byHour.indexOf(Math.max(...byHour.slice(8, 20)));
    const peakHourSales = byHour[peakHour];

    const reasonDetail: string[] = [
      `${avgDailySales} venda(s)/dia em média nas últimas ${LOOKBACK_DAYS / 7} semanas`,
      `${WEEKDAY_LABELS[bestWeekday]} é o dia com menor movimento (${byWeekday[bestWeekday]} vendas no período)`,
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
      next_suggested_date: next.toISOString().split('T')[0],
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
