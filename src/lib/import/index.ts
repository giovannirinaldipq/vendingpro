/**
 * Camada compartilhada entre /api/app/import/preview e .../confirm.
 * Recebe um buffer + system, devolve dados parseados normalizados.
 */

import { parseVMPayFile, type ParsedSale } from '@/lib/parsers/vmpay';
import { parseVendPagoFile } from '@/lib/parsers/vendpago';

export type ImportSource = 'vmpay' | 'vendpago';

export interface ParseOutput {
  ok: boolean;
  sales: ParsedSale[];
  summary: {
    total_records: number;
    valid_records: number;
    skipped_records: number;
    machines: string[];
    date_range: { start: string; end: string };
    total_revenue: number;
    cnpj_operador?: string;
    periodo?: string;
  };
  errors: string[];
}

export function runParser(buffer: ArrayBuffer, system: ImportSource): ParseOutput {
  if (system === 'vendpago') {
    const r = parseVendPagoFile(buffer);
    return {
      ok: r.success,
      sales: r.sales,
      summary: {
        total_records: r.summary.total_records,
        valid_records: r.summary.valid_records,
        skipped_records: r.summary.skipped_records,
        machines: r.summary.machines,
        date_range: r.summary.date_range,
        total_revenue: r.summary.total_revenue,
        cnpj_operador: r.summary.cnpj_operador,
        periodo: r.summary.periodo,
      },
      errors: r.errors,
    };
  }
  const r = parseVMPayFile(buffer);
  return {
    ok: r.success,
    sales: r.sales,
    summary: {
      total_records: r.summary.total_records,
      valid_records: r.summary.valid_records,
      skipped_records: r.summary.skipped_records,
      machines: r.summary.machines,
      date_range: r.summary.date_range,
      total_revenue: r.summary.total_revenue,
    },
    errors: r.errors,
  };
}

/**
 * Conta vendas por máquina (external_name) no array parseado.
 */
export function salesCountByExternalName(sales: ParsedSale[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sales) {
    m.set(s.machine_code, (m.get(s.machine_code) ?? 0) + 1);
  }
  return m;
}
