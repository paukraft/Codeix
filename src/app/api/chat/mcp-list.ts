import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp'

export const createMCPClients = async () => {
  const context7MCPClient = await createMCPClient({
    transport: {
      type: 'http',
      url: 'https://mcp.context7.com/mcp',
    },
  })

  return {
    context7: context7MCPClient,
  }
}
