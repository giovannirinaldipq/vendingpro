import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePdf, type InvoicePdfData } from './invoice';

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return await renderToBuffer(<InvoicePdf data={data} />);
}
