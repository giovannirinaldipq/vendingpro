import * as XLSX from 'xlsx';

export interface VMPayTransaction {
  operador: string;
  cnpj_operador: string;
  mes: string;
  dia: number; // Excel serial date
  hora: number;
  semana: string;
  dia_semana: string;
  cliente: string;
  local: string;
  local_interno: string;
  tipo_maquina: string;
  modelo_maquina: string;
  maquina: string; // Código da máquina
  centro_distribuicao: string;
  consumidor: string;
  vmbox: string;
  tipo: string;
  ponto_captura: string;
  estado: string;
  categoria: string;
  fabricante: string;
  produto: string;
  codigo_produto: string;
  codigo_barras: string;
  provedor: string;
  adquirente: string;
  cartao: string;
  tipo_cartao: string;
  erro: string | null;
  detalhes_erro: string;
  autorizador: string | null;
  app_mobile: string | null;
  requisicao: string;
  numero_cartao: string;
  data_cadastro: number;
  tipo_box: string;
  tipo_instalacao: string;
  cpf: string;
  telefone: string;
  pedido: string;
  valor: number;
  valor_percent: number;
  desconto: number;
  desconto_percent: number;
  qtde_peso: number;
  quantidade: number;
  quantidade_percent: number;
}

export interface ParsedSale {
  machine_code: string;
  sale_date: string; // YYYY-MM-DD
  sale_time: string; // HH:MM:SS
  sale_datetime: string; // ISO string
  product_name: string;
  product_code: string;
  barcode: string | null;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: string;
  raw_data: Record<string, unknown>;
}

export interface VMPayParseResult {
  success: boolean;
  sales: ParsedSale[];
  summary: {
    total_records: number;
    valid_records: number;
    skipped_records: number;
    machines: string[];
    date_range: {
      start: string;
      end: string;
    };
    total_revenue: number;
    /** Indica formato detectado: 'sales_detailed' (linha por venda) ou 'cashless_aggregated' (linha por dia) */
    format?: 'sales_detailed' | 'cashless_aggregated';
    /** Quando agregado: soma de transações reais embutidas (cada linha é um dia com N vendas) */
    aggregated_transactions?: number;
  };
  errors: string[];
}

/**
 * Detecta a forma de pagamento granular a partir dos campos VMPay.
 * Valores padronizados (alinhados com sales_payment_method_check):
 *   debit, credit, pix, meal_voucher, transport_voucher, other_voucher, cashless, unknown
 */
function inferPaymentMethod(input: {
  autorizador?: unknown;
  tipoCartao?: unknown;
  adquirente?: unknown;
}): string {
  const autorizador = String(input.autorizador ?? '').toLowerCase();
  const tipoCartao = String(input.tipoCartao ?? '').toLowerCase();
  const adquirente = String(input.adquirente ?? '').toLowerCase();
  const all = `${autorizador} ${tipoCartao} ${adquirente}`;

  if (/pix/.test(all)) return 'pix';

  // Vouchers — específicos primeiro
  if (/vale[\s-]?aliment|vale[\s-]?ref|sodexo|alelo|vr\b|va\b|ticket[\s-]?(rest|aliment)/i.test(all)) return 'meal_voucher';
  if (/vale[\s-]?transport|vt\b/i.test(all)) return 'transport_voucher';
  if (/voucher|vale/i.test(all)) return 'other_voucher';

  // Cartão — débito x crédito
  if (/débit|debit/.test(tipoCartao) || /débit|debit/.test(all)) return 'debit';
  if (/crédit|credit/.test(tipoCartao) || /crédit|credit/.test(all)) return 'credit';

  // Adquirente conhecida → assume crédito por default (mais comum em vending)
  if (/cielo|stone|getnet|rede|safrapay|pagseguro/.test(adquirente)) return 'credit';

  return 'unknown';
}

