'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, TrendingDown, TrendingUp, Clock, Plus, Edit, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface ContractRow {
  location_id: string;
  location_name: string;
  contract_type: string | null;
  contract_value: number | null;
  commission_percent: number | null;
  contract_end_date: string | null;
  days_until_end: number | null;
  status: 'active' | 'expiring_soon' | 'expired' | 'no_contract';
  machine_count: number;
  net_result_30d: number;
  rent_for_period: number;
  rentability_30d: number;
  is_profitable: boolean;
}

const STATUS: Record<string, { label: string; color: string }> = {
  active:        { label: 'Ativo',       color: 'bg-success-soft text-success' },
  expiring_soon: { label: 'Vencendo',    color: 'bg-warning-soft text-warning' },
  expired:       { label: 'Vencido',     color: 'bg-danger-soft text-danger' },
  no_contract:   { label: 'Sem contrato',color: 'bg-surface-subtle text-text-tertiary' },
};

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ContractsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/app/contracts')
      .then(r => r.json())
      .then(j => setRows(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const losing = rows.filter(r => !r.is_profitable).length;
  const expiringSoon = rows.filter(r => r.status === 'expiring_soon' || r.status === 'expired').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-sm text-text-secondary">
            Rentabilidade real por ponto comercial. Cada contrato é vinculado a um local.
          </p>
        </div>
        <Link href="/app/locais/novo" className="shrink-0">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo contrato (via local)
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
              Total de pontos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-3xl font-medium tabular-nums text-text-primary">{rows.length}</div>
          </CardContent>
        </Card>
        <Card className={expiringSoon > 0 ? 'border-warning/40' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary flex items-center gap-1">
              <Clock className="h-3 w-3" />Vencendo / vencidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`font-mono text-3xl font-medium tabular-nums ${expiringSoon > 0 ? 'text-warning' : 'text-text-primary'}`}>
              {expiringSoon}
            </div>
          </CardContent>
        </Card>
        <Card className={losing > 0 ? 'border-danger/40' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />Pontos no prejuízo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`font-mono text-3xl font-medium tabular-nums ${losing > 0 ? 'text-danger' : 'text-text-primary'}`}>
              {losing}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por ponto</CardTitle>
          <CardDescription>Resultado das máquinas − aluguel/comissão (últimos 30 dias)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-text-tertiary" /></div> : rows.length === 0 ? (
            <EmptyStateV2
              illustration="no-machines"
              title="Sem locais cadastrados"
              description="Cadastre seus pontos comerciais (locais) com tipo de contrato e valor pra ver a rentabilidade real de cada um."
              ctaLabel="Cadastrar primeiro local"
              ctaHref="/app/locais/novo"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ponto</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Máquinas</TableHead>
                  <TableHead className="text-right">Resultado das máquinas</TableHead>
                  <TableHead className="text-right">Aluguel/Comissão</TableHead>
                  <TableHead className="text-right">Rentabilidade</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow
                    key={r.location_id}
                    className={`cursor-pointer transition-colors hover:bg-surface-subtle/50 ${!r.is_profitable ? 'bg-danger-soft/30' : ''}`}
                    onClick={() => router.push(`/app/locais/${r.location_id}`)}
                  >
                    <TableCell>
                      <Link
                        href={`/app/locais/${r.location_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:text-brand-navy hover:underline"
                      >
                        {r.location_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS[r.status].color}>{STATUS[r.status].label}</Badge>
                      {r.contract_type && <div className="text-xs text-text-tertiary mt-1">{r.contract_type === 'rent' ? `Aluguel ${fmtBRL(r.contract_value ?? 0)}` : r.contract_type === 'commission' ? `${r.commission_percent}% comissão` : 'Comodato'}</div>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.contract_end_date ? (
                        <>
                          <div className="tabular-nums">{new Date(r.contract_end_date).toLocaleDateString('pt-BR')}</div>
                          {r.days_until_end != null && (
                            <div className={`text-xs tabular-nums ${r.days_until_end < 0 ? 'text-danger' : r.days_until_end <= 30 ? 'text-warning' : 'text-text-tertiary'}`}>
                              {r.days_until_end < 0 ? `${Math.abs(r.days_until_end)}d vencido` : `em ${r.days_until_end}d`}
                            </div>
                          )}
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{r.machine_count}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtBRL(r.net_result_30d)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-text-tertiary">{fmtBRL(r.rent_for_period)}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold tabular-nums ${r.is_profitable ? 'text-success' : 'text-danger'}`}>
                      {r.is_profitable ? <TrendingUp className="inline h-3 w-3 mr-1" /> : <TrendingDown className="inline h-3 w-3 mr-1" />}
                      {fmtBRL(r.rentability_30d)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/app/locais/${r.location_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-brand-navy hover:underline"
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                        <ArrowRight className="h-3 w-3 opacity-60" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
