import { adminRoles } from '@/lib/is-org-admin'
import { auth } from '@/server/auth'
import { prisma } from '@/server/db'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { publicProcedure, TrpcContext } from './trpc'

export const authedProcedure = publicProcedure.use(
  async function isAuthed(opts) {
    const authData = await auth()

    if (!authData.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    return opts.next({
      ctx: {
        user: authData.user,
        session: authData.session,
      },
    })
  },
)

export const hasOrgAccessOrgSlugOptional = authedProcedure
  .input(
    z.object({
      orgSlug: z.string().optional(),
    }),
  )
  .use(async ({ ctx, input, next }) => {
    const member = await prisma.member.findFirst({
      where: {
        userId: ctx.user.id,
        organization: {
          slug: input.orgSlug,
        },
      },
    })

    if (!member && !isGigaAdmin({ ctx })) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No access to this organization',
      })
    }

    const org = input.orgSlug
      ? await prisma.organization.findUnique({
          where: {
            slug: input.orgSlug,
          },
        })
      : undefined

    return next({
      ctx: {
        ...ctx,
        org,
        member,
      },
    })
  })

export const hasOrgAccess = hasOrgAccessOrgSlugOptional
  .input(
    z.object({
      orgSlug: z.string(),
    }),
  )
  .use(async ({ ctx, input, next }) => {
    if (!input.orgSlug || !ctx.org || !ctx.member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No access to this organization',
      })
    }

    return next({
      ctx: {
        ...ctx,
        org: ctx.org,
        member: ctx.member,
      },
    })
  })

const isGigaAdmin = ({ ctx }: { ctx: TrpcContext }) => {
  return ctx.user?.role === 'admin'
}

export const hasAdminOrgAccess = hasOrgAccess.use(async ({ ctx, next }) => {
  if (!adminRoles.includes(ctx.member?.role ?? '') && !isGigaAdmin({ ctx })) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No access to this organization',
    })
  }

  return next()
})

export const isGigaAdminProcedure = authedProcedure.use(
  async ({ ctx, next }) => {
    if (!isGigaAdmin({ ctx })) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No access to this organization',
      })
    }

    return next()
  },
)
