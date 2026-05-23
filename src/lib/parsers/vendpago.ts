/**
 * Parser de relatórios de vendas do VendPago (CSV exportado).
 *
 * Estrutura do arquivo:
 * - Linha 1: "Operador:";"VENDPAGO"
 * - Linha 2: "CNPJ:";"xx.xxx.xxx/xxxx-xx"
 * - Linha 3: "Vendas de dd/mm/yyyy ate dd/mm/yyyy"
 * - Linha 4: (vazia)
 * - Linha 5: cabeçalho principal (22 colunas)
 * - Linha 6: sub-cabeçalho de "Produtos" (Produto, Mola, Venda, Preço)
 * - Linha 7+: dados, uma venda por linha
 * - Linhas finais: "Total TEF:", "Total PIX:", etc — ignoradas
 *
 * Encoding: Windows-1252 / ISO-8859-1 (acentos em bytes Latin-1)
 */

import type { ParsedSale } from './vmpay';

export interface VendPagoParseResult {
  success: boolean;
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

// Índices das colunas (header da linha 5, 0-based)
const COL = {
  cliente: 0,
  maquina: 1,
  modelo: 2,
  fabricante: 3,
  pagamento: 4,
  produto: 5,
  mola: 6,
  venda: 7,
  preco: 8,
  total_venda: 9,
  codigo_promocional: 10,
  data: 11,
  hora: 12,
  numero_logico: 13,
  nsu: 14,
  autorizacao: 15,
  tipo_cartao: 16,
  rede: 17,
  bandeira: 18,
  usuario: 19,
  numero_cartao: 20,
  matricula: 21,
} as const;

export function parseVendPagoFile(buffer: ArrayBuffer): VendPagoParseResult {
  const errors: string[] = [];
  const sales: ParsedSale[] = [];
  const machinesSet = new Set<string>();
  let minDate = '';
  let maxDate = '';
  let totalRevenue = 0;
  let skippedRecords = 0;
  let cnpjOperador: string | undefined;
  let periodo: string | undefined;

  try {
    // Decodifica Windows-1252 (Latin-1 estendido) — é o encoding usado pelo VendPago
    const text = decodeLatin1(buffer);
    const lines = text.split(/\r?\n/);

    if (lines.length < 7) {
      return errResult('Arquivo muito curto. Esperado ao menos 7 linhas (6 header + 1 dado).');
    }

    // Captura CNPJ e período do cabeçalho
    const headerLines = lines.slice(0, 4);
    for (const hl of headerLines) {
      const cells = parseCsvLine(hl);
      if (cells[0]?.toLowerCase().startsWith('cnpj')) cnpjOperador = cells[1];
      if (cells[0]?.toLowerCase().startsWith('vendas de')) periodo = cells[0];
    }

    // Detecta a linha de header principal (procura "Cliente" + "Máquina")
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const cells = parseCsvLine(lines[i]);
      if (
        cells[0]?.toLowerCase() === 'cliente' &&
        (cells[1]?.toLowerCase().startsWith('m') ?? false) // Máquina
      ) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) {
      return errResult('Cabeçalho não encontrado. Esperado uma linha começando com "Cliente";"Máquina".');
    }

    // Pula header + sub-header
    const firstDataRow = headerRowIndex + 2;

    let totalRecords = 0;
    for (let i = firstDataRow; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;
      // Pula linhas de totalização no final ("Total TEF: ", "Total PIX: ", etc)
      if (/^"?Total\s+\w+:/i.test(raw)) continue;

      const cells = parseCsvLine(raw);
      if (cells.length < 10) {
        skippedRecords++;
        continue;
      }
      totalRecords++;

      const machineName = (cells[COL.maquina] ?? '').trim();
      const pagamento = (cells[COL.pagamento] ?? '').trim();
      const produto = (cells[COL.produto] ?? '').trim() || 'Indefinido';
      const mola = (cells[COL.mola] ?? '').trim();
      const totalVenda = parseBRNumber(cells[COL.total_venda]);
      const dataStr = (cells[COL.data] ?? '').trim();
      const horaStr = (cells[COL.hora] ?? '').trim() || '00:00:00';

      if (!machineName || !dataStr || isNaN(totalVenda)) {
        skippedRecords++;
        continue;
      }

      const isoDate = parseBRDate(dataStr);
      if (!isoDate) {
        skippedRecords++;
        continue;
      }

      const saleTime = normalizeTime(horaStr);
      const saleDatetime = `${isoDate}T${saleTime}`;

      const tipoCartao = (cells[COL.tipo_cartao] ?? '').trim().toLowerCase();
      const paymentMethod = mapPaymentMethod(pagamento, tipoCartao);

      // Nome do produto: quando vier "Indefinido", concatena com Mola para diferenciar
      const productName =
        produto.toLowerCase() === 'indefinido' && mola
          ? `Indefinido (mola ${mola})`
          : produto;

      if (!minDate || isoDate < minDate) minDate = isoDate;
      if (!maxDate || isoDate > maxDate) maxDate = isoDate;
      machinesSet.add(machineName);
      totalRevenue += totalVenda;

      sales.push({
        machine_code: machineName,
        sale_date: isoDate,
        sale_time: saleTime,
        sale_datetime: saleDatetime,
        product_name: productName,
        product_code: mola,
        barcode: null,
        category: pagamento, // usa o método de pagamento como "categoria" (fallback)
        quantity: 1,
        unit_price: totalVenda,
        total_price: totalVenda,
        payment_method: paymentMethod,
        raw_data: {
          row_index: i,
          cliente: cells[COL.cliente],
          pagamento,
          mola,
          codigo_promocional: cells[COL.codigo_promocional],
          nsu: cells[COL.nsu],
          autorizacao: cells[COL.autorizacao],
          tipo_cartao: cells[COL.tipo_cartao],
          rede: cells[COL.rede],
          bandeira: cells[COL.bandeira],
          usuario: cells[COL.usuario],
          matricula: cells[COL.matricula],
        },
      });
    }

    return {
      success: true,
      sales,
      summary: {
        total_records: totalRecords,
        valid_records: sales.length,
        skipped_records: skippedRecords,
        machines: [...machinesSet].sort(),
        date_range: { start: minDate, end: maxDate },
        total_revenue: Math.round(totalRevenue * 100) / 100,
        cnpj_operador: cnpjOperador,
        periodo,
      },
      errors,
    };
  } catch (e) {
    return errResult(`Erro ao processar VendPago: ${e instanceof Error ? e.message : String(e)}`);
  }

  function errResult(msg: string): VendPagoParseResult {
    return {
      success: false,
      sales: [],
      summary: {
        total_records: 0,
        valid_records: 0,
        skipped_records: 0,
        machines: [],
        date_range: { start: '', end: '' },
        total_revenue: 0,
      },
      errors: [msg],
    };
  }
}

// ----------------- Helpers -----------------

function decodeLatin1(buffer: ArrayBuffer): string {
  // Tenta windows-1252 (superset de Latin-1 com mais glyphs como €, …)
  try {
    return new TextDecoder('windows-1252').decode(buffer);
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer);
  }
}

