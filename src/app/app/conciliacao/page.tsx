'use client';

import { useState } from 'react';
import { Loader2, Upload, CheckCircle2, XCircle, AlertCircle, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface MatchResult {
  bank_row: { date: string; description: string; amount: number };
  matched_payment_id: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
}

interface MatchResponse {
  matches: MatchResult[];
  stats: { total_rows: number; matched_high: number; matched_medium: number; matched_low: number; unmatched: number; outflows: number };
  parse_warnings: string[];
}

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const CONF_TONE: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  high: 'success',
  medium: 'info',
  low: 'warning',
  none: 'neutral',
};
const CONF_LABEL: Record<string, string> = { high: 'Alto', medium: 'Médio', low: 'Baixo', none: '—' };

export default function ConciliacaoPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MatchResponse | null>(null);

  async function handleUpload(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/app/conciliacao/match', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Falha ao processar');
        return;
      }
      setResult(json.data);
      toast.success(`${json.data.stats.total_rows} linhas processadas`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conciliação bancária</h1>
        <p className="text-sm text-text-secondary">Suba o extrato bancário e veja quais entradas batem com seus pagamentos registrados.</p>
      </div>

      <div className="rounded-lg border border-info/30 bg-info-soft/40 p-4 text-sm flex gap-3">
        <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-text-primary">O que entra aqui (e o que não entra)</p>
          <p className="text-xs text-text-secondary">
            Esta tela cruza o <strong>extrato do seu banco</strong> com os pagamentos
            cadastrados no sistema (faturas, comissões, recebíveis) — agregado, não por
            máquina. Vendas das máquinas continuam sendo importadas em
            <strong> Dados → Importar</strong>; aqui é só conferência de caixa.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload do extrato</CardTitle>
          <CardDescription>CSV com colunas Data, Descrição/Histórico, Valor (ou Crédito/Débito). Formatos BR e US aceitos.</CardDescription>
        </CardHeader>
        <CardContent>
          <label htmlFor="csv" className="block">
            <div className="rounded-lg border-2 border-dashed border-border-default p-12 flex flex-col items-center justify-center text-sm cursor-pointer hover:bg-surface-subtle hover:border-border-strong transition-colors">
              <Upload className="h-10 w-10 mb-3 text-text-tertiary" />
              <span className="font-medium">Clique para selecionar CSV</span>
              <span className="text-xs text-text-tertiary mt-1">ou arraste e solte aqui</span>
            </div>
          </label>
          <input id="csv" type="file" accept=".csv,text/csv" className="hidden" disabled={busy} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          {busy && <div className="flex items-center justify-center mt-4 text-sm text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</div>}
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <KpiCard label="Linhas" value={result.stats.total_rows} />
            <KpiCard label="Match alto" value={result.stats.matched_high} color="text-success" />
            <KpiCard label="Match médio/baixo" value={result.stats.matched_medium + result.stats.matched_low} color="text-warning" />
            <KpiCard label="Sem correspondência" value={result.stats.unmatched} color="text-danger" />
            <KpiCard label="Saídas (ignoradas)" value={result.stats.outflows} color="text-text-tertiary" />
          </div>

          {result.parse_warnings.length > 0 && (
            <Card className="border-warning/40">
              <CardContent className="pt-6 flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="text-text-secondary">{result.parse_warnings.join('. ')}</div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Lançamentos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Detalhe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.matches.map((m, i) => (
                    <TableRow key={i} className={m.confidence === 'none' && m.bank_row.amount > 0 ? 'bg-danger-soft/30' : ''}>
                      <TableCell className="text-sm tabular-nums">{new Date(m.bank_row.date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-sm">{m.bank_row.description}</TableCell>
                      <TableCell className={`text-right font-medium tabular-nums ${m.bank_row.amount > 0 ? 'text-success' : 'text-text-tertiary'}`}>{fmtBRL(m.bank_row.amount)}</TableCell>
                      <TableCell>
                        {m.matched_payment_id ? (
                          <Pill tone={CONF_TONE[m.confidence]} dot>
                            <CheckCircle2 className="h-3 w-3" />{CONF_LABEL[m.confidence]}
                          </Pill>
                        ) : m.bank_row.amount > 0 ? (
                          <Pill tone="danger" dot>
                            <XCircle className="h-3 w-3" />Sem match
                          </Pill>
                        ) : (
                          <Pill tone="neutral">Saída</Pill>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-text-tertiary">{m.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription>{label}</CardDescription></CardHeader>
      <CardContent><div className={`text-2xl font-bold ${color ?? ''}`}>{value}</div></CardContent>
    </Card>
  );
}
