import { runRepoCommand } from '@/lib/e2b-helpers'
import type { Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import z from 'zod'

export const createRunCommandTool = (sandbox: Sandbox) =>
  tool({
    description:
      'Run a shell command in the repository directory. Use for installs/builds/tests. For long-running processes use background: true. When background is true, logs are persisted and retrievable via listBackgroundRuns + getCommandLogs.',
    inputSchema: z.object({
      command: z
        .string()
        .describe('The command to run (e.g., "npm run build")'),
      args: z
        .array(z.string())
        .optional()
        .describe("Command arguments (if command doesn't include them)"),
      timeoutMs: z
        .number()
        .optional()
        .describe('Timeout in milliseconds (default: 120000)'),
      background: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Run command in background (for dev servers, long-running processes)',
        ),
      captureInitialOutputMs: z
        .number()
        .optional()
        .describe(
          'When running in background, capture stdout/stderr for this many milliseconds before backgrounding (default: 3000). For exampel if you start a dev server and want to see the initial output you can activate this.',
        ),
    }),
    execute: async ({
      command,
      args,
      timeoutMs,
      background,
      captureInitialOutputMs,
    }) => {
      const result = await runRepoCommand({
        sandbox,
        cmd: command,
        args,
        timeoutMs,
        background,
        captureInitialOutputMs,
      })
      type CommandResult = {
        exitCode?: number
        stdout?: string
        stderr?: string
        runId?: string
      }
      const typedResult = result as CommandResult
      return {
        exitCode: typedResult.exitCode,
        stdout: typedResult.stdout,
        stderr: typedResult.stderr,
        background,
        runId: typedResult.runId,
      }
    },
  })

