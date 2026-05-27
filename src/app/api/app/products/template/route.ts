import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const header = ['Nome', 'Categoria', 'Tamanho', 'Preco Venda (R$)', 'Preco Custo (R$)'];
  const example = ['Coca-Cola Lata', 'Refrigerantes', '350ml', '6.00', '3.50'];

  const ws = XLSX.utils.aoa_to_sheet([header, example]);
  ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="produtos-modelo.xlsx"',
    },
  });
}
