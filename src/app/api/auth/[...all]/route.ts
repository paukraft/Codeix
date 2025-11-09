import { betterAuthServer } from '@/server/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { POST, GET } = toNextJsHandler(betterAuthServer)
