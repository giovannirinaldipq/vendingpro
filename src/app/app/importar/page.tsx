'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ImportResult {
  imported: number;
  total_in_file: number;
  skipped: number;
  duplicates: number;
  unmapped_machines: string[];
  date_range: { start: string; end: string };
  total_revenue: number;
  machines_in_file: string[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [system, setSystem] = useState<string>('vmpay');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setResult(null);
      } else {
        toast.error('Formato de arquivo não suportado. Use .xlsx, .xls ou .csv');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('system', system);

      const response = await fetch('/api/app/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        toast.success(`${data.data.imported} vendas importadas com sucesso!`);
      } else {
        toast.error(data.error?.message || 'Erro ao importar arquivo');
      }
    } catch {
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Dados</h1>
        <p className="text-muted-foreground">
          Importe vendas das suas planilhas de telemetria
        </p>
      </div>

      {/* System Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Telemetria</CardTitle>
          <CardDescription>
            Selecione o sistema de onde a planilha foi exportada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={system} onValueChange={(v) => v && setSystem(v)}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vmpay">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                  VM PAY
                </div>
              </SelectItem>
              <SelectItem value="vendpago" disabled>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-500" />
                  VendPago (em breve)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Planilha</CardTitle>
          <CardDescription>
            Arraste um arquivo ou clique para selecionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <>
                <FileSpreadsheet className="h-12 w-12 text-primary" />
                <p className="mt-4 text-sm font-medium">{file.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm font-medium">
                  Arraste sua planilha aqui
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Formatos aceitos: .xlsx, .xls, .csv
                </p>
              </>
            )}
          </div>

          {file && (
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setFile(null); setResult(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={result.unmapped_machines.length > 0 ? 'border-yellow-200' : 'border-green-200'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.unmapped_machines.length > 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Importação Concluída
            </CardTitle>
            <CardDescription>
              Resumo da importação realizada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                <p className="text-sm text-green-600">Vendas importadas</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-2xl font-bold text-gray-700">{result.total_in_file}</p>
                <p className="text-sm text-gray-600">Total no arquivo</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-2xl font-bold text-blue-700">
                  R$ {result.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-blue-600">Receita total</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Período:</span>{' '}
                {result.date_range.start} a {result.date_range.end}
              </p>
              <p className="text-sm">
                <span className="font-medium">Máquinas no arquivo:</span>{' '}
                {result.machines_in_file.join(', ')}
              </p>
            </div>

            {result.unmapped_machines.length > 0 && (
              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="font-medium text-yellow-800">
                  Máquinas não cadastradas
                </p>
                <p className="mt-1 text-sm text-yellow-700">
                  As seguintes máquinas não foram encontradas no sistema. Cadastre-as para importar suas vendas:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.unmapped_machines.map((code) => (
                    <Badge key={code} variant="outline" className="bg-yellow-100">
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Supported Systems Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-500" />
              VM PAY
            </CardTitle>
            <CardDescription>
              Sistema de telemetria VM PAY
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Relatório de transações cashless
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Detecção automática de formato
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Mapeamento por código de máquina
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-500" />
              VendPago
            </CardTitle>
            <CardDescription>
              Sistema de telemetria VendPago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Em desenvolvimento
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Envie uma planilha de exemplo para habilitar
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
