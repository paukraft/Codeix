import { z } from 'zod'
import { createTRPCRouter } from '../trpc'
import { hasOrgAccess } from '../trpc-procedures'

export const Router = createTRPCRouter({
  query: hasOrgAccess.input(z.object({})).query(async ({ ctx, input }) => {}),
  mutation: hasOrgAccess
    .input(z.object({}))
    .mutation(async ({ ctx, input }) => {}),
})
