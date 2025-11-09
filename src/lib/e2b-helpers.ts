import { Sandbox } from '@e2b/code-interpreter'

export const defaultRepoPath = '/home/user/repo'

const normalizeRepoUrl = (url: string) =>
  url.endsWith('.git') ? url : `${url}.git`

const shEscape = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`

export const getRepoFileTree = async (opts: {
  sandbox: Sandbox
  repoPath?: string
  maxFiles?: number
}) => {
  const repoPath = opts.repoPath ?? defaultRepoPath
  const maxFiles = opts.maxFiles

  // Enhanced tree command that includes line counts
  const treeCmd = `find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/.next/*' -not -path '*/coverage/*' -not -path '*/.turbo/*' | head -n ${maxFiles} | sort | while read file; do
    lines=$(wc -l < "$file" 2>/dev/null || echo "0")
    echo "$file ($lines lines)"
  done`

  const treeResult = await opts.sandbox.commands.run(treeCmd, {
    cwd: repoPath,
    timeoutMs: 15_000,
  })

  if (treeResult.exitCode === 0 && treeResult.stdout.trim()) {
    return treeResult.stdout.trim()
  }

  // Fallback to simple find if enhanced version fails
  const findCmd = `find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/.next/*' | head -n ${maxFiles} | sort`

  const findResult = await opts.sandbox.commands.run(findCmd, {
    cwd: repoPath,
    timeoutMs: 10_000,
  })

  if (findResult.exitCode === 0 && findResult.stdout.trim()) {
    return findResult.stdout.trim()
  }

  return 'Unable to generate file tree'
}

const run = async (
  sandbox: Sandbox,
  cmd: string,
  opts?: { cwd?: string; timeoutMs?: number; user?: string },
) => {
  return await sandbox.commands.run(cmd, {
    cwd: opts?.cwd ?? '/home/user',
    timeoutMs: opts?.timeoutMs ?? 120_000,
    user: opts?.user,
  })
}

const ensureGitInstalled = async (sandbox: Sandbox) => {
  const hasGit = await run(sandbox, 'command -v git >/dev/null 2>&1; echo $?')
  if (hasGit.stdout.trim() === '0') return

  const hasApt = await run(
    sandbox,
    'command -v apt-get >/dev/null 2>&1; echo $?',
  )
  const hasApk = await run(sandbox, 'command -v apk >/dev/null 2>&1; echo $?')
  const hasYum = await run(sandbox, 'command -v yum >/dev/null 2>&1; echo $?')

  if (hasApt.stdout.trim() === '0') {
    await run(sandbox, 'apt-get update', { user: 'root', timeoutMs: 180_000 })
    await run(sandbox, 'apt-get install -y git', {
      user: 'root',
      timeoutMs: 300_000,
    })
  } else if (hasApk.stdout.trim() === '0') {
    await run(sandbox, 'apk add --no-cache git', {
      user: 'root',
      timeoutMs: 180_000,
    })
  } else if (hasYum.stdout.trim() === '0') {
    await run(sandbox, 'yum install -y git', {
      user: 'root',
      timeoutMs: 300_000,
    })
  } else {
    throw new Error(
      'No supported package manager found to install git (apt/apk/yum)',
    )
  }
}

const cloneRepo = async (
  sandbox: Sandbox,
  repoUrl: string,
  opts?: { branch?: string; depth?: number; destPath?: string },
) => {
  const url = normalizeRepoUrl(repoUrl)
  const dest = opts?.destPath ?? defaultRepoPath
  const depthArg = opts?.depth ? `--depth ${opts.depth}` : ''
  const branchArg = opts?.branch ? `--branch ${opts.branch}` : ''

  await run(sandbox, `rm -rf "${dest}"`)
  const result = await run(
    sandbox,
    `git clone ${depthArg} ${branchArg} ${url} "${dest}"`
      .replace(/\s+/g, ' ')
      .trim(),
  )
  if (result.exitCode !== 0) {
    throw new Error(`git clone failed: ${result.stderr || result.stdout}`)
  }
}

const ensureBunInstalled = async (sandbox: Sandbox) => {
  const hasBun = await commandExists(sandbox, 'bun')
  if (hasBun) return

  // Install bun using the official install script
  const installRes = await run(
    sandbox,
    'curl -fsSL https://bun.sh/install | bash',
    { timeoutMs: 120_000 },
  )
  if (installRes.exitCode !== 0) {
    throw new Error(
      `bun installation failed: ${installRes.stderr || installRes.stdout}`,
    )
  }

  // Add bun to PATH for current session
  await run(sandbox, 'export PATH="$HOME/.bun/bin:$PATH"', { timeoutMs: 5_000 })

  // Verify installation
  const verifyRes = await run(sandbox, '$HOME/.bun/bin/bun --version', {
    timeoutMs: 10_000,
  })
  if (verifyRes.exitCode !== 0) {
    throw new Error(
      `bun verification failed: ${verifyRes.stderr || verifyRes.stdout}`,
    )
  }
}

export const createRepoSandbox = async (opts: {
  repoUrl: string
  branch?: string
  depth?: number
  destPath?: string
  sandboxId?: string
  template?: string
  public?: boolean
  env?: Record<string, string | undefined>
}) => {
  let sandbox: Sandbox | undefined
  let connectedExisting = false

  if (opts.sandboxId) {
    try {
      sandbox = await Sandbox.connect(opts.sandboxId)
      connectedExisting = true
    } catch {
      // fall back to create
    }
  }

  if (!sandbox) {
    // Use template alias 'codeix' (as per E2B docs: Sandbox.create("template-alias"))
    const templateAlias = opts.template ?? 'codeix'
    console.log(
      '[createRepoSandbox] Creating sandbox with template:',
      templateAlias,
    )

    try {
      // Try passing template alias as string (e2b package API style)
      sandbox = await Sandbox.create(templateAlias as any, {
        timeoutMs: 1 * 60 * 60 * 1000, // 1 hour
      })
    } catch (err) {
      // Fallback to object format (@e2b/code-interpreter API)
      const createOpts: {
        template?: string
        public?: boolean
        env?: Record<string, string>
      } = {
        template: templateAlias,
        public: opts.public !== undefined ? opts.public : true,
      }
      if (opts.env) {
        const filtered: Record<string, string> = {}
        for (const [k, v] of Object.entries(opts.env)) {
          if (typeof v === 'string' && v.length > 0) filtered[k] = v
        }
        if (Object.keys(filtered).length > 0) createOpts.env = filtered
      }
      sandbox = await Sandbox.create(createOpts as any)
    }
    console.log('[createRepoSandbox] Sandbox created:', sandbox.sandboxId)
  }

  try {
    // Git and bun are pre-installed in the template, so we can skip installation
    await cloneRepo(sandbox, opts.repoUrl, {
      branch: opts.branch,
      depth: opts.depth,
      destPath: opts.destPath,
    })
    return { sandbox, repoPath: opts.destPath ?? defaultRepoPath }
  } catch (error) {
    // Best-effort cleanup on failure when we created a new sandbox
    if (!connectedExisting) {
      try {
        await sandbox.kill()
      } catch {}
    }
    throw error
  }
}

export const killSandbox = async (sandbox: Sandbox) => {
  try {
    await sandbox.kill()
  } catch {}
}

const fileNamesInDir = async (sandbox: Sandbox, dir: string) => {
  try {
    const entries = await sandbox.files.list(dir)
    return new Set(entries.map((e: any) => (e.name as string) ?? ''))
  } catch {
    return new Set<string>()
  }
}

const commandExists = async (sandbox: Sandbox, cmd: string) => {
  const res = await run(sandbox, `command -v ${cmd} >/dev/null 2>&1; echo $?`, {
    cwd: '/home/user',
  })
  return res.stdout.trim() === '0'
}

export const detectPackageManager = async (
  sandbox: Sandbox,
  repoPath?: string,
) => {
  const path = repoPath ?? defaultRepoPath
  const files = await fileNamesInDir(sandbox, path)
  if (files.has('pnpm-lock.yaml')) return 'pnpm' as const
  if (files.has('yarn.lock')) return 'yarn' as const
  if (files.has('bun.lockb') || files.has('bun.lock')) return 'bun' as const
  if (files.has('package-lock.json')) return 'npm' as const

  if (await commandExists(sandbox, 'pnpm')) return 'pnpm' as const
  if (await commandExists(sandbox, 'yarn')) return 'yarn' as const
  if (await commandExists(sandbox, 'bun')) return 'bun' as const
  return 'npm' as const
}

export const installRepoPackages = async (opts: {
  sandbox: Sandbox
  repoPath?: string
  preferManager?: 'npm' | 'yarn' | 'pnpm' | 'bun'
  stream?:
    | boolean
    | {
        onStdout?: (data: any) => void
        onStderr?: (data: any) => void
      }
}) => {
  const { sandbox } = opts
  const repoPath = opts.repoPath ?? defaultRepoPath
  const files = await fileNamesInDir(sandbox, repoPath)
  const longTimeout = 15 * 60_000
  const hasLock = files.has('bun.lockb') || files.has('package-lock.json')

  if (opts.stream) {
    const onStdout =
      typeof opts.stream === 'object' ? opts.stream.onStdout : undefined
    const onStderr =
      typeof opts.stream === 'object' ? opts.stream.onStderr : undefined
    await streamCommand({
      sandbox,
      cmd: 'bun',
      args: ['install'],
      cwd: repoPath,
      timeoutMs: longTimeout,
      onStdout,
      onStderr,
    })
  } else {
    const cmd = `bun install`
    const res = await run(sandbox, cmd, {
      cwd: repoPath,
      timeoutMs: longTimeout,
    })
    if (res.exitCode !== 0) throw new Error(res.stderr || res.stdout || cmd)
  }
  return 'bun' as const
}

const buildEnvPrefix = (env?: Record<string, string | undefined>) => {
  if (!env) return ''
  const pairs = Object.entries(env)
    .filter(([, v]) => typeof v === 'string' && v.length > 0)
    .map(([k, v]) => `${k}=${shEscape(v as string)}`)
  return pairs.join(' ')
}

export const getPortHost = (sandbox: Sandbox, port: number) =>
  sandbox.getHost(port)
export const getPortUrl = (
  sandbox: Sandbox,
  port: number,
  protocol: 'https' | 'http' = 'https',
) => `${protocol}://${sandbox.getHost(port)}`

// -- Background command logging ------------------------------------------------
export const CODEIX_LOGS_ROOT = '/home/user/.codeix/logs'

const ensureDir = async (sandbox: Sandbox, dir: string) => {
  await run(sandbox, `mkdir -p ${shEscape(dir)}`, { cwd: '/home/user' })
}

const generateRunId = () =>
  `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

const buildLoggedRunnerScript = (params: {
  runId: string
  fullCmd: string
  cwd: string
}) => {
  const { runId, fullCmd, cwd } = params
  const safeCmd = fullCmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const safeCwd = cwd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  // Use bash process substitutions to both persist logs and forward to parent stdio
  return `#!/usr/bin/env bash
set -u

RUN_ID="${runId}"
LOG_DIR="$HOME/.codeix/logs/${runId}"
CMD_STR="${safeCmd}"
CWD_STR="${safeCwd}"

mkdir -p "$LOG_DIR"
echo "$CMD_STR" > "$LOG_DIR/cmd.txt"
echo "$$" > "$LOG_DIR/wrapper_pid"
START_EPOCH="$(date +%s)"
# Escape command for JSON (basic escaping)
CMD_JSON=$(echo "$CMD_STR" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
printf '{"runId":"%s","cmd":"%s","cwd":"%s","startEpoch":%s}\\n' "$RUN_ID" "$CMD_JSON" "$CWD_STR" "$START_EPOCH" > "$LOG_DIR/meta.json"

COMBINED="$LOG_DIR/combined.log"
STDOUT="$LOG_DIR/stdout.log"
STDERR="$LOG_DIR/stderr.log"

: > "$COMBINED"
: > "$STDOUT"
: > "$STDERR"

# Run the command and persist logs without re-emitting to wrapper stdio (prevents EPIPE)
bash -lc "$CMD_STR" \
  > >(while IFS= read -r line || [[ -n "$line" ]]; do ts=$(date +%s); printf "%s\\tstdout\\t%s\\n" "$ts" "$line" >> "$COMBINED"; printf "%s\\n" "$line" >> "$STDOUT"; done) \
  2> >(while IFS= read -r line || [[ -n "$line" ]]; do ts=$(date +%s); printf "%s\\tstderr\\t%s\\n" "$ts" "$line" >> "$COMBINED"; printf "%s\\n" "$line" >> "$STDERR"; done)
`
}

export const getCommandLogs = async (opts: {
  sandbox: Sandbox
  runId: string
  sinceSeconds?: number
  stream?: 'stdout' | 'stderr' | 'combined'
}) => {
  const { sandbox, runId } = opts
  const stream = opts.stream ?? 'combined'
  const logPath =
    stream === 'stdout'
      ? `${CODEIX_LOGS_ROOT}/${runId}/stdout.log`
      : stream === 'stderr'
        ? `${CODEIX_LOGS_ROOT}/${runId}/stderr.log`
        : `${CODEIX_LOGS_ROOT}/${runId}/combined.log`
  let content = ''
  try {
    content = await sandbox.files.read(logPath)
  } catch {
    return {
      entries: [] as Array<{
        ts: number
        stream: 'stdout' | 'stderr'
        line: string
      }>,
      text: '',
    }
  }
  if (!content) return { entries: [], text: '' }

  // Parse combined format: "<epoch>\t<stream>\t<line>"
  // For non-combined, we synthesize stream and ts=0 unless we also filter by sinceSeconds (then we read combined and filter)
  const sinceSeconds = opts.sinceSeconds ?? 0
  const nowSec = Math.floor(Date.now() / 1000)
  const cutoff = sinceSeconds > 0 ? nowSec - sinceSeconds : 0

  if (stream === 'combined' || sinceSeconds > 0) {
    const combined =
      stream === 'combined'
        ? content
        : await sandbox.files
            .read(`${CODEIX_LOGS_ROOT}/${runId}/combined.log`)
            .catch(() => '')
    const lines = combined ? combined.split('\n') : []
    const entries: Array<{
      ts: number
      stream: 'stdout' | 'stderr'
      line: string
    }> = []
    for (const l of lines) {
      if (!l) continue
      const firstTab = l.indexOf('\t')
      if (firstTab < 0) continue
      const secondTab = l.indexOf('\t', firstTab + 1)
      if (secondTab < 0) continue
      const tsStr = l.slice(0, firstTab)
      const stStr = l.slice(firstTab + 1, secondTab) as 'stdout' | 'stderr'
      const line = l.slice(secondTab + 1)
      const ts = Number(tsStr) || 0
      if (cutoff && ts < cutoff) continue
      if (stream === 'combined' || stStr === stream) {
        entries.push({ ts, stream: stStr, line })
      }
    }
    return {
      entries,
      text: entries.map((e) => e.line).join('\n'),
    }
  }

  // stream is stdout/stderr and no time filter requested
  const entries = content
    .split('\n')
    .filter(Boolean)
    .map((line) => ({
      ts: 0,
      stream,
      line,
    }))
  return { entries, text: content }
}

export const listCommandRuns = async (opts: { sandbox: Sandbox }) => {
  const { sandbox } = opts
  try {
    const entries = await sandbox.files.list(CODEIX_LOGS_ROOT)
    const runIds = entries
      .map((e: any) => e.name as string)
      .filter((n) => !!n && n.startsWith('cmd_'))
    // Try to sort by startEpoch
    const withMeta = await Promise.all(
      runIds.map(async (id) => {
        let startEpoch = 0
        let cmd = ''
        let cwd = ''
        try {
          const meta = await sandbox.files.read(
            `${CODEIX_LOGS_ROOT}/${id}/meta.json`,
          )
          const parsed = JSON.parse(meta) as {
            startEpoch?: number
            cmd?: string
            cwd?: string
          }
          startEpoch = Number(parsed.startEpoch) || 0
          cmd = parsed.cmd || ''
          cwd = parsed.cwd || ''
        } catch {}
        if (!cmd) {
          try {
            cmd = (
              await sandbox.files.read(`${CODEIX_LOGS_ROOT}/${id}/cmd.txt`)
            ).trim()
          } catch {}
        }
        return { runId: id, startEpoch, cmd, cwd }
      }),
    )
    return withMeta.sort((a, b) => b.startEpoch - a.startEpoch)
  } catch {
    return [] as Array<{
      runId: string
      startEpoch: number
      cmd: string
      cwd: string
    }>
  }
}

export const startSandboxServer = async (opts: {
  sandbox: Sandbox
  cmd: string
  port: number
  cwd?: string
  env?: Record<string, string | undefined>
}) => {
  const { sandbox, cmd, port, cwd, env } = opts
  const envPrefix = buildEnvPrefix(env)
  const fullCmd = envPrefix ? `${envPrefix} ${cmd}` : cmd
  const process = await sandbox.commands.run(fullCmd, {
    cwd: cwd ?? '/home/user',
    background: true,
  })
  const host = sandbox.getHost(port)
  const url = `https://${host}`
  return { process, host, url }
}

export const startDevServer = async (opts: {
  sandbox: Sandbox
  cmd: string
  port: number
  repoPath?: string
  env?: Record<string, string | undefined>
  onStdout?: (data: any) => void
  onStderr?: (data: any) => void
}) => {
  const { sandbox, cmd, port } = opts
  const repoPath = opts.repoPath ?? defaultRepoPath

  const env: Record<string, string | undefined> = {
    PORT: String(port),
    HOST: '0.0.0.0',
    HOSTNAME: '0.0.0.0',
    ...opts.env,
  }

  const envPrefix = buildEnvPrefix(env)
  const fullCmd = envPrefix ? `${envPrefix} ${cmd}` : cmd

  const process = await sandbox.commands.run(fullCmd, {
    cwd: repoPath,
    background: true,
    onStdout: opts.onStdout,
    onStderr: opts.onStderr,
  })

  const host = sandbox.getHost(port)
  const url = `https://${host}`
  return { process, host, url }
}

// -- Root-level packages (for runCode) ---------------------------------------

export const installPackages = async (opts: {
  sandbox: Sandbox
  packages: string[]
  dev?: boolean
  preferManager?: 'npm' | 'yarn' | 'pnpm' | 'bun'
  cwd?: string
  stream?:
    | boolean
    | {
        onStdout?: (data: any) => void
        onStderr?: (data: any) => void
      }
}) => {
  const { sandbox } = opts
  const cwd = opts.cwd ?? '/home/user'
  const pkgList = opts.packages.map((p) => shEscape(p)).join(' ')
  const longTimeout = 10 * 60_000

  if (!opts.packages.length) return 'bun' as const

  if (opts.stream) {
    const onStdout =
      typeof opts.stream === 'object' ? opts.stream.onStdout : undefined
    const onStderr =
      typeof opts.stream === 'object' ? opts.stream.onStderr : undefined
    await streamCommand({
      sandbox,
      cmd: 'bun',
      args: ['add', ...(opts.dev ? ['-d'] : []), ...opts.packages],
      cwd,
      timeoutMs: longTimeout,
      onStdout,
      onStderr,
    })
  } else {
    const cmd = `bun add ${opts.dev ? '-d ' : ''}${pkgList}`
    const res = await run(sandbox, cmd, { cwd, timeoutMs: longTimeout })
    if (res.exitCode !== 0) throw new Error(res.stderr || res.stdout || cmd)
  }
  return 'bun' as const
}

// -- runCode helpers ----------------------------------------------------------

const buildEnvPrelude = (env?: Record<string, string | undefined>) => {
  if (!env) return ''
  const filtered: Record<string, string> = {}
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === 'string' && v.length > 0) filtered[k] = v
  }
  if (!Object.keys(filtered).length) return ''
  const json = JSON.stringify(filtered)
  return `Object.assign(process.env, ${json} as any);\n`
}

export const streamCommand = async (opts: {
  sandbox: Sandbox
  cmd: string
  args?: string[]
  cwd?: string
  env?: Record<string, string | undefined>
  timeoutMs?: number
  background?: boolean
  captureInitialOutputMs?: number
  onStdout?: (data: any) => void
  onStderr?: (data: any) => void
}) => {
  const {
    sandbox,
    cmd,
    args,
    cwd,
    env,
    timeoutMs,
    background,
    captureInitialOutputMs,
    onStdout,
    onStderr,
  } = opts
  const envPrefix = buildEnvPrefix(env)
  // If cmd contains shell operators, treat as full shell command
  const isShellCmd =
    cmd.includes('&&') || cmd.includes('|') || cmd.includes(';')
  const fullCmd = isShellCmd
    ? `${envPrefix ? envPrefix + ' ' : ''}${cmd}${args?.length ? ' ' + args.join(' ') : ''}`
    : args?.length
      ? `${envPrefix ? envPrefix + ' ' : ''}${cmd} ${args.join(' ')}`
      : `${envPrefix ? envPrefix + ' ' : ''}${cmd}`

  // Background: wrap with logging wrapper so output is persisted and still forwarded to callbacks
  if (background) {
    const runId = generateRunId()
    const logDir = `${CODEIX_LOGS_ROOT}/${runId}`
    await ensureDir(sandbox, CODEIX_LOGS_ROOT)
    await ensureDir(sandbox, logDir)
    const scriptPath = `${logDir}/run.sh`
    const cwdToUse = cwd ?? '/home/user'
    const script = buildLoggedRunnerScript({
      runId,
      fullCmd,
      cwd: cwdToUse,
    })
    await sandbox.files.write(scriptPath, script)
    await run(sandbox, `chmod +x ${shEscape(scriptPath)}`)

    const process = await sandbox.commands.run(scriptPath, {
      cwd: cwdToUse,
      timeoutMs,
      background: true,
      // No direct stdio forwarding; logs are persisted to files
    })

    if (captureInitialOutputMs) {
      const captureMs = captureInitialOutputMs
      await new Promise((resolve) => setTimeout(resolve, captureMs))
      const [stdoutLog, stderrLog] = await Promise.all([
        sandbox.files.read(`${logDir}/stdout.log`).catch(() => ''),
        sandbox.files.read(`${logDir}/stderr.log`).catch(() => ''),
      ])
      const stdoutLines = stdoutLog
        .split('\n')
        .filter((line) => line.length > 0)
      const stderrLines = stderrLog
        .split('\n')
        .filter((line) => line.length > 0)
      stdoutLines.forEach((line) => onStdout?.({ line }))
      stderrLines.forEach((line) => onStderr?.({ line }))
      return {
        ...process,
        runId,
        logDir,
        stdout: stdoutLog,
        stderr: stderrLog,
        exitCode: 0,
      }
    }

    onStdout?.({ line: `[logs] background run ${runId}` })
    return { ...process, runId, logDir, stdout: '', stderr: '' }
  }

  const result = await sandbox.commands.run(fullCmd, {
    cwd: cwd ?? '/home/user',
    timeoutMs,
    background,
    onStdout,
    onStderr,
  })
  // Don't throw error for background commands
  if (!background && result.exitCode !== 0) {
    throw new Error(
      result.stderr || result.stdout || `Command failed: ${fullCmd}`,
    )
  }
  return result
}

export const runRepoCommand = async (opts: {
  sandbox: Sandbox
  cmd: string
  args?: string[]
  repoPath?: string
  env?: Record<string, string | undefined>
  timeoutMs?: number
  background?: boolean
  captureInitialOutputMs?: number
  onStdout?: (data: any) => void
  onStderr?: (data: any) => void
}) => {
  const repoPath = opts.repoPath ?? defaultRepoPath
  return await streamCommand({
    sandbox: opts.sandbox,
    cmd: opts.cmd,
    args: opts.args,
    cwd: repoPath,
    env: opts.env,
    timeoutMs: opts.timeoutMs,
    background: opts.background,
    captureInitialOutputMs: opts.captureInitialOutputMs,
    onStdout: opts.onStdout,
    onStderr: opts.onStderr,
  })
}

export const runTsCode = async (opts: {
  sandbox: Sandbox
  code: string
  packages?: string[]
  devPackages?: string[]
  env?: Record<string, string | undefined>
}) => {
  if (opts.packages?.length)
    await installPackages({ sandbox: opts.sandbox, packages: opts.packages })
  if (opts.devPackages?.length)
    await installPackages({
      sandbox: opts.sandbox,
      packages: opts.devPackages,
      dev: true,
    })
  const prelude = buildEnvPrelude(opts.env)
  const execution = await opts.sandbox.runCode(`${prelude}${opts.code}`, {
    language: 'ts',
  })
  return execution
}

export const runJsCode = async (opts: {
  sandbox: Sandbox
  code: string
  packages?: string[]
  devPackages?: string[]
  env?: Record<string, string | undefined>
}) => {
  if (opts.packages?.length)
    await installPackages({ sandbox: opts.sandbox, packages: opts.packages })
  if (opts.devPackages?.length)
    await installPackages({
      sandbox: opts.sandbox,
      packages: opts.devPackages,
      dev: true,
    })
  const prelude = buildEnvPrelude(opts.env)
  const execution = await opts.sandbox.runCode(`${prelude}${opts.code}`, {
    language: 'js',
  })
  return execution
}

// -- HTTP wait helper ---------------------------------------------------------

export const waitForHttpOk = async (opts: {
  url: string
  timeoutMs?: number
  intervalMs?: number
}) => {
  const { url } = opts
  const timeoutMs = opts.timeoutMs ?? 60_000
  const intervalMs = opts.intervalMs ?? 1_000
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { headers: { accept: 'text/html,*/*' } })
      if (res.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}
