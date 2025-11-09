import { prisma } from '@/server/db'
import z from 'zod'
import { createTRPCRouter } from '../trpc'
import { hasOrgAccess } from '../trpc-procedures'

const githubUrlRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+$/

const validateGithubUrl = (url: string) => {
  if (!githubUrlRegex.test(url)) {
    throw new Error(
      'Invalid GitHub URL. Must be in format: https://github.com/owner/repo',
    )
  }
  return url
}

export const repositoryRouter = createTRPCRouter({
  list: hasOrgAccess.query(async ({ ctx }) => {
    return prisma.repository.findMany({
      where: {
        organizationId: ctx.org.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }),

  create: hasOrgAccess
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        url: z.string().url('Invalid URL').refine(validateGithubUrl),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Extract repo name from URL if not provided
      const repoName = input.name || input.url.split('/').pop() || ''

      return prisma.repository.create({
        data: {
          name: repoName,
          url: input.url,
          organizationId: ctx.org.id,
        },
      })
    }),

  update: hasOrgAccess
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Name is required').optional(),
        url: z.string().url('Invalid URL').refine(validateGithubUrl).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, orgSlug, ...data } = input

      // Verify repository belongs to organization
      const repo = await prisma.repository.findFirst({
        where: {
          id,
          organizationId: ctx.org.id,
        },
      })

      if (!repo) {
        throw new Error('Repository not found')
      }

      return prisma.repository.update({
        where: { id },
        data,
      })
    }),

  delete: hasOrgAccess
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify repository belongs to organization
      const repo = await prisma.repository.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.org.id,
        },
      })

      if (!repo) {
        throw new Error('Repository not found')
      }

      return prisma.repository.delete({
        where: { id: input.id },
      })
    }),
})
