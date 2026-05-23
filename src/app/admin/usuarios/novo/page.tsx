'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ALL_ADMIN_ROLES, ROLE_LABELS, type AdminRole } from '@/lib/admin/roles';

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  role: z.enum(ALL_ADMIN_ROLES as [AdminRole, ...AdminRole[]]),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional().or(z.literal('')),
});
type Input = z.infer<typeof schema>;

export default function NovoUsuarioAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tempPwd, setTempPwd] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'support' },
  });
  const role = watch('role');

  async function onSubmit(data: Input) {
    setLoading(true);
    try {
      const payload = { ...data, password: data.password || undefined };
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Falha ao criar usuário');
        return;
      }
      toast.success('Usuário criado com sucesso');
      if (json.tempPassword) {
        setTempPwd(json.tempPassword);
      } else {
        router.push('/admin/usuarios');
      }
    } catch {
      toast.error('Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  if (tempPwd) {
    return (
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Usuário criado</CardTitle>
            <CardDescription>
              Compartilhe a senha temporária com a pessoa. Ela deverá trocá-la no primeiro acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 font-mono text-lg break-all">{tempPwd}</div>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/admin/usuarios')}>Voltar para lista</Button>
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(tempPwd).then(() => toast.success('Copiada!'))}>
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link href="/admin/usuarios" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Novo usuário do backoffice</CardTitle>
          <CardDescription>
            Crie acesso para alguém da equipe. Se você não definir uma senha, geramos uma temporária.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register('name')} disabled={loading} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} disabled={loading} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Permissão</Label>
              <Select value={role} onValueChange={v => setValue('role', v as AdminRole)} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ADMIN_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha (opcional)</Label>
              <Input id="password" type="password" placeholder="Deixe em branco para gerar uma" {...register('password')} disabled={loading} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Criar usuário'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
