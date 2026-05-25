import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  brand: { fontSize: 22, fontWeight: 700, color: '#0f172a' },
  brandSub: { fontSize: 9, color: '#64748b', marginTop: 2 },
  invMeta: { textAlign: 'right' },
  invMetaLabel: { fontSize: 9, color: '#64748b' },
  invMetaValue: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#64748b' },
  value: { color: '#111827' },
  table: { marginTop: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6 },
  thead: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  th: { fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  trow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  totals: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 220, marginBottom: 4 },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', width: 220, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#0f172a' },
  grandTotalLabel: { fontSize: 11, fontWeight: 700, color: '#0f172a' },
  grandTotalValue: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  payBox: { marginTop: 24, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8 },
  payTitle: { fontSize: 10, fontWeight: 700, color: '#0f172a', marginBottom: 6 },
  payCode: { fontSize: 8, color: '#475569', fontFamily: 'Courier' },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', fontSize: 8, color: '#94a3b8', textAlign: 'center' },
});

export interface InvoicePdfData {
  invoice_number: string;
  reference_month: string;
  due_date: string;
  total: number;
  subtotal: number;
  discount: number;
  machines_count: number;
  price_per_machine: number;
  status: string;
  paid_at?: string | null;
  gateway_boleto_url?: string | null;
  gateway_pix_code?: string | null;
  tenant: {
    company_name: string;
    trade_name?: string | null;
    document_type?: string | null;
    document_number: string;
    contact_email: string;
    address_street?: string | null;
    address_number?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_zipcode?: string | null;
  };
  plan_name?: string;
}

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');
  const formatRefMonth = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };
  const doc = data.tenant.document_type === 'cnpj' ? 'CNPJ' : 'CPF';
  const status = data.status === 'paid' ? 'PAGA' : data.status === 'overdue' ? 'EM ATRASO' : data.status === 'cancelled' ? 'CANCELADA' : 'A PAGAR';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>VendingPro</Text>
            <Text style={styles.brandSub}>Gestão inteligente para vending machines</Text>
          </View>
          <View style={styles.invMeta}>
            <Text style={styles.invMetaLabel}>FATURA</Text>
            <Text style={styles.invMetaValue}>{data.invoice_number}</Text>
            <Text style={[styles.brandSub, { marginTop: 6 }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text style={[styles.value, { fontWeight: 700, marginBottom: 2 }]}>{data.tenant.company_name}</Text>
          {data.tenant.trade_name ? <Text style={styles.label}>{data.tenant.trade_name}</Text> : null}
          <Text style={styles.label}>{doc}: {data.tenant.document_number}</Text>
          <Text style={styles.label}>{data.tenant.contact_email}</Text>
          {data.tenant.address_street ? (
            <Text style={[styles.label, { marginTop: 4 }]}>
              {data.tenant.address_street}{data.tenant.address_number ? `, ${data.tenant.address_number}` : ''}
              {data.tenant.address_city ? ` — ${data.tenant.address_city}/${data.tenant.address_state}` : ''}
              {data.tenant.address_zipcode ? ` — CEP ${data.tenant.address_zipcode}` : ''}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes da cobrança</Text>
          <View style={styles.row}><Text style={styles.label}>Mês de referência</Text><Text style={styles.value}>{formatRefMonth(data.reference_month)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Vencimento</Text><Text style={styles.value}>{formatDate(data.due_date)}</Text></View>
          {data.plan_name ? <View style={styles.row}><Text style={styles.label}>Plano contratado</Text><Text style={styles.value}>{data.plan_name}</Text></View> : null}
          {data.paid_at ? <View style={styles.row}><Text style={styles.label}>Pago em</Text><Text style={styles.value}>{formatDate(data.paid_at)}</Text></View> : null}
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { flex: 4 }]}>Descrição</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Qtde</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Unitário</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
          </View>
          <View style={styles.trow}>
            <Text style={[styles.value, { flex: 4 }]}>Assinatura mensal — {data.plan_name || 'plano contratado'}</Text>
            <Text style={[styles.value, { flex: 1, textAlign: 'right' }]}>{data.machines_count}</Text>
            <Text style={[styles.value, { flex: 1.5, textAlign: 'right' }]}>{formatBRL(data.price_per_machine)}</Text>
            <Text style={[styles.value, { flex: 1.5, textAlign: 'right' }]}>{formatBRL(data.machines_count * data.price_per_machine)}</Text>
          </View>
          {data.subtotal !== data.machines_count * data.price_per_machine ? (
            <View style={styles.trow}>
              <Text style={[styles.label, { flex: 4 }]}>Valor mínimo do plano aplicado</Text>
              <Text style={[styles.value, { flex: 4, textAlign: 'right' }]}>{formatBRL(data.subtotal)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>{formatBRL(data.subtotal)}</Text></View>
          {data.discount > 0 ? <View style={styles.totalRow}><Text style={styles.label}>Desconto</Text><Text style={styles.value}>- {formatBRL(data.discount)}</Text></View> : null}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatBRL(data.total)}</Text>
          </View>
        </View>

        {(data.gateway_boleto_url || data.gateway_pix_code) && data.status !== 'paid' ? (
          <View style={styles.payBox}>
            <Text style={styles.payTitle}>Como pagar</Text>
            {data.gateway_boleto_url ? <Text style={[styles.label, { marginBottom: 6 }]}>Boleto: {data.gateway_boleto_url}</Text> : null}
            {data.gateway_pix_code ? (
              <>
                <Text style={[styles.label, { marginBottom: 4 }]}>PIX copia e cola:</Text>
                <Text style={styles.payCode}>{data.gateway_pix_code}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.footer}>
          VendingPro · vendingpro.vercel.app · Dúvidas: suporte@vendingpro.com.br
        </Text>
      </Page>
    </Document>
  );
}
