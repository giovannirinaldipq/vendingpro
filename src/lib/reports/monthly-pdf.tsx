import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { MonthlyReportData } from './monthly-data';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  brand: { fontSize: 18, fontWeight: 700 },
  brandSub: { fontSize: 8, color: '#64748b', marginTop: 2 },
  rightLabel: { fontSize: 8, color: '#64748b', textAlign: 'right' },
  rightValue: { fontSize: 11, fontWeight: 700, textAlign: 'right' },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  section: { marginBottom: 12 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpi: { flex: 1, padding: 10, backgroundColor: '#f8fafc', borderRadius: 6 },
  kpiLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  kpiValue: { fontSize: 14, fontWeight: 700 },
  kpiSub: { fontSize: 8, color: '#64748b', marginTop: 2 },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, marginTop: 4 },
  thead: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  th: { fontSize: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase' },
  trow: { flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  td: { fontSize: 9 },
  good: { color: '#15803d' },
  bad: { color: '#b91c1c' },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 7, color: '#94a3b8', textAlign: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
});

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function MonthlyReportPdf({ data }: { data: MonthlyReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Relatório Mensal · {data.period_label}</Text>
            <Text style={styles.brandSub}>{data.tenant_name}</Text>
          </View>
          <View>
            <Text style={styles.rightLabel}>Resultado líquido</Text>
            <Text style={[styles.rightValue, data.totals.net_result >= 0 ? styles.good : styles.bad]}>
              {fmtBRL(data.totals.net_result)}
            </Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Receita bruta</Text>
            <Text style={styles.kpiValue}>{fmtBRL(data.totals.revenue)}</Text>
            <Text style={styles.kpiSub}>{data.totals.sales_count} vendas</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Custos totais</Text>
            <Text style={styles.kpiValue}>{fmtBRL(data.totals.fees + data.totals.cmv + data.totals.fixed_costs)}</Text>
            <Text style={styles.kpiSub}>Taxa {fmtBRL(data.totals.fees)} · CMV {fmtBRL(data.totals.cmv)} · Fixos {fmtBRL(data.totals.fixed_costs)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Visitas no mês</Text>
            <Text style={styles.kpiValue}>{data.visits_count}</Text>
            <Text style={styles.kpiSub}>{data.alerts.resolved_in_period} alertas resolvidos</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Alertas ativos</Text>
            <Text style={[styles.kpiValue, data.alerts.critical > 0 ? styles.bad : {}]}>{data.alerts.active}</Text>
            <Text style={styles.kpiSub}>{data.alerts.critical} críticos · {data.alerts.high} altos</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Top 5 máquinas por receita</Text>
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.th, { flex: 4 }]}>Máquina</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Vendas</Text>
              <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Receita</Text>
              <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Resultado</Text>
            </View>
            {data.top_machines.map((m, i) => (
              <View key={i} style={styles.trow}>
                <Text style={[styles.td, { flex: 4 }]}>{m.name}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{m.sales_count}</Text>
                <Text style={[styles.td, { flex: 2, textAlign: 'right' }]}>{fmtBRL(m.revenue)}</Text>
                <Text style={[styles.td, { flex: 2, textAlign: 'right' }, m.net_result >= 0 ? styles.good : styles.bad]}>{fmtBRL(m.net_result)}</Text>
              </View>
            ))}
          </View>
        </View>

        {data.bottom_machines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>Máquinas a investigar (menor receita)</Text>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={[styles.th, { flex: 4 }]}>Máquina</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Vendas</Text>
                <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Receita</Text>
                <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Resultado</Text>
              </View>
              {data.bottom_machines.map((m, i) => (
                <View key={i} style={styles.trow}>
                  <Text style={[styles.td, { flex: 4 }]}>{m.name}</Text>
                  <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{m.sales_count}</Text>
                  <Text style={[styles.td, { flex: 2, textAlign: 'right' }]}>{fmtBRL(m.revenue)}</Text>
                  <Text style={[styles.td, { flex: 2, textAlign: 'right' }, m.net_result >= 0 ? styles.good : styles.bad]}>{fmtBRL(m.net_result)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {data.top_products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>Top 10 produtos do mês</Text>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={[styles.th, { flex: 5 }]}>Produto</Text>
                <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Quantidade</Text>
                <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Receita</Text>
              </View>
              {data.top_products.map((p, i) => (
                <View key={i} style={styles.trow}>
                  <Text style={[styles.td, { flex: 5 }]}>{p.name}</Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: 'right' }]}>{p.quantity}</Text>
                  <Text style={[styles.td, { flex: 2, textAlign: 'right' }]}>{fmtBRL(p.revenue)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          Gerado em {new Date(data.generated_at).toLocaleString('pt-BR')} · VendingPro
        </Text>
      </Page>
    </Document>
  );
}

export async function renderMonthlyReportPdf(data: MonthlyReportData): Promise<Buffer> {
  return await renderToBuffer(<MonthlyReportPdf data={data} />);
}
