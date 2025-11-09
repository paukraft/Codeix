import {
  createCallerFactory,
  createTRPCRouter,
  publicProcedure,
} from '@/server/api/trpc'
import { agentSessionRouter } from './routers/agent-session-router'
import { organizationRouter } from './routers/organization-router'
import { repositoryRouter } from './routers/repository-router'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { ok: true }
  }),
  organization: organizationRouter,
  repository: repositoryRouter,
  agentSession: agentSessionRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter)
