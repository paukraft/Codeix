import { findFiles } from '@/lib/code-agent-helpers'
import type { Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import z from 'zod'

export const createFindFilesTool = (sandbox: Sandbox) =>
  tool({
    description:
      'Find files by name pattern in the repository. Use this to locate files like "package.json", "*.ts", etc.',
    inputSchema: z.object({
      pattern: z
        .string()
        .describe(
          'File name pattern to search for (supports wildcards like *.json)',
        ),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return'),
    }),
    execute: async ({ pattern, maxResults }) => {
      const results = await findFiles({
        sandbox,
        pattern,
        maxResults,
      })
      return {
        files: results,
        count: results.length,
      }
    },
  })

