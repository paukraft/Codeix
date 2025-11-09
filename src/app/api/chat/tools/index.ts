import type { Sandbox } from '@e2b/code-interpreter'
import { createEditTool } from './edit'
import { createFindFilesTool } from './find-files'
import { createGetCommandLogsTool } from './get-command-logs'
import { createGrepTool } from './grep'
import { createListBackgroundRunsTool } from './list-background-runs'
import { createLsTool } from './ls'
import { createPublishPortTool } from './publish-port'
import { createReadFileTool } from './read-file'
import { createRefreshWebPreviewTool } from './refresh-web-preview'
import { createRepoFastQuestionAnswererTool } from './repo-fast-question-answerer'
import { createRunCommandTool } from './run-command'
import { createWebFetchTool } from './webfetch'
import { createWriteTool } from './write'

export const createSandboxTools = (sandbox: Sandbox, sessionId: string) => ({
  // File operations
  readFile: createReadFileTool(sandbox),
  findFiles: createFindFilesTool(sandbox),
  grep: createGrepTool(sandbox),
  ls: createLsTool(sandbox),
  // File editing
  edit: createEditTool(sandbox),
  write: createWriteTool(sandbox),
  // Command execution
  runCommand: createRunCommandTool(sandbox),
  listBackgroundRuns: createListBackgroundRunsTool(sandbox),
  getCommandLogs: createGetCommandLogsTool(sandbox),
  // Port management
  publishPort: createPublishPortTool(sandbox, sessionId),
  // Agents
  repoFastQuestionAswerer: createRepoFastQuestionAnswererTool(sandbox),
})

export const chatTools = {
  refreshWebPreview: createRefreshWebPreviewTool(),
  webfetch: createWebFetchTool(),
}
