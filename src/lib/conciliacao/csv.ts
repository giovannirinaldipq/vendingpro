/**
 * Parser de extrato bancário em CSV. Aceita formatos comuns:
 * - "Data;Descrição;Valor" (separador ; ou , )
 * - Headers em PT (Data, Histórico, Lançamento, Valor, Crédito)
 * - Valores no formato BR (1.234,56) ou US (1234.56)
 * - Datas dd/mm/yyyy ou yyyy-mm-dd
 */

export interface BankRow {
  date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number; // positivo = entrada, negativo = saída
  raw: Record<string, string>;
}

export function parseBankCSV(content: string): { rows: BankRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['Arquivo vazio ou sem cabeçalho'] };

  const sep = detectSeparator(lines[0]);
  const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  const dateIdx = findIndex(header, ['data', 'date']);
  const descIdx = findIndex(header, ['descrição', 'descricao', 'histórico', 'historico', 'lançamento', 'lancamento', 'description', 'memo']);
  const valueIdx = findIndex(header, ['valor', 'amount', 'value']);
  const creditIdx = findIndex(header, ['crédito', 'credito', 'credit', 'entrada']);
  const debitIdx = findIndex(header, ['débito', 'debito', 'debit', 'saída', 'saida']);

  if (dateIdx === -1) errors.push('Coluna "Data" não encontrada');
  if (descIdx === -1) errors.push('Coluna "Descrição/Histórico" não encontrada');
  if (valueIdx === -1 && creditIdx === -1 && debitIdx === -1) errors.push('Coluna "Valor" ou "Crédito/Débito" não encontrada');

  if (errors.length > 0) return { rows: [], errors };

  const rows: BankRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCSVLine(lines[i], sep);
    if (parts.length < header.length) continue;

    const dateRaw = parts[dateIdx]?.trim();
    const description = parts[descIdx]?.trim() ?? '';
    let amount = 0;
    if (valueIdx !== -1) {
      amount = parseAmount(parts[valueIdx]);
    } else {
      const credit = creditIdx !== -1 ? parseAmount(parts[creditIdx]) : 0;
      const debit = debitIdx !== -1 ? parseAmount(parts[debitIdx]) : 0;
      amount = credit - debit;
    }

    const isoDate = normalizeDate(dateRaw);
    if (!isoDate) continue;

    const raw: Record<string, string> = {};
    header.forEach((h, idx) => { raw[h] = parts[idx] ?? ''; });

    rows.push({ date: isoDate, description, amount, raw });
  }

  return { rows, errors };
}

function detectSeparator(line: string): string {
  const counts = { ';': line.split(';').length, ',': line.split(',').length, '\t': line.split('\t').length };
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}

function splitCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; continue; }
    if (c === sep && !inQuote) { result.push(cur); cur = ''; continue; }
    cur += c;
  }
  result.push(cur);
  return result;
}

function findIndex(header: string[], names: string[]): number {
  for (const n of names) {
    const i = header.indexOf(n);
    if (i !== -1) return i;
  }
  return -1;
}

function parseAmount(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.trim().replace(/[R$\s]/g, '');
  // Formato BR: 1.234,56 — remove pontos, troca vírgula por ponto
  const isBR = /,\d{1,2}$/.test(cleaned);
  const normalized = isBR ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

function normalizeDate(s: string | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim().replace(/^"|"$/g, '');
  // dd/mm/yyyy
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  // yyyy-mm-dd
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return trimmed;
  // dd-mm-yyyy
  const br2 = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (br2) return `${br2[3]}-${br2[2]}-${br2[1]}`;
  return null;
}
