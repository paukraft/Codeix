import { readFileRange } from '@/lib/code-agent-helpers'
import type { Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import z from 'zod'

export const createReadFileTool = (sandbox: Sandbox) =>
  tool({
    description:
      'Read a file from the repository. Returns the file content within the specified line range.',
    inputSchema: z.object({
      filePath: z
        .string()
        .describe('Path to the file relative to the repository root'),
      fromLine: z.number().optional().describe('Start line number (1-indexed)'),
      toLine: z.number().optional().describe('End line number (1-indexed)'),
    }),
    execute: async ({ filePath, fromLine, toLine }) => {
      const result = await readFileRange({
        sandbox,
        filePathWithinRepo: filePath,
        fromLine,
        toLine,
      })
      return {
        content: result.content,
        startLine: result.startLine,
        endLine: result.endLine,
        totalLines: result.lines.length,
      }
    },
  })

