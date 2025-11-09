import { getPortUrl } from '@/lib/e2b-helpers'
import { prisma } from '@/server/db'
import type { Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import z from 'zod'

export const createPublishPortTool = (sandbox: Sandbox, sessionId: string) =>
  tool({
    description:
      'Publish a port to a public URL and save it to the database. Use this when you start a dev server and want to expose it.',
    inputSchema: z.object({
      port: z.number().describe('The port number to publish'),
      label: z
        .string()
        .optional()
        .describe(
          'A label for it, for example explain what is running behind it',
        ),
    }),
    execute: async ({ port, label }) => {
      const url = getPortUrl(sandbox, port)
      const host = sandbox.getHost(port)

      const publicUrl = await prisma.publicSandboxUrl.create({
        data: {
          agentSessionId: sessionId,
          port,
          url,
          label,
        },
      })

      return {
        url,
        host,
        port,
        id: publicUrl.id,
      }
    },
  })

