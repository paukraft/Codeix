import { defaultRepoPath } from '@/lib/e2b-helpers'
import type { Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import path from 'path'
import z from 'zod'

const shEscape = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`

export const createGrepTool = (sandbox: Sandbox) => {
  let ensureRipgrepPromise: Promise<void> | undefined
  let resolvedRgPath: string | undefined

  const resolveRgPath = async () => {
    console.log('[grep] resolveRgPath: running command -v rg')
    const check = await sandbox.commands.run('command -v rg', {
      cwd: '/home/user',
      timeoutMs: 5_000,
    })
    console.log('[grep] resolveRgPath: exit', check.exitCode)
    if (check.exitCode !== 0) {
      console.log('[grep] resolveRgPath: rg not found on PATH')
      return undefined
    }
    const candidate = check.stdout.trim().split('\n').pop()?.trim()
    console.log('[grep] resolveRgPath: candidate from PATH', candidate)
    if (!candidate) return undefined
    const verify = await sandbox.commands.run(`${candidate} --version`, {
      cwd: '/home/user',
      timeoutMs: 5_000,
    })
    console.log('[grep] resolveRgPath: verify exit', verify.exitCode)
    return verify.exitCode === 0 ? candidate : undefined
  }

  const ensureRipgrep = async () => {
    ensureRipgrepPromise ??= (async () => {
        console.log('[grep] verifying ripgrep availability...')
        let candidate = await resolveRgPath()
        if (!candidate) {
          console.log(
            '[grep] ripgrep missing, attempting installation via apt-get',
          )
          const install = await sandbox.commands.run(
            'sudo apt-get update && sudo apt-get install -y ripgrep',
            {
              cwd: '/home/user',
              timeoutMs: 300_000,
            },
          )
          console.log('[grep] ensureRipgrep: install exit', install.exitCode)
          if (install.exitCode !== 0) {
            throw new Error(
              `ripgrep is not available and automatic installation failed: ${
                install.stderr || install.stdout || 'unknown error'
              }. Rebuild the template to include ripgrep.`,
            )
          }
          candidate = await resolveRgPath()
          if (!candidate) {
            throw new Error(
              'ripgrep installation succeeded but the binary is still unavailable on PATH',
            )
          }
        }
        resolvedRgPath = candidate
        console.log('[grep] ripgrep ready at', candidate)
      })().catch((error) => {
        ensureRipgrepPromise = undefined
        console.error('[grep] ensureRipgrep: failed', error)
        throw error
      })
    await ensureRipgrepPromise
    if (!resolvedRgPath) {
      throw new Error('ripgrep path resolution failed unexpectedly')
    }
    return resolvedRgPath
  }

  return tool({
    description:
      'Search for text/code content inside files using regex patterns. NOT for finding files by name - use findFiles for that.',
    inputSchema: z.object({
      pattern: z
        .string()
        .describe('The regex pattern to search for in file contents'),
      path: z
        .string()
        .optional()
        .describe(
          'The directory to search in. Defaults to the current working directory.',
        ),
      include: z
        .string()
        .optional()
        .describe(
          'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")',
        ),
    }),
    execute: async ({ pattern, path: searchPath, include }) => {
      if (!pattern) {
        throw new Error('pattern is required')
      }

      const rgBinary = await ensureRipgrep()
      console.log('[grep] execute: using binary', rgBinary)

      const repoPath = searchPath
        ? path.join(defaultRepoPath, searchPath)
        : defaultRepoPath
      console.log('[grep] execute: repoPath', repoPath)

      const rawArgs = ['-nH', '--field-match-separator=|', '--regexp', pattern]
      if (include) {
        console.log('[grep] execute: include glob', include)
        rawArgs.push('--glob', include)
      }
      rawArgs.push('.')
      console.log('[grep] execute: args', rawArgs)

      const escapedArgs = rawArgs.map((arg) => shEscape(arg))
      const commandParts = [shEscape(rgBinary), ...escapedArgs]
      const cmd = commandParts.join(' ')
      console.log('[grep] execute: command', cmd)
      let result: Awaited<ReturnType<typeof sandbox.commands.run>>
      try {
        result = await sandbox.commands.run(cmd, {
          cwd: repoPath,
          timeoutMs: 120_000,
        })
      } catch (error) {
        console.error('[grep] execute: run threw', error)
        type ErrorWithResult = { result?: { exitCode?: number; stdout?: string; stderr?: string } }
        const exitResult = (error as ErrorWithResult)?.result
        if (exitResult) {
          console.error(
            '[grep] execute: error result exit',
            exitResult.exitCode,
            'stdout length',
            exitResult.stdout?.length ?? 0,
            'stderr length',
            exitResult.stderr?.length ?? 0,
          )
          if (exitResult.stdout) {
            console.error(
              '[grep] execute: error stdout preview',
              exitResult.stdout.slice(0, 500),
            )
          }
          if (exitResult.stderr) {
            console.error(
              '[grep] execute: error stderr preview',
              exitResult.stderr.slice(0, 500),
            )
          }
        }
        throw error
      }
      console.log('[grep] execute: raw exit', result.exitCode)
      const stdoutLength = result.stdout?.length ?? 0
      const stderrLength = result.stderr?.length ?? 0
      console.log('[grep] execute: stdout length', stdoutLength)
      if (stdoutLength > 0) {
        console.log(
          '[grep] execute: stdout preview',
          result.stdout?.slice(0, 500),
        )
      }
      console.log('[grep] execute: stderr length', stderrLength)
      if (stderrLength > 0) {
        console.log(
          '[grep] execute: stderr preview',
          result.stderr?.slice(0, 500),
        )
      }

      if (result.exitCode === 1) {
        console.log('[grep] execute: exit 1, no matches')
        return {
          title: pattern,
          metadata: { matches: 0, truncated: false },
          output: 'No files found',
        }
      }

      if (result.exitCode !== 0) {
        console.error('[grep] execute: non-zero exit', result.exitCode)
        const stderr = result.stderr?.trim()
        const fallback =
          result.stdout && result.stdout.trim().length > 0
            ? result.stdout.trim()
            : undefined
        const details = stderr ?? fallback ?? 'unknown error'
        throw new Error(`ripgrep failed (exit ${result.exitCode}): ${details}`)
      }

      const stdout = result.stdout?.trim() ?? ''
      const lines = stdout.length > 0 ? stdout.split('\n') : []
      const filePaths = new Set<string>()
      const matches: Array<{
        path: string
        modTime: number
        lineNum: number
        lineText: string
      }> = []

      for (const line of lines) {
        if (!line) continue

        const [filePath, lineNumStr, ...lineTextParts] = line.split('|')
        if (!filePath || !lineNumStr || lineTextParts.length === 0) continue

        const lineNum = parseInt(lineNumStr, 10)
        const lineText = lineTextParts.join('|')

        filePaths.add(filePath)
        matches.push({
          path: filePath,
          modTime: 0,
          lineNum,
          lineText,
        })
      }

      // Get modification times for all files at once
      if (filePaths.size > 0) {
        const tempFile = `/tmp/grep_files_${Date.now()}.txt`
        const fileList = Array.from(filePaths).join('\n')
        await sandbox.files.write(tempFile, fileList)

        const statCmd = `while IFS= read -r file; do
          if [ -f "$file" ]; then
            stat -c "%Y|%n" "$file" 2>/dev/null || echo "0|$file"
          fi
        done < ${shEscape(tempFile)}`
        const statResult = await sandbox.commands.run(statCmd, {
          cwd: repoPath,
          timeoutMs: 30_000,
        })

        // Clean up temp file
        await sandbox.commands
          .run(`rm -f ${shEscape(tempFile)}`, { cwd: repoPath })
          .catch(() => {
            // Ignore cleanup errors
          })

        const modTimeMap = new Map<string, number>()
        for (const statLine of statResult.stdout.trim().split('\n')) {
          if (!statLine) continue
          const [timestamp, filePath] = statLine.split('|')
          if (timestamp && filePath) {
            modTimeMap.set(filePath, parseInt(timestamp, 10) * 1000)
          }
        }

        for (const match of matches) {
          match.modTime = modTimeMap.get(match.path) ?? 0
        }
      }

      matches.sort((a, b) => b.modTime - a.modTime)

      const limit = 100
      const truncated = matches.length > limit
      const finalMatches = truncated ? matches.slice(0, limit) : matches

      if (finalMatches.length === 0) {
        return {
          title: pattern,
          metadata: { matches: 0, truncated: false },
          output: 'No files found',
        }
      }

      const outputLines = [`Found ${finalMatches.length} matches`]

      let currentFile = ''
      for (const match of finalMatches) {
        if (currentFile !== match.path) {
          if (currentFile !== '') {
            outputLines.push('')
          }
          currentFile = match.path
          outputLines.push(`${match.path}:`)
        }
        outputLines.push(`  Line ${match.lineNum}: ${match.lineText}`)
      }

      if (truncated) {
        outputLines.push('')
        outputLines.push(
          '(Results are truncated. Consider using a more specific path or pattern.)',
        )
      }

      return {
        title: pattern,
        metadata: {
          matches: finalMatches.length,
          truncated,
        },
        output: outputLines.join('\n'),
      }
    },
  })
}
