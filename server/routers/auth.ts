import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { createToken } from "../middleware/auth.js";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(50),
        email: z.string().email().max(100),
        password: z.string().min(6).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingEmail.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este email já está em uso",
        });
      }

      const existingUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (existingUsername.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este nome de usuário já está em uso",
        });
      }

      const password_hash = await bcrypt.hash(input.password, 12);

      const result = await db.insert(users).values({
        username: input.username,
        email: input.email,
        password_hash,
      });

      const insertId = result[0].insertId;

      const token = await createToken({
        userId: insertId,
        email: input.email,
      });

      ctx.res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      return {
        user: {
          id: insertId,
          username: input.username,
          email: input.email,
          avatar_url: null,
          total_score: 0,
          games_played: 0,
          best_streak: 0,
        },
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha incorretos",
        });
      }

      const user = result[0];
      const validPassword = await bcrypt.compare(input.password, user.password_hash);

      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha incorretos",
        });
      }

      const token = await createToken({
        userId: user.id,
        email: user.email,
      });

      ctx.res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
          total_score: user.total_score,
          games_played: user.games_played,
          best_streak: user.best_streak,
        },
      };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie("token", { path: "/" });
    return { success: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.userId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      total_score: user.total_score,
      games_played: user.games_played,
      best_streak: user.best_streak,
    };
  }),
});
