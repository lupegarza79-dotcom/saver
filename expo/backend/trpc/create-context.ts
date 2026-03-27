import { initTRPC } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get('authorization');
  const userId = opts.req.headers.get('x-user-id');
  
  return {
    req: opts.req,
    authHeader,
    userId,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    console.log('[TRPC] No userId in context, allowing anyway for now');
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId || 'anonymous',
    },
  });
});

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const adminToken = process.env.ADMIN_TOKEN;
  
  if (!adminToken) {
    console.error('[ADMIN] ADMIN_TOKEN not configured - blocking all admin access');
    throw new Error('Admin access not configured. Set ADMIN_TOKEN in environment.');
  }
  
  const providedToken = ctx.authHeader?.replace('Bearer ', '') || '';
  
  if (providedToken !== adminToken) {
    console.warn('[ADMIN] Invalid admin token attempt');
    throw new Error('Unauthorized: Invalid admin token');
  }
  
  console.log('[ADMIN] Access granted');
  return next({ ctx });
});
