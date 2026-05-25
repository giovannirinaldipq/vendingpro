'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  FileSpreadsheet, Upload, CheckCircle, Loader2, AlertTriangle,
  Calendar, ArrowRight, ArrowLeft, Plus, Wand2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

type System = 'vmpay' | 'vendpago';
type Step = 'upload' | 'wizard' | 'done';

interface MachineRow {
  external_name: string;
  sales_count: number;
  mapped_machine_id: string | null;
  mapped_machine_name: string | null;
}

interface AvailableMachine { id: string; name: string; code: string; }

interface PreviewData {
  system: System;
  summary: {
    total_records: number;
    valid_records: number;
    skipped_records: number;
    total_revenue: number;
    date_range: { start: string; end: string };
    cnpj_operador?: string;
    periodo?: string;
    format?: 'sales_detailed' | 'cashless_aggregated';
    aggregated_transactions?: number;
  };
  machines: MachineRow[];
  available_machines: AvailableMachine[];
}

interface ConfirmResult {
  imported: number;
  duplicates?: number;
  total_in_file: number;
  aliases_saved: number;
  unmapped_machines: string[];
  date_range: { start: string; end: string };
  total_revenue: number;
  format?: 'sales_detailed' | 'cashless_aggregated';
  aggregated_transactions?: number;
}

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string) => s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [system, setSystem] = useState<System>('vmpay');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [parseErrors, setParseErrors] = useState<string[] | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f && /\.(xlsx|xls|csv)$/i.test(f.name)) setFile(f);
    else if (f) toast.error('Use .xlsx, .xls ou .csv');
  }, []);

  async function doPreview() {
    if (!file) return;
    setBusy(true);
    setParseErrors(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('system', system);
      const res = await fetch('/api/app/import/preview', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        const details = Array.isArray(json.details) ? json.details : [json.error ?? 'Falha ao processar arquivo'];
        setParseErrors(details);
        toast.error('Não foi possível processar a planilha — veja os detalhes abaixo', { duration: 5000 });
        return;
      }
      setPreview(json.data);
      const initial: Record<string, string> = {};
      for (const m of json.data.machines as MachineRow[]) {
        if (m.mapped_machine_id) initial[m.external_name] = m.mapped_machine_id;
      }
      setSelections(initial);
      setStep('wizard');
    } finally { setBusy(false); }
  }

  async function doConfirm() {
    if (!file || !preview) return;
    setBusy(true);
    try {
      const mappings = Object.entries(selections)
        .filter(([, machineId]) => !!machineId)
        .map(([external_name, machine_id]) => ({ external_name, machine_id }));

      const fd = new FormData();
      fd.append('file', file);
      fd.append('system', preview.system);
      fd.append('mappings', JSON.stringify(mappings));

      const res = await fetch('/api/app/import/confirm', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Falha ao importar');
        return;
      }
      setResult(json.data);
      setStep('done');
      const dup = json.data.duplicates ?? 0;
      if (json.data.imported === 0 && dup > 0) {
        toast.info(`Nenhuma venda nova — ${dup} já estavam importadas`, { duration: 5000 });
      } else if (dup > 0) {
        toast.success(`${json.data.imported} novas, ${dup} já existiam`, { duration: 5000 });
      } else {
        toast.success(`${json.data.imported} vendas importadas`);
      }
    } finally { setBusy(false); }
  }

  function reset() {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setSelections({});
    setResult(null);
    setParseErrors(null);
  }

  const mappedCount = preview ? preview.machines.filter(m => selections[m.external_name]).length : 0;
  const totalCount = preview?.machines.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Dados</h1>
        <p className="text-text-secondary">Importe vendas das suas planilhas de telemetria</p>
      </div>

      {step === 'upload' && (
        <div className="rounded-lg border border-info/30 bg-info-soft/40 p-4 text-sm flex gap-3">
          <Calendar className="h-5 w-5 text-info shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-text-primary">Como funciona o fluxo diário</p>
            <p className="text-xs text-text-secondary">
              Suba a planilha exportada do VMPay/Vendpago <strong>todo dia pela manhã</strong>,
              referente ao dia anterior. O sistema infere o consumo, atualiza o estoque, gera o
              picklist de reabastecimento e alimenta os relatórios. Sem upload diário, as métricas
              em tempo real ficam defasadas.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs">
        <StepDot active={step === 'upload'} done={step !== 'upload'}>1. Arquivo</StepDot>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <StepDot active={step === 'wizard'} done={step === 'done'}>2. Mapear máquinas</StepDot>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <StepDot active={step === 'done'}>3. Concluído</StepDot>
      </div>

      {step === 'upload' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sistema de telemetria</CardTitle>
              <CardDescription>Selecione a fonte da planilha</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={system} onValueChange={v => v && setSystem(v as System)}>
                <SelectTrigger className="w-full sm:w-[250px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vmpay">
                    <div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-info" />VM PAY (Excel)</div>
                  </SelectItem>
                  <SelectItem value="vendpago">
                    <div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-success" />VendPago (CSV)</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload</CardTitle>
              <CardDescription>Arraste ou clique para selecionar</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input" type="file" accept=".xlsx,.xls,.csv"
                  onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} className="hidden"
                />
                {file ? (
                  <>
                    <FileSpreadsheet className="h-12 w-12 text-primary" />
                    <p className="mt-4 text-sm font-medium">{file.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm font-medium">Arraste sua planilha aqui</p>
                    <p className="mt-1 text-xs text-muted-foreground">.xlsx, .xls, .csv</p>
                  </>
                )}
              </div>
              {file && (
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setFile(null); setParseErrors(null); }}>Trocar arquivo</Button>
                  <Button onClick={doPreview} disabled={busy}>
                    {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analisando...</> : <><Wand2 className="mr-2 h-4 w-4" />Pré-visualizar</>}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {parseErrors && parseErrors.length > 0 && (
            <Card className="border-danger/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-danger">
                  <AlertTriangle className="h-5 w-5" />
                  Não conseguimos ler esta planilha
                </CardTitle>
                <CardDescription>
                  Veja o diagnóstico abaixo e tente novamente após corrigir o arquivo ou trocar o sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {parseErrors.map((msg, i) => {
                    const isPreviewLine = /^Linha \d+:/.test(msg);
                    return (
                      <li
                        key={i}
                        className={isPreviewLine
                          ? 'pl-4 text-xs text-text-tertiary font-mono'
                          : 'flex gap-2 text-text-secondary'}
                      >
                        {!isPreviewLine && <span className="text-text-tertiary shrink-0">•</span>}
                        <span>{msg}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {step === 'wizard' && preview && (
        <>
          <Card className="border-info/30 bg-info-soft/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-info" />Confirme o que você está importando
              </CardTitle>
              <CardDescription>Esta é a &ldquo;prova real&rdquo; do arquivo. Confira antes de prosseguir.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <KpiInline label="Período do arquivo" value={`${fmtDate(preview.summary.date_range.start)} → ${fmtDate(preview.summary.date_range.end)}`} />
                {preview.summary.format === 'cashless_aggregated' ? (
                  <KpiInline
                    label="Dias agregados"
                    value={String(preview.summary.valid_records)}
                    sub={`${preview.summary.aggregated_transactions?.toLocaleString('pt-BR') ?? '—'} vendas no total`}
                  />
                ) : (
                  <KpiInline
                    label="Vendas no arquivo"
                    value={String(preview.summary.valid_records)}
                    sub={preview.summary.skipped_records > 0 ? `${preview.summary.skipped_records} linhas puladas` : undefined}
                  />
                )}
                <KpiInline label="Receita total" value={fmtBRL(preview.summary.total_revenue)} sub={preview.summary.cnpj_operador ? `CNPJ ${preview.summary.cnpj_operador}` : undefined} />
              </div>
              {preview.summary.format === 'cashless_aggregated' && (
                <div className="mt-3 rounded-lg border border-warning/30 bg-warning-soft/40 p-3 flex gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-text-secondary">
                    <p className="font-medium text-text-primary mb-0.5">Este arquivo é AGREGADO por dia (relatório cashless do VMPay).</p>
                    <p>Cada linha = total daquele dia naquela máquina, sem detalhe por produto.
                      Receita por dia, Mapa de Calor (diário) e Rankings funcionam normalmente.
                      <strong> Top Produtos vai aparecer como &quot;Vendas do dia (cashless agregado)&quot;.</strong>
                      Pra ter detalhe por produto, exporte o relatório de <em>Vendas</em> (não cashless) no portal VMPay.</p>
                  </div>
                </div>
              )}
              {preview.summary.periodo && (
                <p className="text-xs text-text-tertiary mt-3">📄 {preview.summary.periodo}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-brand-navy" />
                Mapear máquinas do arquivo às suas máquinas cadastradas
              </CardTitle>
              <CardDescription>
                Para cada máquina encontrada no arquivo, escolha a máquina correspondente do seu cadastro.
                Esse mapeamento fica salvo — próximas importações são automáticas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview.available_machines.length === 0 ? (
                <div className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm">
                  <p className="font-medium text-warning">Você ainda não tem máquinas cadastradas.</p>
                  <p className="text-text-secondary mt-1">Cadastre suas máquinas primeiro para conseguir importar vendas.</p>
                  <Link href="/app/maquinas/nova" className="inline-block mt-3">
                    <Button size="sm"><Plus className="mr-2 h-4 w-4" />Cadastrar primeira máquina</Button>
                  </Link>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Máquina no arquivo</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead>Sua máquina cadastrada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.machines.map(m => (
                      <TableRow key={m.external_name}>
                        <TableCell>
                          <div className="font-mono text-xs">{m.external_name}</div>
                          {m.mapped_machine_id && (
                            <Pill tone="success" size="sm" dot className="mt-1">
                              Mapeamento salvo
                            </Pill>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">{m.sales_count}</TableCell>
                        <TableCell>
                          <Select
                            value={selections[m.external_name] ?? ''}
                            onValueChange={v => {
                              if (v) setSelections(s => ({ ...s, [m.external_name]: v }));
                            }}
                          >
                            <SelectTrigger className="w-full max-w-[320px]">
                              <SelectValue placeholder="Selecione a máquina..." />
                            </SelectTrigger>
                            <SelectContent>
                              {preview.available_machines.map(am => (
                                <SelectItem key={am.id} value={am.id}>
                                  {am.name} <span className="text-text-tertiary text-xs ml-1">({am.code})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Link href="/app/maquinas/nova" target="_blank" className="text-xs text-brand-navy hover:underline mt-1 inline-block">
                            + Cadastrar nova máquina
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex items-center justify-between border-t border-border-default pt-4">
                <div className="text-sm text-text-secondary">
                  <span className="font-medium tabular-nums">{mappedCount}/{totalCount}</span> máquinas mapeadas
                  {mappedCount < totalCount && (
                    <span className="ml-2 text-warning">— vendas das não-mapeadas serão ignoradas</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('upload')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />Voltar
                  </Button>
                  <Button onClick={doConfirm} disabled={busy || mappedCount === 0}>
                    {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</> : <><CheckCircle className="mr-2 h-4 w-4" />Confirmar e importar</>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {step === 'done' && result && (
        <Card className={result.unmapped_machines.length > 0 ? 'border-warning/40' : 'border-success/40'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.unmapped_machines.length > 0 ? <AlertTriangle className="h-5 w-5 text-warning" /> : <CheckCircle className="h-5 w-5 text-success" />}
              Importação concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {result.format === 'cashless_aggregated' ? (
                <KpiInline
                  label="Dias importados"
                  value={String(result.imported)}
                  sub={result.aggregated_transactions
                    ? `${result.aggregated_transactions.toLocaleString('pt-BR')} vendas reais agregadas`
                    : (result.duplicates ? `${result.duplicates} dias já existiam` : undefined)}
                  variant="success"
                />
              ) : (
                <KpiInline
                  label="Vendas importadas"
                  value={String(result.imported)}
                  sub={result.duplicates ? `${result.duplicates} já existiam (ignoradas)` : undefined}
                  variant="success"
                />
              )}
              <KpiInline label="Período" value={`${fmtDate(result.date_range.start)} → ${fmtDate(result.date_range.end)}`} />
              <KpiInline label="Receita no arquivo" value={fmtBRL(result.total_revenue)} />
            </div>
            {result.imported === 0 && (result.duplicates ?? 0) > 0 && (
              <div className="rounded-lg border border-info/30 bg-info-soft/40 p-3 text-sm">
                <p className="font-medium text-text-primary">Esta planilha já foi importada antes.</p>
                <p className="text-xs text-text-secondary mt-1">
                  As {result.duplicates} linhas já existem no banco — nada de novo foi inserido.
                  Se você queria reimportar para corrigir valores, é preciso excluir os registros antigos antes.
                </p>
              </div>
            )}
            {result.aliases_saved > 0 && (
              <div className="text-sm text-text-secondary">✨ {result.aliases_saved} mapeamento(s) salvo(s) — próximas importações serão automáticas.</div>
            )}
            {result.unmapped_machines.length > 0 && (
              <div className="rounded-lg bg-warning-soft border border-warning/30 p-4">
                <p className="font-medium text-warning">Máquinas não mapeadas (vendas ignoradas)</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.unmapped_machines.map(n => (
                    <Pill key={n} tone="outline" size="sm">{n}</Pill>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={reset}><Upload className="mr-2 h-4 w-4" />Importar outro arquivo</Button>
              <Link href="/app/analytics"><Button variant="outline">Ver analytics<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepDot({ active, done, children }: { active?: boolean; done?: boolean; children: React.ReactNode }) {
  return (
    <span className={
      done ? 'px-2 py-1 rounded bg-success-soft text-success'
      : active ? 'px-2 py-1 rounded bg-brand-navy/10 text-brand-navy font-medium'
      : 'px-2 py-1 rounded bg-surface-subtle text-text-tertiary'
    }>
      {children}
    </span>
  );
}

function KpiInline({ label, value, sub, variant }: { label: string; value: string; sub?: string; variant?: 'success' }) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-3">
      <div className="text-[10px] text-text-tertiary uppercase tracking-[0.08em] font-semibold">{label}</div>
      <div className={`text-lg font-semibold mt-1 tabular-nums ${variant === 'success' ? 'text-success' : 'text-text-primary'}`}>{value}</div>
      {sub && <div className="text-xs text-text-tertiary mt-1">{sub}</div>}
    </div>
  );
}
