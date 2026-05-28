/**
 * Script de teste para funcionalidade de visitas do reabastecedor
 *
 * Como usar:
 * 1. Cadastre um reabastecedor (com email)
 * 2. Envie convite (gerará acesso)
 * 3. Acesse /r/visitas com o link enviado
 * 4. Teste fluxo completo:
 *    - Login mágico
 *    - Lista de máquinas atribuídas
 *    - Registrar visita (antes/depois fotos)
 *    - Upload de relatório
 *    - Sincronização offline
 */

// Simula ambiente de teste
const TEST_CONFIG = {
  // Substitua pelos valores reais do seu tenant
  tenantId: 'seu-tenant-id-aqui',
  reabasterId: 'id-do-reabastecedor-teste',
  machineIds: ['id-maquina-1', 'id-maquina-2'],

  // URLs do ambiente
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
}

// Funções de teste
async function testRestockerAccess() {
  console.log('🧪 Testando acesso do reabastecedor...');

  try {
    // 1. Testar login via magic link
    const response = await fetch(`${TEST_CONFIG.appUrl}/api/auth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'magiclink',
        email: 'test@reabastecedor.com',
        token: 'token-magico-de-teste',
      })
    });

    if (!response.ok) {
      throw new Error('Falha no login mágico');
    }

    console.log('✅ Login mágico funcionou');

    // 2. Testar carregamento de máquinas
    const machinesResponse = await fetch(`${TEST_CONFIG.appUrl}/api/app/restockers/${TEST_CONFIG.reabasterId}/machines`, {
      headers: { 'Authorization': `Bearer token-de-teste` }
    });

    if (!machinesResponse.ok) {
      throw new Error('Falha ao carregar máquinas');
    }

    const machinesData = await machinesResponse.json();
    console.log('✅ Máquinas carregadas:', machinesData.data.length);

    // 3. Testar registro de visita
    const visitData = {
      machine_id: TEST_CONFIG.machineIds[0],
      status: 'completed',
      photos_before: ['data:image/jpeg;base64,...'],
      photos_after: ['data:image/jpeg;base64,...'],
      notes: 'Teste de visita',
      inventory_adjustments: [
        { product_id: 'prod-1', new_quantity: 10, adjustment_type: 'restock' }
      ]
    };

    const visitResponse = await fetch(`${TEST_CONFIG.appUrl}/api/app/visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer token-de-teste`
      },
      body: JSON.stringify(visitData)
    });

    if (!visitResponse.ok) {
      throw new Error('Falha ao registrar visita');
    }

    console.log('✅ Visita registrada com sucesso');

  } catch (error) {
    console.error('❌ Teste falhou:', error);
  }
}

// Rodar testes
if (process.env.NODE_ENV === 'test') {
  testRestockerAccess();
}

export default function TestVisitasPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Teste de Visitas de Reabastecedores</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Configuração de Teste</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm">{JSON.stringify(TEST_CONFIG, null, 2)}</pre>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Fluxo de Teste</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Cadastre um reabastecedor com email válido</li>
            <li>Clique em "Gerar Acesso" para enviar convite</li>
            <li>Acesse o link enviado por email</li>
            <li>Verifique se as máquinas aparecem na lista</li>
            <li>Clique em "Registrar Visita" em uma máquina</li>
            <li>Adicione fotos (antes/depois) e observações</li>
            <li>Salve a visita e verifique na dashboard</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Cenários de Teste</h2>
          <div className="grid gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">✅ Sucesso</h3>
              <p className="text-sm text-gray-600">Visita registrada com sucesso, fotos salvas, estoque atualizado</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">⚠️ Sem conexão</h3>
              <p className="text-sm text-gray-600">Registro offline, sincronização quando voltar online</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">❌ Erros</h3>
              <p className="text-sm text-gray-600">Sem internet, campos obrigatórios vazios, formato de foto inválido</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">APIs para Testar</h2>
          <div className="space-y-2 text-sm font-mono">
            <div><code>GET /api/app/restockers/[id]/machines</code> - Listar máquinas</div>
            <div><code>POST /api/app/visits</code> - Registrar visita</div>
            <div><code>GET /api/app/visits?machine_id=xxx</code> - Histórico de visitas</div>
            <div><code>GET /api/app/inventory/[machine_id]</code> - Ver estoque</div>
          </div>
        </section>
      </div>
    </div>
  )
}