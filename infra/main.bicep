// Azure Container Apps deployment for Awale multiplayer server
// Region: parameterized (default francecentral)
// This template creates:
// - Resource Group scope assumed external
// - Azure Container Registry
// - Log Analytics Workspace + Container Apps Environment
// - Container App for WebSocket server (image reference passed in, NOT built here)
// Key decisions:
// - Let caller supply existing image tag for immutable deploy
// - Minimal scaling (0-3 replicas) with external ingress
// - ALLOWED_ORIGIN required to lock websocket origin

@description('Azure region for deployment')
param location string = 'francecentral'

@description('Container Registry name (must be globally unique, 5-50 alphanumerics)')
param acrName string

@description('Container image (e.g. acrname.azurecr.io/awale-server:v0.1.0)')
param serverImage string

@description('Frontend origin allowed for WebSocket connections (e.g. https://kayasax.github.io)')
param allowedOrigin string

@description('Burst token bucket size for rate limiting')
@minValue(1)
param rateLimitBurst int = 20

@description('Refill interval ms for token bucket')
@minValue(100)
param rateLimitRefillMs int = 1000

@description('Minutes until stale fully disconnected game cleanup')
param staleDisconnectMinutes int = 5

@description('Max game age hours before purge')
param maxGameAgeHours int = 1

@description('Min replicas for container app')
@minValue(0)
param minReplicas int = 0

@description('Max replicas for container app')
@minValue(1)
param maxReplicas int = 3

@description('Container App name')
param appName string = 'awale-server'

@description('Log Analytics workspace name')
param logName string = 'awale-logs'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: true
    policies: {
      quarantinePolicy: { status: 'disabled' }
      retentionPolicy: { days: 7, status: 'disabled' }
      trustPolicy: { status: 'disabled' }
    }
  }
}

resource law 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logName
  location: location
  properties: {
    retentionInDays: 30
    features: { searchVersion: 2 }
  }
  sku: { name: 'PerGB2018' }
}

resource caEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${appName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: law.properties.customerId
        sharedKey: listKeys(law.id, law.apiVersion).primarySharedKey
      }
    }
  }
}

var staleMs = staleDisconnectMinutes * 60000
var maxAgeMs = maxGameAgeHours * 3600000

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  properties: {
    managedEnvironmentId: caEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: listCredentials(acr.id, acr.apiVersion).username
          passwordSecretRef: 'acr-pw'
        }
      ]
      secrets: [
        {
          name: 'acr-pw'
          value: listCredentials(acr.id, acr.apiVersion).passwords[0].value
        }
      ]
      activeRevisionsMode: 'single'
  dapr: { enabled: false }
    }
    template: {
      containers: [
        {
          image: serverImage
          name: 'server'
          env: [{ name: 'ALLOWED_ORIGIN', value: allowedOrigin }, { name: 'RATE_LIMIT_BURST', value: string(rateLimitBurst) }, { name: 'RATE_LIMIT_REFILL_MS', value: string(rateLimitRefillMs) }, { name: 'STALE_DISCONNECT_MS', value: string(staleMs) }, { name: 'MAX_GAME_AGE_MS', value: string(maxAgeMs) }]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [] // future KEDA rules (HTTP/connections) can be added here
      }
    }
  }
}

output containerAppFqdn string = app.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
