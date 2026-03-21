import { initTRPC, TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import superjson from "superjson";
import { verifyToken, type JWTPayload } from "./middleware/auth.js";

export interface Context {
  req: Request;
  res: Response;
  user: JWTPayload | null;
}

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  let user: JWTPayload | null = null;
  const token = (req as any).cookies?.token;

  if (token) {
    try {
      user = await verifyToken(token);
    } catch {
      // Token invalid, user stays null
    }
  }

  return { req, res, user };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar logado para realizar esta ação",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
