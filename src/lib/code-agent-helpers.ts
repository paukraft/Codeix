import { defaultRepoPath as e2bDefaultRepoPath } from '@/lib/e2b-helpers'
import { FileType, Sandbox } from '@e2b/code-interpreter'
import path from 'path'

const joinSandboxPath = (repoPath: string, filePath: string) => {
  if (!filePath || filePath === '.') return repoPath
  if (filePath.startsWith('/')) return filePath
  const base = repoPath.endsWith('/') ? repoPath.slice(0, -1) : repoPath
  const rel = filePath.startsWith('/') ? filePath.slice(1) : filePath
  return `${base}/${rel}`
}

const shEscape = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`

export const readFileRange = async (opts: {
  sandbox: Sandbox
  filePathWithinRepo: string
  fromLine?: number
  toLine?: number
  repoPath?: string
}) => {
  const repoPath = opts.repoPath ?? e2bDefaultRepoPath
  const full = joinSandboxPath(repoPath, opts.filePathWithinRepo)
  const content = await opts.sandbox.files.read(full)
  const lines = content.split('\n')
  const from = Math.max(1, opts.fromLine ?? 1)
  const to = Math.min(lines.length, opts.toLine ?? lines.length)
  if (from > to)
    return { content: '', startLine: from, endLine: to, lines: [] as string[] }
  const slice = lines.slice(from - 1, to)
  return {
    content: slice.join('\n'),
    startLine: from,
    endLine: to,
    lines: slice,
  }
}

export const grep = async (opts: {
  sandbox: Sandbox
  pattern: RegExp | string
  repoPath?: string
  includeExtensions?: string[]
  ignoreDirs?: string[]
  caseInsensitive?: boolean
  maxResults?: number
}) => {
  const repoPath = opts.repoPath ?? e2bDefaultRepoPath
  const includes = (opts.includeExtensions ?? []).map(
    (ext) =>
      `--include=${shEscape(`*${ext.startsWith('.') ? ext : `.${ext}`}`)}`,
  )
  const excludes = (opts.ignoreDirs ?? ['.git', 'node_modules']).map(
    (d) => `--exclude-dir=${shEscape(d)}`,
  )
  const ci = opts.caseInsensitive ? '-i' : ''
  const maxN =
    opts.maxResults && opts.maxResults > 0 ? `| head -n ${opts.maxResults}` : ''

  const patternStr =
    opts.pattern instanceof RegExp ? opts.pattern.source : opts.pattern

  const grepCmd = [
    'grep -RIn --line-number --binary-files=without-match -E',
    ci,
    ...includes,
    ...excludes,
    shEscape(patternStr),
    '.',
    maxN,
  ]
    .filter(Boolean)
    .join(' ')

  const runRes = await opts.sandbox.commands.run(grepCmd, {
    cwd: repoPath,
    timeoutMs: 120_000,
  })
  const results: Array<{
    file: string
    line: number
    column: number
    match: string
    lineText: string
  }> = []

  if (runRes.exitCode === 0 && runRes.stdout.trim().length) {
    const lines = runRes.stdout.split('\n').filter(Boolean)
    const regex = /^(.*?):(\d+):(.*)$/
    for (const l of lines) {
      const m = regex.exec(l)
      if (!m) continue
      const file = m[1]
      const line = Number(m[2])
      const lineText = m[3]
      let column = 1
      let match = ''
      if (typeof opts.pattern === 'string') {
        const idx = lineText.indexOf(opts.pattern)
        column = idx >= 0 ? idx + 1 : 1
        match = opts.pattern
      } else {
        const rx = new RegExp(
          opts.pattern.source,
          opts.pattern.flags.replace(/g/g, ''),
        )
        const mm = rx.exec(lineText)
        if (mm && mm.index >= 0) {
          column = mm.index + 1
          match = mm[0]
        }
      }
      results.push({ file, line, column, match, lineText })
      if (opts.maxResults && results.length >= opts.maxResults) break
    }
    return results
  }
  if (runRes.exitCode === 1) return results

  const fallback = await listAllFiles(
    opts.sandbox,
    repoPath,
    new Set(opts.ignoreDirs ?? ['.git', 'node_modules']),
  )
  const rx =
    opts.pattern instanceof RegExp
      ? new RegExp(
          opts.pattern.source,
          `g${opts.pattern.ignoreCase ? 'i' : ''}`,
        )
      : new RegExp(opts.pattern, `g${opts.caseInsensitive ? 'i' : ''}`)
  for (const f of fallback) {
    if (opts.includeExtensions?.length) {
      const ext = path.extname(f).toLowerCase()
      if (
        !opts.includeExtensions.includes(ext) &&
        !opts.includeExtensions.includes(ext.replace(/^\./, ''))
      )
        continue
    }
    let text: string
    try {
      text = await opts.sandbox.files.read(f)
    } catch {
      continue
    }
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]
      let m: RegExpExecArray | null
      rx.lastIndex = 0
      while ((m = rx.exec(lineText))) {
        results.push({
          file: f,
          line: i + 1,
          column: (m.index ?? 0) + 1,
          match: m[0],
          lineText,
        })
        if (opts.maxResults && results.length >= opts.maxResults) return results
      }
    }
  }
  return results
}

const listAllFiles = async (
  sandbox: Sandbox,
  dir: string,
  ignore: Set<string>,
) => {
  const files: string[] = []
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()!
    let entries: Awaited<ReturnType<typeof sandbox.files.list>>
    try {
      entries = await sandbox.files.list(current)
    } catch {
      continue
    }
    for (const e of entries) {
      const name = (e as any).name ?? path.basename((e as any).path)
      if (ignore.has(name)) continue
      if ((e as any).type === FileType.DIR) {
        stack.push((e as any).path)
      } else if ((e as any).type === FileType.FILE) {
        files.push((e as any).path)
      }
    }
  }
  return files
}

export const replaceInFile = async (opts: {
  sandbox: Sandbox
  filePathWithinRepo: string
  repoPath?: string
  fromLine?: number
  toLine?: number
  search?: RegExp | string
  replaceWith: string
  dryRun?: boolean
}) => {
  const repoPath = opts.repoPath ?? e2bDefaultRepoPath
  const full = joinSandboxPath(repoPath, opts.filePathWithinRepo)
  const original = await opts.sandbox.files.read(full)
  const lines = original.split('\n')
  const from = Math.max(1, opts.fromLine ?? 1)
  const to = Math.min(lines.length, opts.toLine ?? lines.length)
  if (from > to) return { changed: false, newContent: original }

  const before = lines.slice(0, from - 1)
  const target = lines.slice(from - 1, to).join('\n')
  const after = lines.slice(to)

  let replaced: string
  if (opts.search !== undefined) {
    if (opts.search instanceof RegExp) {
      const rx = new RegExp(
        opts.search.source,
        opts.search.flags.includes('g')
          ? opts.search.flags
          : `${opts.search.flags}g`,
      )
      replaced = target.replace(rx, opts.replaceWith)
    } else {
      replaced = target.split(opts.search).join(opts.replaceWith)
    }
  } else {
    replaced = opts.replaceWith
  }

  const newContent = [before.join('\n'), replaced, after.join('\n')]
    .filter(Boolean)
    .join('\n')
  const changed = newContent !== original
  if (!opts.dryRun && changed) await opts.sandbox.files.write(full, newContent)
  return { changed, newContent }
}

export const findFiles = async (opts: {
  sandbox: Sandbox
  pattern: string
  repoPath?: string
  maxResults?: number
}) => {
  const repoPath = opts.repoPath ?? e2bDefaultRepoPath
  const maxN =
    opts.maxResults && opts.maxResults > 0 ? `| head -n ${opts.maxResults}` : ''

  const findCmd = `find . -type f -name ${shEscape(opts.pattern)} ${maxN}`.trim()

  const runRes = await opts.sandbox.commands.run(findCmd, {
    cwd: repoPath,
    timeoutMs: 30_000,
  })

  if (runRes.exitCode === 0 && runRes.stdout.trim().length) {
    return runRes.stdout
      .split('\n')
      .filter(Boolean)
      .map((f) => f.replace(/^\.\//, ''))
  }
  return []
}

export const applyLineEdits = async (opts: {
  sandbox: Sandbox
  filePathWithinRepo: string
  edits: Array<{ fromLine: number; toLine: number; newText: string }>
  repoPath?: string
  dryRun?: boolean
}) => {
  const repoPath = opts.repoPath ?? e2bDefaultRepoPath
  const full = joinSandboxPath(repoPath, opts.filePathWithinRepo)
  const original = await opts.sandbox.files.read(full)
  const lines = original.split('\n')
  if (!opts.edits.length) return { changed: false, newContent: original }

  const sorted = [...opts.edits].sort((a, b) => b.fromLine - a.fromLine)
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    if (a.fromLine > a.toLine)
      throw new Error(
        `Invalid edit: fromLine > toLine (${a.fromLine} > ${a.toLine})`,
      )
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]
      const overlaps = !(a.toLine < b.fromLine || a.fromLine > b.toLine)
      if (overlaps) throw new Error('Overlapping edits are not allowed')
    }
  }

  let newLines = [...lines]
  for (const e of sorted) {
    const from = Math.max(1, e.fromLine)
    const to = Math.min(newLines.length, e.toLine)
    const before = newLines.slice(0, from - 1)
    const after = newLines.slice(to)
    const middle = e.newText.length ? e.newText.split('\n') : []
    newLines = [...before, ...middle, ...after]
  }

  const newContent = newLines.join('\n')
  const changed = newContent !== original
  if (!opts.dryRun && changed) await opts.sandbox.files.write(full, newContent)
  return { changed, newContent }
}