// Converte serial date do Excel para Date
function excelDateToJS(serial: number): Date {
  // Excel usa 1/1/1900 como dia 1, mas tem um bug do ano bissexto de 1900
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

// Converte hora decimal para string HH:MM:SS
function excelHourToTime(hour: number): string {
  const totalMinutes = Math.round(hour * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

export function parseVMPayFile(buffer: ArrayBuffer): VMPayParseResult {
  const errors: string[] = [];
  const sales: ParsedSale[] = [];
  const machinesSet = new Set<string>();
  let minDate = '';
  let maxDate = '';
  let totalRevenue = 0;
  let skippedRecords = 0;

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    // Detecção: formato CASHLESS — pode ser AGREGADO ou DETALHADO (transação por transação)
    const titleCell = String((data[0] as unknown[])?.[0] ?? '').toLowerCase().trim();
    const sheetNameLower = sheetName.toLowerCase();
    const isCashlessTitle =
      titleCell === 'transações cashless' ||
      titleCell === 'transacoes cashless' ||
      sheetNameLower.includes('cashless');

    if (isCashlessTitle) {
      // Verificar se é formato DETALHADO (tem header com "Operador" + "Data/hora" + "Produto")
      let detailedHeaderRow = -1;
      for (let i = 0; i < Math.min(30, data.length); i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        const r = row.map((c: unknown) => String(c ?? '').toLowerCase().trim());
        if (r.includes('operador') && r.some(c => c.includes('data')) && r.includes('produto')) {
          detailedHeaderRow = i;
          break;
        }
      }
      if (detailedHeaderRow !== -1) {
        return parseVMPayCashlessDetailed(data, detailedHeaderRow);
      }
      return parseVMPayCashlessAggregated(data, workbook.SheetNames);
    }

    // Formato VENDAS (linha por transação): encontrar linha do cabeçalho
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(30, data.length); i++) {
      const row = data[i];
      if (row && row[0] === 'Operador' && row[1] === 'CNPJ Operador') {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Diagnóstico contextual: detecta possíveis formatos
      const diagnosis = diagnoseFormat(data, workbook.SheetNames);
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
        errors: diagnosis,
      };
    }

    const headers = data[headerRowIndex] as string[];

    // Mapear índices das colunas importantes
    const colIndex = {
      maquina: headers.indexOf('Máquina'),
      dia: headers.indexOf('Dia'),
      hora: headers.indexOf('Hora'),
      estado: headers.indexOf('Estado'),
      categoria: headers.indexOf('Categoria'),
      produto: headers.indexOf('Produto'),
      codigo_produto: headers.indexOf('Código do produto'),
      codigo_barras: headers.indexOf('Código de barras'),
      valor: headers.indexOf('Valor (R$)'),
      quantidade: headers.indexOf('Quantidade'),
      tipo_cartao: headers.indexOf('Tipo de cartão'),
      adquirente: headers.indexOf('Adquirente'),
      autorizador: headers.indexOf('Autorizador'),
    };

    // Processar linhas de dados
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 10) continue;

      // Pular se não for uma transação OK
      const estado = row[colIndex.estado];
      if (estado !== 'OK') {
        skippedRecords++;
        continue;
      }

      const machineCode = String(row[colIndex.maquina] || '');
      const diaSerial = Number(row[colIndex.dia]);
      const hora = Number(row[colIndex.hora] || 0);
      const produto = String(row[colIndex.produto] || '');
      const codigoProduto = String(row[colIndex.codigo_produto] || '');
      const codigoBarras = row[colIndex.codigo_barras] ? String(row[colIndex.codigo_barras]) : null;
      const categoria = String(row[colIndex.categoria] || '');
      const valor = Number(row[colIndex.valor] || 0);
      const quantidade = Number(row[colIndex.quantidade] || 1);

      // Determinar método de pagamento (granular: debit, credit, pix, meal_voucher, ...)
      const paymentMethod = inferPaymentMethod({
        autorizador: row[colIndex.autorizador],
        tipoCartao: row[colIndex.tipo_cartao],
        adquirente: row[colIndex.adquirente],
      });

      if (!machineCode || !diaSerial || !produto) {
        skippedRecords++;
        continue;
      }

      // Converter data
      const saleDate = excelDateToJS(diaSerial);
      const saleDateStr = saleDate.toISOString().split('T')[0];
      const saleTimeStr = excelHourToTime(hora);
      const saleDatetime = `${saleDateStr}T${saleTimeStr}`;

      // Atualizar range de datas
      if (!minDate || saleDateStr < minDate) minDate = saleDateStr;
      if (!maxDate || saleDateStr > maxDate) maxDate = saleDateStr;

      machinesSet.add(machineCode);
      totalRevenue += valor;

      sales.push({
        machine_code: machineCode,
        sale_date: saleDateStr,
        sale_time: saleTimeStr,
        sale_datetime: saleDatetime,
        product_name: produto,
        product_code: codigoProduto,
        barcode: codigoBarras,
        category: categoria,
        quantity: quantidade,
        unit_price: quantidade > 0 ? valor / quantidade : valor,
        total_price: valor,
        payment_method: paymentMethod,
        raw_data: {
          row_index: i,
          original_row: row,
        },
      });
    }

    return {
      success: true,
      sales,
      summary: {
        total_records: data.length - headerRowIndex - 1,
        valid_records: sales.length,
        skipped_records: skippedRecords,
        machines: Array.from(machinesSet).sort(),
        date_range: {
          start: minDate,
          end: maxDate,
        },
        total_revenue: Math.round(totalRevenue * 100) / 100,
      },
      errors,
    };
  } catch (error) {
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
      errors: [`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
    };
  }
}

/**
 * Parser do relatório CASHLESS DETALHADO do VMPay (aba "Transações cashless").
 *
 * Formato: 1 linha por transação individual com colunas:
 * Operador | Data/hora | Cliente | Local | Local interno | Máquina | Modelo de máquina |
 * VMbox | Uuid | Ponto de captura | Tipo | Estado | Item | Código do produto | Produto |
 * Provedor | Adquirente | Cartão | Tipo de cartão | Número do cartão | Parcelas |
 * Quantidade | Valor (R$) | Desconto (R$) | Preço de Custo (R$) | ...
 */
function parseVMPayCashlessDetailed(
  data: unknown[][],
  headerRowIndex: number
): VMPayParseResult {
  const errors: string[] = [];
  const sales: ParsedSale[] = [];
  const machinesSet = new Set<string>();
  let minDate = '';
  let maxDate = '';
  let totalRevenue = 0;
  let skippedRecords = 0;

  const headers = (data[headerRowIndex] as unknown[]).map((c: unknown) => String(c ?? '').trim().toLowerCase());

  const col = {
    operador: headers.indexOf('operador'),
    dataHora: headers.findIndex(h => h.includes('data')),
    maquina: headers.findIndex(h => h === 'máquina' || h === 'maquina'),
    tipo: headers.indexOf('tipo'),
    estado: headers.indexOf('estado'),
    item: headers.indexOf('item'),
    codigoProduto: headers.findIndex(h => h.includes('código do produto') || h.includes('codigo do produto')),
    produto: headers.indexOf('produto'),
    provedor: headers.indexOf('provedor'),
    adquirente: headers.indexOf('adquirente'),
    cartao: headers.findIndex(h => h === 'cartão' || h === 'cartao'),
    tipoCartao: headers.findIndex(h => h.includes('tipo de cart')),
    parcelas: headers.indexOf('parcelas'),
    quantidade: headers.indexOf('quantidade'),
    valor: headers.findIndex(h => h.includes('valor')),
    desconto: headers.findIndex(h => h.includes('desconto')),
    custoProduto: headers.findIndex(h => h.includes('custo')),
  };

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || !Array.isArray(row) || row.length < 10) continue;

    const estado = String(row[col.estado] ?? '').trim();
    if (estado !== 'OK') {
      skippedRecords++;
      continue;
    }

    const machineCode = String(row[col.maquina] ?? '').trim();
    const produto = String(row[col.produto] ?? '').trim();
    const codigoProduto = String(row[col.codigoProduto] ?? '').trim();
    const valor = Number(row[col.valor] ?? 0);
    const quantidadeRaw = String(row[col.quantidade] ?? '1');
    const quantity = parseInt(quantidadeRaw.replace(/[^\d]/g, '')) || 1;

    if (!machineCode || !produto) {
      skippedRecords++;
      continue;
    }

    // Parse date/time from "DD/MM/YYYY HH:MM:SS" format
    const dateTimeStr = String(row[col.dataHora] ?? '');
    const dtMatch = dateTimeStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!dtMatch) {
      skippedRecords++;
      continue;
    }

    const [, dd, mm, yyyy, hh, mi, ss] = dtMatch;
    const saleDateStr = `${yyyy}-${mm}-${dd}`;
    const saleTimeStr = `${hh}:${mi}:${ss}`;
    const saleDatetime = `${saleDateStr}T${saleTimeStr}`;

    if (!minDate || saleDateStr < minDate) minDate = saleDateStr;
    if (!maxDate || saleDateStr > maxDate) maxDate = saleDateStr;
    machinesSet.add(machineCode);
    totalRevenue += valor;

    // Payment method inference
    const tipoCartao = String(row[col.tipoCartao] ?? '').toLowerCase();
    const adquirente = String(row[col.adquirente] ?? '').toLowerCase();
    const cartaoBrand = String(row[col.cartao] ?? '').toLowerCase();
    const tipoTransacao = String(row[col.tipo] ?? '').toLowerCase();

    let paymentMethod: string;
    if (/vmlink|autorizador externo/i.test(tipoTransacao)) {
      paymentMethod = 'pix';
    } else if (/voucher/i.test(tipoCartao) || /ticket|alelo|pluxee|sodexo|vr\b|vale/i.test(cartaoBrand)) {
      if (/aliment|refei/i.test(cartaoBrand)) paymentMethod = 'meal_voucher';
      else paymentMethod = 'meal_voucher';
    } else if (/débit|debit|débito/i.test(tipoCartao)) {
      paymentMethod = 'debit';
    } else if (/crédit|credit|crédito/i.test(tipoCartao)) {
      paymentMethod = 'credit';
    } else if (/pix/i.test(tipoCartao) || /pix/i.test(adquirente)) {
      paymentMethod = 'pix';
    } else {
      paymentMethod = inferPaymentMethod({ autorizador: null, tipoCartao, adquirente });
    }

    sales.push({
      machine_code: machineCode,
      sale_date: saleDateStr,
      sale_time: saleTimeStr,
      sale_datetime: saleDatetime,
      product_name: produto,
      product_code: codigoProduto,
      barcode: null,
      category: '',
      quantity,
      unit_price: quantity > 0 ? Math.round((valor / quantity) * 100) / 100 : valor,
      total_price: valor,
      payment_method: paymentMethod,
      raw_data: {
        row_index: i,
        format: 'vmpay_cashless_detailed',
        adquirente: row[col.adquirente],
        cartao: row[col.cartao],
        tipo_cartao: row[col.tipoCartao],
      },
    });
  }

  return {
    success: true,
    sales,
    summary: {
      total_records: data.length - headerRowIndex - 1,
      valid_records: sales.length,
      skipped_records: skippedRecords,
      machines: Array.from(machinesSet).sort(),
      date_range: { start: minDate, end: maxDate },
      total_revenue: Math.round(totalRevenue * 100) / 100,
      format: 'sales_detailed',
    },
    errors,
  };
}

/**
 * Parser do relatório CASHLESS do VMPay agrupado por Dia/Local/Máquina.
 *
 * Estrutura:
 * - Linha 0: "Transações cashless" (título)
 * - Linhas 2-9 (aprox): filtros (Operador, Período, Máquina, etc)
 * - Linha "Agrupamento" + "Dia, Local, Máquina"
 * - Linha "Número de registros | N"
 * - Header: "Dia | Local | Máquina | Valor (R$) | % | Desconto (R$) | % | Quantidade | %"
 * - Linhas de dados: 1 linha = total de UM dia em UMA máquina
 * - Última linha: "Total | | | <soma>"
 *
 * Cada linha vira uma Sale agregada (product_name = "Vendas do dia (cashless agregado)").
 */
function parseVMPayCashlessAggregated(
  data: unknown[][],
  sheetNames: string[]
): VMPayParseResult {
  const errors: string[] = [];
  const sales: ParsedSale[] = [];
  const machinesSet = new Set<string>();
  let minDate = '';
  let maxDate = '';
  let totalRevenue = 0;
  let skippedRecords = 0;
  let totalRecords = 0;

  // Encontra header procurando célula "Dia" + "Local" + "Máquina" + "Valor"
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(40, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const c0 = String(row[0] ?? '').trim().toLowerCase();
    const c1 = String(row[1] ?? '').trim().toLowerCase();
    const c2 = String(row[2] ?? '').trim().toLowerCase();
    const c3 = String(row[3] ?? '').trim().toLowerCase();
    if (
      (c0 === 'dia' || c0.startsWith('dia')) &&
      (c1 === 'local' || c1.startsWith('local')) &&
      (c2 === 'máquina' || c2 === 'maquina') &&
      c3.startsWith('valor')
    ) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
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
      errors: [
        'Detectamos um relatório CASHLESS do VMPay, mas o cabeçalho esperado (Dia | Local | Máquina | Valor) não foi encontrado.',
        'No VMPay, ao exportar o relatório cashless, escolha o agrupamento "Dia, Local, Máquina" e tente novamente.',
        sheetNames.length > 1 ? `Abas detectadas: ${sheetNames.join(', ')}` : '',
      ].filter(Boolean),
    };
  }

  // Processa linhas de dados (header + 1 até "Total" ou fim)
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Linha de totalização final ("Total | | | <valor>")
    const c0Str = String(row[0] ?? '').trim().toLowerCase();
    if (c0Str === 'total' || c0Str.startsWith('total ')) continue;

    // Dia em Excel serial (numérico) — se não for número, pula
    const diaSerial = Number(row[0]);
    if (!Number.isFinite(diaSerial) || diaSerial <= 0) {
      skippedRecords++;
      continue;
    }

    totalRecords++;

    const local = String(row[1] ?? '').trim();
    const machineCode = String(row[2] ?? '').trim();
    const valor = Number(row[3] ?? 0);
    const desconto = Number(row[5] ?? 0);
    const quantidade = Number(row[7] ?? 0);

    if (!machineCode || !Number.isFinite(valor) || valor <= 0 || !Number.isFinite(quantidade) || quantidade <= 0) {
      skippedRecords++;
      continue;
    }

    const saleDate = excelDateToJS(diaSerial);
    const saleDateStr = saleDate.toISOString().split('T')[0];

    if (!minDate || saleDateStr < minDate) minDate = saleDateStr;
    if (!maxDate || saleDateStr > maxDate) maxDate = saleDateStr;
    machinesSet.add(machineCode);
    totalRevenue += valor;

    sales.push({
      machine_code: machineCode,
      sale_date: saleDateStr,
      sale_time: '00:00:00',
      sale_datetime: `${saleDateStr}T00:00:00`,
      product_name: 'Vendas do dia (cashless agregado)',
      product_code: '',
      barcode: null,
      category: 'Agregado VMPay',
      quantity: quantidade,
      unit_price: quantidade > 0 ? Math.round((valor / quantidade) * 100) / 100 : valor,
      total_price: valor,
      payment_method: 'cashless',
      raw_data: {
        row_index: i,
        format: 'vmpay_cashless_aggregated',
        local,
        desconto,
      },
    });
  }

  // Soma de transações reais (cada linha é um dia agregando N transações na quantity)
  const aggregatedTransactions = sales.reduce((sum, s) => sum + (s.quantity ?? 0), 0);

  return {
    success: true,
    sales,
    summary: {
      total_records: totalRecords,
      valid_records: sales.length,
      skipped_records: skippedRecords,
      machines: Array.from(machinesSet).sort(),
      date_range: { start: minDate, end: maxDate },
      total_revenue: Math.round(totalRevenue * 100) / 100,
      format: 'cashless_aggregated',
      aggregated_transactions: aggregatedTransactions,
    },
    errors,
  };
}

/**
 * Inspeciona as primeiras linhas do arquivo e tenta deduzir o formato.
 * Devolve uma lista de mensagens contextuais (em vez de "cabeçalho não encontrado").
 */
function diagnoseFormat(data: unknown[][], sheetNames: string[]): string[] {
  const out: string[] = [];

  // Coleta primeiras 10 linhas que tenham algum conteúdo
  const peek = data
    .slice(0, 15)
    .filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && String(c).trim() !== ''))
    .slice(0, 8);

  if (peek.length === 0) {
    out.push('A planilha está vazia ou todas as linhas iniciais estão em branco.');
    return out;
  }

  // Heurísticas de detecção
  const allText = peek.flat().map(c => String(c ?? '').toLowerCase()).join(' | ');
  const looksLikeVMPaySales = /operador.*cnpj operador/i.test(allText) ||
    (allText.includes('máquina') && allText.includes('valor') && allText.includes('estado'));
  const looksLikeVMPayCashless = /cashless|saldo carteira|recarga|usuário cashless/i.test(allText);
  const looksLikeVendpago = /vendpago|"vendas de\s+\d{2}\/\d{2}/i.test(allText);
  const looksLikeBankStatement = /(saldo|extrato|crédito|débito|histórico)/i.test(allText) && !allText.includes('máquina');

  if (looksLikeVendpago) {
    out.push('Detectamos um arquivo do Vendpago, mas você está importando como VMPay.');
    out.push('Volte ao passo anterior e troque o sistema de telemetria para "VendPago".');
    return out;
  }

  // Cashless já é tratado pelo parser principal — se caiu aqui, é porque o
  // arquivo se identifica como cashless mas a estrutura interna não bate.
  if (looksLikeVMPayCashless) {
    out.push('Detectamos um relatório CASHLESS do VMPay mas não conseguimos identificar o agrupamento.');
    out.push('No VMPay, exporte com agrupamento "Dia, Local, Máquina" e tente novamente.');
    return out;
  }

  if (looksLikeBankStatement) {
    out.push('Este parece ser um extrato bancário, não uma planilha de vendas de máquinas.');
    out.push('Vá em Financeiro → Conciliação para importar extratos bancários.');
    return out;
  }

  if (looksLikeVMPaySales) {
    out.push('Arquivo parece ser do VMPay mas o cabeçalho não está nas primeiras 30 linhas.');
    out.push('Confira se você não exportou um arquivo com filtros ou cabeçalho personalizado.');
  } else {
    out.push('Formato não reconhecido. Esperamos uma planilha do VMPay com cabeçalho "Operador" + "CNPJ Operador".');
  }

  // Adiciona preview das primeiras 3 linhas
  const previewRows = peek.slice(0, 3).map((r, i) => {
    const cells = (r as unknown[])
      .slice(0, 6)
      .map(c => {
        const v = String(c ?? '').trim();
        return v.length > 25 ? v.slice(0, 25) + '…' : v;
      })
      .filter(Boolean)
      .join(' | ');
    return `Linha ${i + 1}: ${cells || '(vazia)'}`;
  });
  if (previewRows.length > 0) {
    out.push('Conteúdo detectado nas primeiras linhas:');
    out.push(...previewRows);
  }

  if (sheetNames.length > 1) {
    out.push(`A planilha tem múltiplas abas (${sheetNames.join(', ')}). Apenas a primeira é lida.`);
  }

  return out;
}
