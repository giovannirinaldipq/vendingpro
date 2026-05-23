# Lê .env.local e seta cada variável em production na Vercel.
# Uso: pwsh ./scripts/setup-vercel-env.ps1
# Requer: vercel CLI logada (vercel whoami)
# Requer: .vercel/project.json (já criado)

$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "ERRO: .env.local não encontrado em $envFile" -ForegroundColor Red
    exit 1
}

# Vars sensíveis (Service Role, Cron Secret, Asaas, Twilio)
$sensitive = @(
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
    "RESEND_API_KEY",
    "ASAAS_API_KEY",
    "ASAAS_WEBHOOK_TOKEN",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN"
)

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    if ($line -notmatch "^([A-Z0-9_]+)=(.*)$") { return }

    $name = $Matches[1]
    $value = $Matches[2].Trim('"').Trim("'")

    if ($value -eq "" -or $value -like "your_*" -or $value -like "*_xxxx*") {
        Write-Host "PULANDO $name (vazio ou placeholder)" -ForegroundColor Yellow
        return
    }

    $args = @("env", "add", $name, "production", "--value", $value, "--force", "--yes")
    if ($sensitive -contains $name) { $args += "--sensitive" }

    Write-Host "Setando $name ..." -ForegroundColor Cyan
    & vercel @args 2>&1 | Select-Object -Last 1
}

Write-Host ""
Write-Host "Pronto. Triggerando redeploy do projeto..." -ForegroundColor Green
& vercel --prod --yes 2>&1 | Select-Object -Last 3
