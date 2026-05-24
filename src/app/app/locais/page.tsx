'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Loader2,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Location } from '@/types';

const locationTypeLabels: Record<string, string> = {
  school: 'Escola',
  company: 'Empresa',
  hospital: 'Hospital',
  gym: 'Academia',
  mall: 'Shopping',
  bus_station: 'Rodoviária',
  condominium: 'Condomínio',
  university: 'Universidade',
  other: 'Outro',
};

interface LocationsResponse {
  locations: Location[];
  total: number;
}

export default function LocationsPage() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LocationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/app/locations?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error?.message || 'Erro ao carregar locais');
      }
    } catch {
      toast.error('Erro ao carregar locais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(fetchLocations, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este local?')) return;

    try {
      const response = await fetch(`/api/app/locations/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        toast.success('Local excluído com sucesso');
        fetchLocations();
      } else {
        toast.error(result.error?.message || 'Erro ao excluir local');
      }
    } catch {
      toast.error('Erro ao excluir local');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locais</h1>
          <p className="text-muted-foreground">
            Gerencie os pontos onde suas máquinas estão instaladas
          </p>
        </div>
        <Link href="/app/locais/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Local
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Locais</CardTitle>
          <CardDescription>
            {loading ? 'Carregando...' : `${data?.total || 0} local(is) cadastrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.locations.length === 0 ? (
            <EmptyStateV2
              illustration="no-machines"
              title="Sem locais ainda"
              description="Locais (ponto comercial) é onde suas máquinas ficam. Cadastrar o local primeiro facilita a vida na hora de adicionar máquinas."
              ctaLabel="Cadastrar primeiro local"
              ctaHref="/app/locais/novo"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Local</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{location.name}</p>
                          <p className="text-xs text-muted-foreground">{location.contact_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {locationTypeLabels[location.location_type || 'other']}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {location.address_street}
                        {location.address_number && `, ${location.address_number}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {location.address_city} - {location.address_state}
                      </p>
                    </TableCell>
                    <TableCell>
                      {location.contract_type ? (
                        <Badge variant="secondary">
                          {location.contract_type === 'rent' ? 'Aluguel' :
                           location.contract_type === 'commission' ? 'Comissão' : 'Comodato'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(location.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
