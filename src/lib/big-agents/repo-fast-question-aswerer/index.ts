import { defaultRepoPath, getRepoFileTree } from '@/lib/e2b-helpers'
import { Sandbox } from '@e2b/code-interpreter'
import { generateText } from 'ai'

import { stepkit } from 'stepkit'

export const repoFastQuestionAswerer = stepkit<{
  sandbox: Sandbox
  question: string
}>()
  .step('get-repo-structure', async ({ sandbox }) => {
    const fileTree = await getRepoFileTree({ sandbox, maxFiles: 1_000 })
    return { fileTree }
  })
  .step('get-files-to-look-at', async ({ sandbox, question, fileTree }) => {
    const { filePaths } = await pickFilesToLookAt({ fileTree, question })
    const files = await readFilesFromFilePaths({
      sandbox,
      filePaths,
      repoPath: defaultRepoPath,
    })
    return { files }
  })
  .step(
    'reduce-files-content-to-only-relevant-lines',
    async ({ files, question }) => {
      const { selectedFiles } = await reduceFilesContentToOnlyRelevantLines({
        files,
        question,
      })
      return { selectedFiles }
    },
  )
  .step('answer-question', async ({ selectedFiles, question }) => {
    const filesContent = selectedFiles
      .map((f) => `--- ${f.path}\n${f.content}`)
      .join('\n\n')
    console.log(JSON.stringify(selectedFiles, null, 2))
    const { text } = await generateText({
      model: 'google/gemini-2.5-pro',
      // providerOptions: {
      //   gateway: {
      //     only: ['cerebras'],
      //   },
      // },
      prompt: `We have a question about a code repo: "${question}".

The following are the pre-selected, relevant source code lines (with zero-based line numbers). Use ONLY this context when answering.

${filesContent}

Please answer the question based on the reduced content of the files.
Be extremely concise. Sacrifice grammar for the sake of concision.`,
    })
    return { answer: text }
  })
  .transform(({ answer, selectedFiles }) => ({ answer }))

const pickFilesToLookAt = async ({
  fileTree,
  question,
}: {
  fileTree: string
  question: string
}) => {
  const { text } = await generateText({
    model: 'openai/gpt-oss-120b',
    providerOptions: {
      gateway: {
        only: ['cerebras'],
      },
    },
    prompt: `We have a question about a code repo: "${question}".

Here is the file tree of the repo:
${fileTree}

Please pick the files that are relevant to the question that we should look at to answer the question.

Return a line by line list of all paths to the files that are relevant to the question.
Better pick too many files than too few so we don't miss critical code.`,
  })

  const filePaths = text.split('\n').filter(Boolean)
  return { filePaths }
}

const readFilesFromFilePaths = async ({
  sandbox,
  filePaths,
  repoPath,
}: {
  sandbox: Sandbox
  filePaths: string[]
  repoPath?: string
}) => {
  const basePath = repoPath ?? defaultRepoPath
  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      // Clean path: remove ./ prefix and (N lines) suffix
      const cleanPath = filePath
        .trim()
        .replace(/^\.\//, '')
        .replace(/\s*\(\d+\s+lines?\)$/, '')

      // Build full path
      const fullPath = cleanPath.startsWith('/')
        ? cleanPath
        : `${basePath}/${cleanPath}`

      try {
        const content = await sandbox.files.read(fullPath)
        return { path: cleanPath, content }
      } catch (error) {
        // Skip files that can't be read (e.g., binary files, missing files)
        return null
      }
    }),
  )

  return files.filter((f): f is { path: string; content: string } => f !== null)
}

const reduceFilesContentToOnlyRelevantLines = async ({
  files,
  question,
}: {
  files: Awaited<ReturnType<typeof readFilesFromFilePaths>>
  question: string
}) => {
  // Prepare files with zero-based line numbers for the selector model
  const numberedFilesDump = files
    .map(({ path, content }) => {
      const lines = content.split(/\r?\n/)
      const numbered = lines.map((line, idx) => `${idx}: ${line}`).join('\n')
      return `--- ${path}\n${numbered}`
    })
    .join('\n\n')

  // Ask the model to return ONLY line ranges per file, rigid format
  const { text: selectionText } = await generateText({
    model: 'openai/gpt-oss-120b',
    providerOptions: {
      gateway: {
        only: ['cerebras'],
      },
    },

    prompt: `We have a question about a code repo: "${question}".

You are given several files. Each file is preceded by a header line starting with "--- " and each file's lines are prefixed with a zero-based line number in the form "N: ".

TASK: For each file, output ONLY the minimal set of inclusive line ranges needed to answer the question in the EXACT format below. Omit files that have no relevant lines. Do NOT output a file header unless at least one range is listed on the next line. Do not add any prose or explanations.

Format (repeat per relevant file):
--- /path/filename.ts
0-12,33-133

Now the files:
${numberedFilesDump}`,
  })

  const selectedFiles = buildFilesWithSelectedContentFromSelection(
    files,
    selectionText,
  )

  return { selectedFiles }
}

const parseLineRangesResponse = (text: string) => {
  const lines = text.split(/\r?\n/)
  const map = new Map<string, Array<{ start: number; end: number }>>()
  let currentPath: string | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const headerMatch = /^---\s+(.+)$/.exec(line)
    if (headerMatch) {
      currentPath = headerMatch[1].trim()
      if (!map.has(currentPath)) map.set(currentPath, [])
      continue
    }

    if (!currentPath) continue
    const parts = line
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    for (const part of parts) {
      const m = /^(\d+)\s*-\s*(\d+)$/.exec(part)
      if (m) {
        const start = parseInt(m[1], 10)
        const end = parseInt(m[2], 10)
        if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
          map.get(currentPath)!.push({ start, end })
        }
      }
    }
  }
  return map
}

const buildFilesWithSelectedContentFromSelection = (
  files: Awaited<ReturnType<typeof readFilesFromFilePaths>>,
  selectionText: string,
) => {
  const rangesByFile = parseLineRangesResponse(selectionText)
  return buildFilesWithSelectedContent(files, rangesByFile)
}

const buildFilesWithSelectedContent = (
  files: Awaited<ReturnType<typeof readFilesFromFilePaths>>,
  rangesByFile: Map<string, Array<{ start: number; end: number }>>,
) => {
  const byPath = new Map(files.map((f) => [f.path, f.content] as const))
  const results: Array<{ path: string; content: string }> = []

  for (const [path, ranges] of rangesByFile.entries()) {
    const content = byPath.get(path)
    if (!content || ranges.length === 0) continue
    const lines = content.split(/\r?\n/)
    const normalized = ranges
      .map(({ start, end }) => ({
        start: Math.max(0, Math.min(start, lines.length - 1)),
        end: Math.max(0, Math.min(end, lines.length - 1)),
      }))
      .filter((r) => r.start <= r.end)
      .sort((a, b) => (a.start === b.start ? a.end - b.end : a.start - b.start))
    const selected: string[] = []
    for (const { start, end } of normalized) {
      for (let i = start; i <= end; i++) {
        selected.push(`${i}: ${lines[i] ?? ''}`)
      }
    }
    if (selected.length > 0) {
      results.push({ path, content: selected.join('\n') })
    }
  }

  return results
}
