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

export async function suggestRestockSchedule(tenantId: string): Promise<RestockScheduleSuggestion[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  const { data: machines } = await supabaseAdmin
    .from('machines')
    .select('id, name, location:locations(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (!machines?.length) return [];

  const results: RestockScheduleSuggestion[] = [];

  for (const m of machines) {
    const { data: sales } = await supabaseAdmin
      .from('sales')
      .select('sale_datetime, quantity')
      .eq('tenant_id', tenantId)
      .eq('machine_id', m.id)
      .gte('sale_datetime', since);

    // Encontra o pior dia (menos vendas) para abastecer = melhor dia
    // E o pior horário (menor movimento) para evitar fila
    const byWeekday = new Array(7).fill(0);
    const byHour = new Array(24).fill(0);
    let totalSales = 0;
    for (const s of sales ?? []) {
      const dt = new Date(s.sale_datetime);
      const qty = Number(s.quantity ?? 1);
      byWeekday[dt.getDay()] += qty;
      byHour[dt.getHours()] += qty;
      totalSales += qty;
    }

    if (totalSales === 0) continue;

    // Melhor dia: o dia da semana com menor venda total (vai ter menos perda de cliente em fila)
    const bestWeekday = byWeekday.indexOf(Math.min(...byWeekday));
    // Melhor hora: hora útil (8h-20h) com menor venda
    const usefulHours = byHour.slice(8, 20);
    const minUseful = Math.min(...usefulHours);
    const bestHour = byHour.slice(8, 20).indexOf(minUseful) + 8;

    // Última visita
    const { data: lastVisit } = await supabaseAdmin
      .from('restocking_visits')
      .select('checkin_at')
      .eq('tenant_id', tenantId)
      .eq('machine_id', m.id)
      .order('checkin_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastVisitAt = lastVisit?.checkin_at ?? null;
    const daysSinceVisit = lastVisitAt
      ? Math.floor((Date.now() - new Date(lastVisitAt).getTime()) / 86400000)
      : null;

    const urgency: 'low' | 'medium' | 'high' =
      daysSinceVisit == null || daysSinceVisit > 14 ? 'high'
      : daysSinceVisit > 7 ? 'medium' : 'low';

    // Próxima data sugerida = próximo dia da semana = bestWeekday
    const now = new Date();
    const daysAhead = (bestWeekday - now.getDay() + 7) % 7 || 7;
    const next = new Date(now.getTime() + daysAhead * 86400000);

    const locName = Array.isArray(m.location) ? m.location[0]?.name : (m.location as { name?: string } | null)?.name;
    const avgDailySales = Math.round((totalSales / LOOKBACK_DAYS) * 10) / 10;
    const bestHourSales = byHour[bestHour];
    const peakHour = byHour.indexOf(Math.max(...byHour.slice(8, 20)));
    const peakHourSales = byHour[peakHour];

    // Monta bullets de porquê
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

  // Ordena por urgência (high → low) e depois por data
  results.sort((a, b) => {
    const ord = { high: 0, medium: 1, low: 2 };
    if (ord[a.urgency] !== ord[b.urgency]) return ord[a.urgency] - ord[b.urgency];
    return a.next_suggested_date.localeCompare(b.next_suggested_date);
  });

  return results;
}
