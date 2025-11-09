import { tool } from 'ai'
import z from 'zod'

export const createRefreshWebPreviewTool = () =>
  tool({
    description:
      'Refresh the web preview iframe. Use this after restarting a dev server or when changes need a hard reload (no hot reloading). Also useful to trigger error logs to surface after a fresh request/render.',
    inputSchema: z.object({
      reason: z
        .string()
        .optional()
        .describe(
          'Optional reason for the refresh (e.g., "restarted dev server")',
        ),
    }),
    // No execute function - client-side tool
  })

