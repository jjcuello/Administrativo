import { getAgentConfigStatus } from '@/lib/aiAgent/config'

export async function GET() {
  return Response.json({
    module: 'agente-hibrido',
    status: getAgentConfigStatus(),
    timestamp: new Date().toISOString(),
  })
}
