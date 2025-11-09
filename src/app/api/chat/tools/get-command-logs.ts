import {
  getCommandLogs as fetchCommandLogs,
} from '@/lib/e2b-helpers'
import type { Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import z from 'zod'

export const createGetCommandLogsTool = (sandbox: Sandbox) =>
  tool({
    description:
      'Fetch logs for a background runCommand execution. Supports stdout/stderr/combined and time window. All output is persisted.',
    inputSchema: z.object({
      runId: z.string().describe('Run identifier returned by runCommand'),
      sinceSeconds: z
        .number()
        .optional()
        .describe('Only include lines from the last N seconds'),
      stream: z
        .enum(['stdout', 'stderr', 'combined'])
        .optional()
        .default('combined')
        .describe('Which stream to return'),
    }),
    execute: async ({ runId, sinceSeconds, stream }) => {
      const res = await fetchCommandLogs({
        sandbox,
        runId,
        sinceSeconds,
        stream,
      })
      return {
        runId,
        stream: stream ?? 'combined',
        count: res.entries.length,
        entries: res.entries,
        text: res.text,
      }
    },
  })

