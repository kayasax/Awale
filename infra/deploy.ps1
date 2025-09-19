param(
  [string]$ResourceGroup = 'awale-rg',
  [string]$Location = 'francecentral',
  [string]$AcrName = $("awaleacr" + (Get-Random -Max 9999)),
  [string]$ImageTag = $("v0.1.1-" + (Get-Date -Format 'yyyyMMdd-HHmmss')),
  [string]$AppName = 'awale-server',
  [string]$AllowedOrigin = 'https://kayasax.github.io'
)

$ErrorActionPreference = 'Stop'

Write-Host "==> Using Image Tag: $ImageTag" -ForegroundColor Cyan

Write-Host "==> Creating resource group $ResourceGroup in $Location" -ForegroundColor Cyan
az group create -n $ResourceGroup -l $Location | Out-Null

if (-not (az acr show -n $AcrName -g $ResourceGroup 2>$null)) {
  Write-Host "==> Creating ACR $AcrName" -ForegroundColor Cyan
  az acr create -n $AcrName -g $ResourceGroup --sku Basic --admin-enabled true | Out-Null
} else {
  Write-Host "==> Reusing existing ACR $AcrName" -ForegroundColor Yellow
}

$loginServer = (az acr show -n $AcrName --query loginServer -o tsv)

Write-Host "==> Attempting local Docker build $loginServer/awale-server:$ImageTag" -ForegroundColor Cyan
$dockerOk = $false
try {
  docker info 2>$null | Out-Null
  Write-Host "==> Logging into ACR $AcrName" -ForegroundColor Cyan
  az acr login -n $AcrName | Out-Null
  docker build -t "$loginServer/awale-server:$ImageTag" -f packages/server/Dockerfile . || throw "Local docker build failed"
  docker run --rm "$loginServer/awale-server:$ImageTag" ls dist 2>$null | Out-Null
  docker push "$loginServer/awale-server:$ImageTag" || throw "Image push failed"
  $dockerOk = $true
} catch {
  Write-Host "Local build failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

if (-not $dockerOk) {
  Write-Host "==> Falling back to ACR Cloud Build (logs follow)" -ForegroundColor Yellow
  az acr build -r $AcrName -t "awale-server:$ImageTag" -f packages/server/Dockerfile .
}

Write-Host "==> Registering Microsoft.App provider (if needed)" -ForegroundColor Cyan
az provider register -n Microsoft.App --wait | Out-Null

Write-Host "==> Ensuring Container Apps extension installed" -ForegroundColor Cyan
az extension add --name containerapp --upgrade | Out-Null

Write-Host "==> Deploying Bicep (Container Apps env + app)" -ForegroundColor Cyan
Write-Host "==> Validating Bicep (what-if)" -ForegroundColor Cyan
az deployment group what-if -g $ResourceGroup --template-file infra/main.bicep --parameters acrName=$AcrName serverImage="$loginServer/awale-server:$ImageTag" allowedOrigin=$AllowedOrigin appName=$AppName location=$Location

Write-Host "==> Deploying Bicep (Container Apps env + app)" -ForegroundColor Cyan
az deployment group create -g $ResourceGroup --template-file infra/main.bicep --parameters acrName=$AcrName serverImage="$loginServer/awale-server:$ImageTag" allowedOrigin=$AllowedOrigin appName=$AppName location=$Location | Out-Null

$fqdn = az containerapp show -n $AppName -g $ResourceGroup --query properties.configuration.ingress.fqdn -o tsv
Write-Host "==> Deployed FQDN: $fqdn" -ForegroundColor Green
Write-Host "Set VITE_AWALE_SERVER_WS=wss://$fqdn/ws before building the frontend." -ForegroundColor Yellow
