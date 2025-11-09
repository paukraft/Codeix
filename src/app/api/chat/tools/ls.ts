import { defaultRepoPath } from '@/lib/e2b-helpers'
import { FileType, type Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import path from 'path'
import z from 'zod'

const IGNORE_PATTERNS = [
  'node_modules',
  '__pycache__',
  '.git',
  'dist',
  'build',
  'target',
  'vendor',
  'bin',
  'obj',
  '.idea',
  '.vscode',
  '.zig-cache',
  'zig-out',
  '.coverage',
  'coverage',
  'tmp',
  'temp',
  '.cache',
  'cache',
  'logs',
  '.venv',
  'venv',
  'env',
  '.next',
  '.turbo',
]

const LIMIT = 100

const shouldIgnore = (name: string, ignorePatterns: Set<string>): boolean => {
  if (ignorePatterns.has(name)) return true
  for (const pattern of ignorePatterns) {
    if (name.includes(pattern)) return true
  }
  return false
}

const listFilesRecursive = async (
  sandbox: Sandbox,
  dir: string,
  ignore: Set<string>,
  maxFiles: number,
): Promise<{ files: string[]; dirs: Set<string> }> => {
  const files: string[] = []
  const dirs = new Set<string>()
  const stack: Array<{ path: string; relativePath: string }> = [
    { path: dir, relativePath: '.' },
  ]

  while (stack.length > 0 && files.length < maxFiles) {
    const { path: currentPath, relativePath } = stack.pop()!

    let entries: Awaited<ReturnType<typeof sandbox.files.list>>
    try {
      entries = await sandbox.files.list(currentPath)
    } catch {
      continue
    }

    for (const entry of entries) {
      type FileEntry = { name?: string; path: string; type: FileType }
      const fileEntry = entry as FileEntry
      const name = fileEntry.name ?? path.basename(fileEntry.path)
      if (shouldIgnore(name, ignore)) continue

      const entryType = fileEntry.type
      const entryPath = fileEntry.path
      const relativeEntryPath =
        relativePath === '.' ? name : `${relativePath}/${name}`

      if (entryType === FileType.DIR) {
        dirs.add(relativeEntryPath)
        if (files.length < maxFiles) {
          stack.push({ path: entryPath, relativePath: relativeEntryPath })
        }
      } else if (entryType === FileType.FILE) {
        if (files.length < maxFiles) {
          files.push(relativeEntryPath)
        }
      }
    }
  }

  return { files, dirs }
}

const renderDir = (
  dirPath: string,
  depth: number,
  dirs: Set<string>,
  filesByDir: Map<string, string[]>,
): string => {
  const indent = '  '.repeat(depth)
  let output = ''

  if (depth > 0) {
    output += `${indent}${path.basename(dirPath)}/\n`
  }

  const childIndent = '  '.repeat(depth + 1)
  const children = Array.from(dirs)
    .filter((d) => {
      const parent = path.dirname(d)
      return parent === dirPath && d !== dirPath
    })
    .sort()

  for (const child of children) {
    output += renderDir(child, depth + 1, dirs, filesByDir)
  }

  const files = filesByDir.get(dirPath) ?? []
  for (const file of files.sort()) {
    output += `${childIndent}${path.basename(file)}\n`
  }

  return output
}

export const createLsTool = (sandbox: Sandbox) =>
  tool({
    description:
      'List files and directories in a tree structure. Shows directory structure with indentation. Useful for exploring the repository layout.',
    inputSchema: z.object({
      path: z
        .string()
        .optional()
        .describe(
          'Path to the directory to list (relative to repository root, defaults to ".")',
        ),
      ignore: z
        .array(z.string())
        .optional()
        .describe('Additional glob patterns to ignore'),
      maxFiles: z
        .number()
        .optional()
        .default(LIMIT)
        .describe('Maximum number of files to list'),
    }),
    execute: async ({ path: dirPath, ignore, maxFiles = LIMIT }) => {
      const repoPath = defaultRepoPath
      const searchPath = dirPath ? path.join(repoPath, dirPath) : repoPath

      const ignoreSet = new Set([...IGNORE_PATTERNS, ...(ignore ?? [])])

      const { files, dirs } = await listFilesRecursive(
        sandbox,
        searchPath,
        ignoreSet,
        maxFiles,
      )

      const filesByDir = new Map<string, string[]>()
      const allDirs = new Set<string>(['.'])

      for (const file of files) {
        const dir = path.dirname(file)
        if (dir !== '.') {
          const parts = dir.split('/')
          for (let i = 1; i <= parts.length; i++) {
            allDirs.add(parts.slice(0, i).join('/'))
          }
        } else {
          allDirs.add('.')
        }

        if (!filesByDir.has(dir)) {
          filesByDir.set(dir, [])
        }
        filesByDir.get(dir)!.push(file)
      }

      for (const dir of dirs) {
        const parts = dir.split('/')
        for (let i = 1; i <= parts.length; i++) {
          allDirs.add(parts.slice(0, i).join('/'))
        }
      }

      const displayPath = dirPath ?? '.'
      const output = `${displayPath}/\n${renderDir('.', 0, allDirs, filesByDir)}`

      return {
        path: displayPath,
        count: files.length,
        truncated: files.length >= maxFiles,
        tree: output,
      }
    },
  })
