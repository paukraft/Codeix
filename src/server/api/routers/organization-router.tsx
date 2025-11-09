import { prisma } from '@/server/db'
import z from 'zod'
import { createTRPCRouter } from '../trpc'
import {
  authedProcedure,
  hasAdminOrgAccess,
  hasOrgAccess,
} from '../trpc-procedures'

export const organizationRouter = createTRPCRouter({
  getOrganization: hasOrgAccess.query(async ({ ctx }) => {
    return ctx.org
  }),

  getMembers: hasAdminOrgAccess.query(async ({ ctx }) => {
    return prisma.member.findMany({
      where: {
        organizationId: ctx.org.id,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })
  }),

  listInvitations: hasAdminOrgAccess.query(async ({ ctx }) => {
    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: ctx.org.id,
        status: { in: ['pending', 'expired'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Add computed status based on expiration
    const now = new Date()
    return invitations.map((invitation) => ({
      ...invitation,
      isExpired: invitation.expiresAt < now,
      computedStatus:
        invitation.expiresAt < now ? 'expired' : invitation.status,
    }))
  }),

  extendInvitation: hasAdminOrgAccess
    .input(
      z.object({
        invitationId: z.string(),
        extensionDays: z.number().min(1).max(30).default(7),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invitation = await prisma.invitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: ctx.org.id,
        },
      })

      if (!invitation) {
        throw new Error('Invitation not found')
      }

      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + input.extensionDays)

      return prisma.invitation.update({
        where: {
          id: input.invitationId,
        },
        data: {
          expiresAt: newExpiresAt,
          status: 'pending', // Reset status to pending when extending
        },
      })
    }),

  listUserInvitations: authedProcedure.query(async ({ ctx }) => {
    return prisma.invitation.findMany({
      where: {
        email: ctx.user.email,
        status: 'pending',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }),
})
