import { repoFastQuestionAswerer } from '@/lib/big-agents/repo-fast-question-aswerer'
import type { Sandbox } from '@e2b/code-interpreter'
import { tool } from 'ai'
import z from 'zod'

export const createRepoFastQuestionAnswererTool = (sandbox: Sandbox) =>
  tool({
    description:
      'Answer a question about the repository. Call this if you want to know where sth is, how its implemented and so on.',
    inputSchema: z.object({
      question: z.string().describe('Question about the repository codebase'),
    }),
    execute: async ({ question }) => {
      const { answer } = await repoFastQuestionAswerer.run({
        sandbox,
        question,
      })
      return { answer }
    },
  })