/**
 * Parser de uma linha CSV com separador ; e valores opcionalmente entre aspas.
 * Não usa biblioteca externa — formato do VendPago é simples e bem definido.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      // Aspas dupla escapada (não usa no VendPago, mas vai que)
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      continue;
    }
    if (c === ';' && !inQuote) {
      result.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  result.push(cur);
  return result;
}

function parseBRNumber(s: string | undefined): number {
  if (!s) return NaN;
  const cleaned = String(s).trim().replace(/[R$\s]/g, '');
  if (!cleaned) return NaN;
  // Formato BR: 1.234,56 — remove pontos, troca vírgula por ponto
  const hasComma = cleaned.includes(',');
  const normalized = hasComma ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  const n = parseFloat(normalized);
  return isNaN(n) ? NaN : n;
}

function parseBRDate(s: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function normalizeTime(s: string): string {
  // Aceita HH:MM:SS ou HH:MM
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s.trim());
  if (!m) return '00:00:00';
  return `${pad(m[1])}:${pad(m[2])}:${pad(m[3] ?? '00')}`;
}

function pad(s: string): string {
  return s.padStart(2, '0');
}

function mapPaymentMethod(pagamento: string, tipoCartao: string): string {
  const p = pagamento.toLowerCase();
  if (p === 'pix') return 'pix';
  if (p === 'cash' || p === 'dinheiro') return 'cash';
  if (p === 'private label') return 'private_label';
  if (p === 'tef' || p === 'cartão' || p === 'cartao' || p === 'credit' || p === 'debit') {
    if (tipoCartao.includes('débito') || tipoCartao.includes('debit')) return 'debit';
    return 'credit';
  }
  return p || 'unknown';
}
