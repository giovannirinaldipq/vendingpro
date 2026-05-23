'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle, TrendingDown, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  active: { label: 'Ativo', color: 'bg-green-100 text-green-700' },
  expiring_soon: { label: 'Vencendo', color: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Vencido', color: 'bg-red-100 text-red-700' },
  no_contract: { label: 'Sem contrato', color: 'bg-gray-100 text-gray-700' },
};

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ContractsPage() {
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
      <div>
        <h1 className="text-2xl font-bold">Contratos</h1>
        <p className="text-sm text-muted-foreground">Rentabilidade real por ponto comercial.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Total de pontos</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
        <Card className={expiringSoon > 0 ? 'border-amber-300' : ''}><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Clock className="h-3 w-3" />Vencendo / vencidos</CardDescription></CardHeader><CardContent><div className={`text-2xl font-bold ${expiringSoon > 0 ? 'text-amber-600' : ''}`}>{expiringSoon}</div></CardContent></Card>
        <Card className={losing > 0 ? 'border-red-300' : ''}><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><TrendingDown className="h-3 w-3" />Pontos no prejuízo</CardDescription></CardHeader><CardContent><div className={`text-2xl font-bold ${losing > 0 ? 'text-red-600' : ''}`}>{losing}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por ponto</CardTitle>
          <CardDescription>Resultado das máquinas − aluguel/comissão (últimos 30 dias)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />Nenhum local cadastrado.</div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.location_id} className={!r.is_profitable ? 'bg-red-50/40' : ''}>
                    <TableCell>
                      <Link href={`/app/locais`} className="font-medium hover:underline">{r.location_name}</Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS[r.status].color}>{STATUS[r.status].label}</Badge>
                      {r.contract_type && <div className="text-xs text-muted-foreground mt-1">{r.contract_type === 'rent' ? `Aluguel ${fmtBRL(r.contract_value ?? 0)}` : r.contract_type === 'commission' ? `${r.commission_percent}% comissão` : 'Comodato'}</div>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.contract_end_date ? (
                        <>
                          <div>{new Date(r.contract_end_date).toLocaleDateString('pt-BR')}</div>
                          {r.days_until_end != null && (
                            <div className={`text-xs ${r.days_until_end < 0 ? 'text-red-600' : r.days_until_end <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {r.days_until_end < 0 ? `${Math.abs(r.days_until_end)}d vencido` : `em ${r.days_until_end}d`}
                            </div>
                          )}
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">{r.machine_count}</TableCell>
                    <TableCell className="text-right">{fmtBRL(r.net_result_30d)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtBRL(r.rent_for_period)}</TableCell>
                    <TableCell className={`text-right font-semibold ${r.is_profitable ? 'text-green-700' : 'text-red-700'}`}>
                      {r.is_profitable ? <TrendingUp className="inline h-3 w-3 mr-1" /> : <TrendingDown className="inline h-3 w-3 mr-1" />}
                      {fmtBRL(r.rentability_30d)}
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
