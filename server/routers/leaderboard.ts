import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import { leaderboard, users } from "../db/schema.js";

export const leaderboardRouter = router({
  getTopScores: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const results = await db
        .select({
          id: leaderboard.id,
          username: users.username,
          avatar_url: users.avatar_url,
          score: leaderboard.score,
          rounds_played: leaderboard.rounds_played,
          correct_answers: leaderboard.correct_answers,
          best_streak: leaderboard.best_streak,
          played_at: leaderboard.played_at,
        })
        .from(leaderboard)
        .innerJoin(users, eq(leaderboard.user_id, users.id))
        .orderBy(desc(leaderboard.score))
        .limit(input.limit);

      return results;
    }),

  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.userId))
      .limit(1);

    if (user.length === 0) {
      return null;
    }

    const recentGames = await db
      .select({
        id: leaderboard.id,
        username: users.username,
        avatar_url: users.avatar_url,
        score: leaderboard.score,
        rounds_played: leaderboard.rounds_played,
        correct_answers: leaderboard.correct_answers,
        best_streak: leaderboard.best_streak,
        played_at: leaderboard.played_at,
      })
      .from(leaderboard)
      .innerJoin(users, eq(leaderboard.user_id, users.id))
      .where(eq(leaderboard.user_id, ctx.user.userId))
      .orderBy(desc(leaderboard.played_at))
      .limit(10);

    const totalCorrect = recentGames.reduce(
      (sum, g) => sum + g.correct_answers,
      0
    );

    const u = user[0];
    return {
      total_score: u.total_score,
      games_played: u.games_played,
      best_streak: u.best_streak,
      average_score:
        u.games_played > 0 ? Math.round(u.total_score / u.games_played) : 0,
      total_correct: totalCorrect,
      recent_games: recentGames,
    };
  }),
});
