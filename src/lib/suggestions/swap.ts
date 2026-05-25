import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LOOKBACK_DAYS = 30;
const KEEP_THRESHOLD_PCTL = 0.7;    // top 30% = manter
const SWAP_THRESHOLD_DAILY = 0.3;   // < 0.3 vendas/dia = candidato a trocar
const STALE_DAYS_MIN = 21;          // ao menos 21 dias na máquina pra sugerir trocar

export interface ProductSwapSuggestion {
  machine_id: string;
  machine_name: string;
  /** 'keep' = produto best-seller, manter | 'swap' = sugerir trocar */
  action: 'keep' | 'swap';
  product_id: string;
  product_name: string;
  avg_daily_sales: number;
  total_sales: number;
  revenue_30d: number;
  rank_in_machine: number;       // 1 = mais vendido na máquina
  total_products_in_machine: number;
  /** Sugestão concreta de substituto quando action='swap' */
  swap_for?: {
    product_id: string;
    product_name: string;
    /** Justificativa do substituto: "vende X/dia em outra máquina sua" */
    reason: string;
  };
  /** Bullets explicando o porquê */
  reason_detail: string[];
}

/**
 * Para cada máquina, identifica:
 *  - Top 2 produtos best-sellers (action='keep' com destaque)
 *  - Produtos vendendo menos que SWAP_THRESHOLD_DAILY há > STALE_DAYS_MIN dias
 *    (action='swap', sugere substituto: produto top do tenant que NÃO está na máquina)
 */
export async function suggestProductSwaps(tenantId: string): Promise<ProductSwapSuggestion[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10);

  // 1) Carrega todas máquinas ativas + seus produtos
  const { data: machines } = await supabaseAdmin
    .from('machines')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');
  if (!machines?.length) return [];

  // 2) Vendas agregadas por máquina+produto nos últimos 30 dias
  const { data: salesRaw } = await supabaseAdmin
    .from('sales')
    .select('machine_id, product_id, product_name, quantity, total_price')
    .eq('tenant_id', tenantId)
    .gte('sale_date', since);

  type Agg = { product_id: string | null; product_name: string; quantity: number; revenue: number };
  const byMachine = new Map<string, Map<string, Agg>>();

  for (const s of salesRaw ?? []) {
    if (!byMachine.has(s.machine_id)) byMachine.set(s.machine_id, new Map());
    const machMap = byMachine.get(s.machine_id)!;
    const key = (s.product_id as string | null) ?? `name:${s.product_name}`;
    const prev = machMap.get(key) ?? { product_id: s.product_id, product_name: s.product_name, quantity: 0, revenue: 0 };
    prev.quantity += Number(s.quantity ?? 1);
    prev.revenue += Number(s.total_price ?? 0);
    machMap.set(key, prev);
  }

  // 3) Top sellers globais do tenant (pra sugerir substituto) — exclui produtos só com nome (cashless agregado)
  const globalAgg = new Map<string, { product_name: string; quantity: number }>();
  for (const s of salesRaw ?? []) {
    if (!s.product_id) continue;
    const prev = globalAgg.get(s.product_id) ?? { product_name: s.product_name, quantity: 0 };
    prev.quantity += Number(s.quantity ?? 1);
    globalAgg.set(s.product_id, prev);
  }
  const topGlobal = [...globalAgg.entries()]
    .map(([id, v]) => ({ product_id: id, ...v, avg_daily: v.quantity / LOOKBACK_DAYS }))
    .sort((a, b) => b.quantity - a.quantity);

  const suggestions: ProductSwapSuggestion[] = [];

  for (const m of machines) {
    const machMap = byMachine.get(m.id);
    if (!machMap || machMap.size === 0) continue;

    const items = [...machMap.values()]
      .map(v => ({ ...v, avg_daily: v.quantity / LOOKBACK_DAYS }))
      .sort((a, b) => b.quantity - a.quantity);

    const total = items.length;

    // KEEP — top 2 produtos
    for (let i = 0; i < Math.min(2, items.length); i++) {
      const it = items[i];
      if (!it.product_id) continue;
      const sharePct = items.length > 1
        ? Math.round((it.quantity / items.reduce((s, x) => s + x.quantity, 0)) * 1000) / 10
        : 100;
      suggestions.push({
        machine_id: m.id,
        machine_name: m.name,
        action: 'keep',
        product_id: it.product_id,
        product_name: it.product_name,
        avg_daily_sales: Math.round(it.avg_daily * 10) / 10,
        total_sales: it.quantity,
        revenue_30d: Math.round(it.revenue * 100) / 100,
        rank_in_machine: i + 1,
        total_products_in_machine: total,
        reason_detail: [
          `${it.quantity} vendas em 30 dias (${it.avg_daily.toFixed(1)}/dia)`,
          i === 0
            ? `É o produto MAIS vendido desta máquina (${sharePct}% do volume)`
            : `${i + 1}º mais vendido (${sharePct}% do volume)`,
          'Manter abastecido como prioridade',
        ],
      });
    }

    // SWAP — produtos no bottom vendendo abaixo do threshold
    const candidatesToSwap = items.filter(
      it => it.product_id && it.avg_daily < SWAP_THRESHOLD_DAILY && it.quantity < (LOOKBACK_DAYS / 7)
    );

    for (const cand of candidatesToSwap.slice(0, 2)) {
      // Substituto: top global QUE NÃO está nesta máquina
      const productsHere = new Set(items.map(i => i.product_id).filter(Boolean));
      const swapFor = topGlobal.find(t => !productsHere.has(t.product_id));

      const rank = items.findIndex(i => i.product_id === cand.product_id) + 1;
      suggestions.push({
        machine_id: m.id,
        machine_name: m.name,
        action: 'swap',
        product_id: cand.product_id!,
        product_name: cand.product_name,
        avg_daily_sales: Math.round(cand.avg_daily * 100) / 100,
        total_sales: cand.quantity,
        revenue_30d: Math.round(cand.revenue * 100) / 100,
        rank_in_machine: rank,
        total_products_in_machine: total,
        swap_for: swapFor ? {
          product_id: swapFor.product_id,
          product_name: swapFor.product_name,
          reason: `Top vendedor seu (${swapFor.avg_daily.toFixed(1)}/dia em outras máquinas) que NÃO está aqui`,
        } : undefined,
        reason_detail: [
          `Vendeu só ${cand.quantity} unidade(s) em 30 dias (${cand.avg_daily.toFixed(2)}/dia)`,
          `Está em ${rank}º lugar de ${total} produtos nesta máquina — ocupa slot sem render`,
          swapFor
            ? `Substituir por ${swapFor.product_name} (vende ${swapFor.avg_daily.toFixed(1)}/dia em outras máquinas suas) deve render mais`
            : 'Considere remover ou substituir por produto mais demandado',
        ],
      });
    }
  }

  // Ordena: swap (oportunidade de melhora) antes de keep
  suggestions.sort((a, b) => {
    if (a.action !== b.action) return a.action === 'swap' ? -1 : 1;
    return b.total_sales - a.total_sales;
  });

  return suggestions;
}
