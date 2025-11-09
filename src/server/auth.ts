import { BouncerAllowEntryType } from '@/prisma/client'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { admin, organization } from 'better-auth/plugins'
import { headers } from 'next/headers'
import { prisma } from './db'
import { sendEmail } from './send-email'

const USE_BOUNCER = false

export const betterAuthServer = betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 5, // 5 minutes
  },
  plugins: [organization(), admin()],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        html: `Click the link to reset your password: ${url}`,
      })
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!USE_BOUNCER) {
        return
      }

      // Only check bouncer for sign-up endpoint (email signup)
      if (ctx.path !== '/sign-up/email') {
        return
      }

      const bouncerEntries = await prisma.bouncerAllowEntry.findMany()

      const fittingBouncerEntry = bouncerEntries.find((entry) => {
        if (entry.type === BouncerAllowEntryType.EXACT_EMAIL_ADDRESS) {
          return entry.value === ctx.body?.email
        }
        if (entry.type === BouncerAllowEntryType.EMAIL_ADDRESS_INCLUDES) {
          return ctx.body?.email.includes(entry.value)
        }
      })

      if (!fittingBouncerEntry) {
        throw new APIError('BAD_REQUEST', {
          message: 'Sorry you are not on the bouncer list',
        })
      }
    }),
  },
})

export const auth = async () => {
  const session = await betterAuthServer.api.getSession({
    headers: await headers(),
  })

  return {
    ...session,
  }
}
