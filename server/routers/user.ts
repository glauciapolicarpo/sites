import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export const userRouter = router({
  updateProfile: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(50).optional(),
        avatar_url: z.string().url().max(500).optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.username) {
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);

        if (existing.length > 0 && existing[0].id !== ctx.user.userId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este nome de usuário já está em uso",
          });
        }
      }

      const updateData: Record<string, any> = {};
      if (input.username !== undefined) updateData.username = input.username;
      if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, ctx.user.userId));
      }

      const updated = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.userId))
        .limit(1);

      const u = updated[0];
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        avatar_url: u.avatar_url,
        total_score: u.total_score,
        games_played: u.games_played,
        best_streak: u.best_streak,
      };
    }),

  getProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      const u = result[0];
      return {
        id: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
        total_score: u.total_score,
        games_played: u.games_played,
        best_streak: u.best_streak,
      };
    }),
});
