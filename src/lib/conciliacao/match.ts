import type { BankRow } from './csv';

export interface PaymentForMatch {
  id: string;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  invoice_number?: string;
  method?: string;
}

export interface MatchResult {
  bank_row: BankRow;
  matched_payment_id: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
}

const VALUE_TOLERANCE_CENTS = 1; // R$ 0.01 de diferença é OK

/**
 * Match heurístico: para cada linha do extrato (entrada), procura payment
 * com valor igual e data próxima (±3 dias). Confiança baseada em proximidade.
 */
export function matchBankAgainstPayments(
  bankRows: BankRow[],
  payments: PaymentForMatch[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const usedPayments = new Set<string>();

  for (const row of bankRows) {
    if (row.amount <= 0) {
      results.push({ bank_row: row, matched_payment_id: null, confidence: 'none', reason: 'Saída, ignorado' });
      continue;
    }

    let bestMatch: PaymentForMatch | null = null;
    let bestDiff = Infinity;

    for (const p of payments) {
      if (usedPayments.has(p.id)) continue;
      const valueDiff = Math.abs(p.amount - row.amount) * 100;
      if (valueDiff > VALUE_TOLERANCE_CENTS) continue;
      const dayDiff = Math.abs(
        (new Date(row.date).getTime() - new Date(p.payment_date).getTime()) / 86400000
      );
      if (dayDiff > 5) continue; // mais de 5 dias de diferença → ignora

      if (dayDiff < bestDiff) {
        bestDiff = dayDiff;
        bestMatch = p;
      }
    }

    if (!bestMatch) {
      results.push({ bank_row: row, matched_payment_id: null, confidence: 'none', reason: 'Sem pagamento correspondente' });
      continue;
    }

    usedPayments.add(bestMatch.id);
    const confidence: MatchResult['confidence'] = bestDiff === 0 ? 'high' : bestDiff <= 1 ? 'medium' : 'low';
    results.push({
      bank_row: row,
      matched_payment_id: bestMatch.id,
      confidence,
      reason: `Match ${bestMatch.invoice_number ?? bestMatch.id} (${bestDiff.toFixed(0)}d de diferença)`,
    });
  }

  return results;
}
