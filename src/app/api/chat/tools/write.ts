import { defaultRepoPath } from '@/lib/e2b-helpers'
import type { Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import path from 'path'
import z from 'zod'

const joinSandboxPath = (repoPath: string, filePath: string) => {
  if (!filePath || filePath === '.') return repoPath
  if (filePath.startsWith('/')) return filePath
  const base = repoPath.endsWith('/') ? repoPath.slice(0, -1) : repoPath
  const rel = filePath.startsWith('/') ? filePath.slice(1) : filePath
  return `${base}/${rel}`
}

export const createWriteTool = (sandbox: Sandbox) =>
  tool({
    description:
      'Write content to a file. Creates the file if it does not exist, or overwrites it if it does. The file path can be absolute or relative to the repository root.',
    inputSchema: z.object({
      content: z.string().describe('The content to write to the file'),
      filePath: z
        .string()
        .describe(
          'The path to the file to write (absolute or relative to repository root)',
        ),
    }),
    execute: async ({ content, filePath }) => {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : joinSandboxPath(defaultRepoPath, filePath)

      // Ensure path is within repo directory for safety
      if (!fullPath.startsWith(defaultRepoPath)) {
        throw new Error(
          `File path must be within repository directory: ${defaultRepoPath}`,
        )
      }

      // Check if file exists
      let exists = false
      try {
        await sandbox.files.read(fullPath)
        exists = true
      } catch {
        // File doesn't exist, which is fine
        exists = false
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(fullPath)
      try {
        await sandbox.files.list(parentDir)
      } catch {
        // Directory doesn't exist, create it
        await sandbox.commands.run(`mkdir -p ${parentDir}`, {
          cwd: defaultRepoPath,
          timeoutMs: 10_000,
        })
      }

      // Write the file
      await sandbox.files.write(fullPath, content)

      // Get relative path for display
      const relativePath = path.relative(defaultRepoPath, fullPath)

      return {
        title: relativePath,
        metadata: {
          filepath: fullPath,
          exists,
        },
        output: exists
          ? `File overwritten: ${relativePath}`
          : `File created: ${relativePath}`,
      }
    },
  })

