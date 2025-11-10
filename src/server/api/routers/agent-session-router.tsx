import { createRepoSandbox, killSandbox, setEnvVars } from '@/lib/e2b-helpers'
import { prisma } from '@/server/db'
import { Sandbox } from '@e2b/code-interpreter'
import { TRPCError } from '@trpc/server'
import z from 'zod'
import { createTRPCRouter } from '../trpc'
import { hasOrgAccess } from '../trpc-procedures'

export const agentSessionRouter = createTRPCRouter({
  list: hasOrgAccess.query(async ({ ctx }) => {
    return prisma.agentSession.findMany({
      where: {
        repository: {
          organizationId: ctx.org.id,
        },
      },
      include: {
        repository: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }),
  delete: hasOrgAccess
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log('[agentSession.uploadEnvVars] input', input)
      const session = await prisma.agentSession.findFirst({
        where: {
          id: input.sessionId,
          repository: {
            organizationId: ctx.org.id,
          },
        },
        select: {
          id: true,
          sandboxId: true,
        },
      })

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      try {
        const sandbox = await Sandbox.connect(session.sandboxId)
        await killSandbox(sandbox)
      } catch (err) {
        console.error('[agentSession.delete] Failed to kill sandbox:', err)
        // proceed with DB delete regardless
      }

      await prisma.agentSession.delete({
        where: { id: session.id },
      })

      return { success: true }
    }),
  get: hasOrgAccess
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const session = await prisma.agentSession.findFirst({
        where: {
          id: input.sessionId,
          repository: {
            organizationId: ctx.org.id,
          },
        },
        include: {
          repository: true,
          publicSandboxUrls: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      return session
    }),
  create: hasOrgAccess
    .input(
      z.object({
        repositoryId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const repo = await prisma.repository.findFirst({
        where: {
          id: input.repositoryId,
          organizationId: ctx.org.id,
        },
      })

      if (!repo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Repository not found',
        })
      }

      // Create sandbox with repo
      const { sandbox } = await createRepoSandbox({
        repoUrl: repo.url,
        public: true,
        env: {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        },
      })

      // Create session
      const session = await prisma.agentSession.create({
        data: {
          repositoryId: repo.id,
          sandboxId: sandbox.sandboxId,
        },
      })

      return session
    }),
  uploadEnvVars: hasOrgAccess
    .input(
      z.object({
        orgSlug: z.string(),
        sessionId: z.string(),
        envVars: z.array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await prisma.agentSession.findFirst({
        where: {
          id: input.sessionId,
          repository: {
            organizationId: ctx.org.id,
          },
        },
        select: {
          id: true,
          sandboxId: true,
        },
      })

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      try {
        const envRecord: Record<string, string> = {}
        for (const { key, value } of input.envVars) {
          const trimmedKey = key.trim()
          if (!trimmedKey) continue
          envRecord[trimmedKey] = value
        }
        if (Object.keys(envRecord).length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No environment variables provided',
          })
        }

        const sandbox = await Sandbox.connect(session.sandboxId)
        await setEnvVars({ sandbox, envVars: envRecord })

        return { success: true, count: Object.keys(envRecord).length }
      } catch (err) {
        console.error('[agentSession.uploadEnvVars] Failed:', err)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            err instanceof Error ? err.message : 'Failed to upload env vars',
        })
      }
    }),
})
