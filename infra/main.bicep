targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the the environment which is used to generate a short unique hash used in all resources.')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Resource group name')
param resourceGroupName string = 'rg-${environmentName}'

// Generate unique resource token
var resourceToken = uniqueString(subscription().id, location, environmentName)

// Create resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: {
    'azd-env-name': environmentName
  }
}

// Deploy main resources to the resource group
module main 'main-resources.bicep' = {
  name: 'main-resources'
  scope: rg
  params: {
    environmentName: environmentName
    location: location
    resourceToken: resourceToken
  }
}

// Outputs
output RESOURCE_GROUP_ID string = rg.id
output AZURE_APP_SERVICE_ENDPOINT string = main.outputs.AZURE_APP_SERVICE_ENDPOINT
output AZURE_APP_SERVICE_NAME string = main.outputs.AZURE_APP_SERVICE_NAME