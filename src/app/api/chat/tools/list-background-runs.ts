import { listCommandRuns } from '@/lib/e2b-helpers'
import type { Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import z from 'zod'

export const createListBackgroundRunsTool = (sandbox: Sandbox) =>
  tool({
    description:
      'List recorded background runCommand executions (newest first). All background runs are collected here. Use runId with getCommandLogs.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Max number of runs to return'),
    }),
    execute: async ({ limit }) => {
      const runs = await listCommandRuns({ sandbox })
      const sliced = typeof limit === 'number' ? runs.slice(0, limit) : runs
      return { runs: sliced }
    },
  })

