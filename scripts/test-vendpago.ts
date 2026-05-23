// Teste local do parser VendPago.
// Uso: npx tsx scripts/test-vendpago.ts <caminho-do-csv>
//
// Imprime sumário e 3 primeiras vendas. Útil pra validar quando
// VendPago atualizar o formato do relatório.

import { readFileSync } from 'fs';
import { parseVendPagoFile } from '../src/lib/parsers/vendpago';

const path = process.argv[2];
if (!path) {
  console.error('Uso: npx tsx scripts/test-vendpago.ts <arquivo.csv>');
  process.exit(1);
}

const buf = readFileSync(path);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const result = parseVendPagoFile(ab as ArrayBuffer);

console.log('=== SUMMARY ===');
console.log(JSON.stringify(result.summary, null, 2));
if (result.errors.length > 0) {
  console.log('\n=== ERRORS ===');
  console.log(result.errors);
}
console.log('\n=== FIRST 3 SALES ===');
console.log(JSON.stringify(result.sales.slice(0, 3), null, 2));
console.log(`\nTotal: ${result.sales.length} vendas`);
