// Script para criar usuário admin inicial
// Execute com: npx ts-node scripts/create-admin.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Uso: npx ts-node scripts/create-admin.ts <email> <senha>');
    process.exit(1);
  }

  console.log(`Criando usuário admin: ${email}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('Erro ao criar usuário:', error.message);
    process.exit(1);
  }

  console.log('Usuário criado com sucesso!');
  console.log('ID:', data.user.id);
  console.log('Email:', data.user.email);
  console.log('\nAgora você pode fazer login em: https://vendingpro.vercel.app/login');
}

createAdmin();
