import { getRepoFileTree } from '@/lib/e2b-helpers'
import { DEFAULT_MODEL, isValidModel } from '@/lib/models'
import { auth } from '@/server/auth'
import { prisma } from '@/server/db'
import { Sandbox } from '@e2b/code-interpreter'
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai'
import { createMCPClients } from './mcp-list'
import { chatTools, createSandboxTools } from './tools'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const {
    messages,
    sessionId,
    model: requestedModel,
  }: {
    messages: UIMessage[]
    sessionId: string
    model?: string
  } = (await req.json()) as {
    messages: UIMessage[]
    sessionId: string
    model?: string
  }

  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 })
  }

  // Validate model - use default if invalid
  const model =
    requestedModel && isValidModel(requestedModel)
      ? requestedModel
      : DEFAULT_MODEL

  const agentSession = await prisma.agentSession.findFirst({
    where: {
      id: sessionId,
      repository: {
        organization: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    },
    include: {
      repository: {
        include: {
          organization: true,
        },
      },
      publicSandboxUrls: true,
    },
  })

  if (!agentSession) {
    return new Response('Agent session not found', { status: 404 })
  }

  let tools = chatTools
  let systemMessage = ''

  try {
    const sandbox = await Sandbox.connect(agentSession.sandboxId)
    const sandboxTools = createSandboxTools(sandbox, sessionId)
    tools = { ...chatTools, ...sandboxTools }

    const fileTreeLimit = 100
    const fileTree = await getRepoFileTree({
      sandbox,
      maxFiles: fileTreeLimit,
    })

    const publicUrlsInfo =
      agentSession.publicSandboxUrls.length > 0
        ? `\n\nPublic Sandbox URLs currently available:\n${agentSession.publicSandboxUrls.map((url) => `- Port ${url.port}: ${url.url}${url.label ? ` (${url.label})` : ''}`).join('\n')}\nif a port is already published you don't need to publish it again`
        : ''

    systemMessage = `Repository: ${agentSession.repository.name}

File Tree (limited to first ${fileTreeLimit} files):
\`\`\`
${fileTree}
\`\`\`
${publicUrlsInfo}

You are a senior code agent in this repo. Be surgical, terse, correct.

Operating rules:
- Plan first: always call repoFastQuestionAswerer to deep-dive, draft an approach, and decide next steps before manual search.
- During development: when uncertain about impacts, dependencies, or file locations, ask repoFastQuestionAswerer before proceeding.
- Read/search: use ls for tree; findFiles for filenames; grep for exact content; readFile({ fromLine, toLine }) for focused ranges. Prefer repoFastQuestionAswerer for "where/how".
- Edit/create: use edit for surgical changes (include surrounding lines in oldString; set replaceAll only when truly needed); use write to create/overwrite whole files. Preserve formatting and indentation.
- Commands (bun-first): use runCommand (bun install; bun run build/test). For dev servers, run with background: true and captureInitialOutputMs, then publishPort({ port, label? }). Do not republish existing ports. After restarts or no HMR, call refreshWebPreview.
- Logs (background runs): all background runCommand executions are persisted. List with listBackgroundRuns({ limit }); fetch with getCommandLogs({ runId, stream, sinceSeconds }). Iterate: change -> run -> logs -> adjust.
- Triggering error logs: some errors only appear on request/render; use refreshWebPreview to force a reload and surface logs.
- Reported errors: when the user says there are errors, immediately call refreshWebPreview, then getCommandLogs({ runId, stream: "combined" }) for the active dev server.
- External info: use webfetch({ url, format, timeout }) to pull docs/pages when needed.
- Debugging: on failures/timeouts, listBackgroundRuns(limit=5) -> getCommandLogs({ runId, sinceSeconds: 120, stream: "combined" }) -> fix -> re-run.
- Conventions: TypeScript/Next.js App Router; prefer RSC; minimal "use client". Use bun. Install before running dev server.`
  } catch (error) {
    console.error('Failed to connect to sandbox:', error)
  }

  // Create MCP clients and get their tools
  const mcpClients = await createMCPClients()
  const mcpToolsPromises = Object.values(mcpClients).map((client) =>
    client.tools(),
  )
  const mcpToolsArray = await Promise.all(mcpToolsPromises)
  const allMcpTools = Object.assign({}, ...mcpToolsArray) as Record<
    string,
    unknown
  >

  // Merge with existing tools
  tools = { ...tools, ...allMcpTools } as typeof tools

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(100),
    system: systemMessage,
    onFinish: async () => {
      await Promise.all(
        Object.values(mcpClients).map((client) => client.close()),
      )
    },
  })

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  })
}
