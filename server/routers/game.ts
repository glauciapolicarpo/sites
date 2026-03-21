import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import {
  clues,
  countries,
  gameSessions,
  gameRounds,
  users,
  leaderboard,
} from "../db/schema.js";

export const gameRouter = router({
  startGame: protectedProcedure.mutation(async ({ ctx }) => {
    // Get all countries (always Argentina, Chile, Peru)
    const allCountries = await db.select().from(countries);
    if (allCountries.length < 3) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Países não encontrados. Execute o seed primeiro.",
      });
    }

    const countryIds = allCountries.map((c) => c.id);

    // Get all clues and pick 10 random ones
    const allClues = await db.select().from(clues);
    if (allClues.length < 10) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Pistas insuficientes. Execute o seed primeiro.",
      });
    }

    // Shuffle and pick 10
    const shuffled = allClues.sort(() => Math.random() - 0.5);
    const selectedClues = shuffled.slice(0, 10);

    // Create game session
    const sessionResult = await db.insert(gameSessions).values({
      user_id: ctx.user.userId,
      status: "in_progress",
      current_round: 1,
      total_rounds: 10,
      score: 0,
      streak: 0,
      best_streak: 0,
    });

    const sessionId = sessionResult[0].insertId;

    // Create rounds
    for (let i = 0; i < selectedClues.length; i++) {
      const clue = selectedClues[i];
      await db.insert(gameRounds).values({
        session_id: sessionId,
        round_number: i + 1,
        clue_id: clue.id,
        option_countries: countryIds,
        correct_country_id: clue.country_id,
      });
    }

    return {
      sessionId,
      totalRounds: 10,
      currentRound: 1,
    };
  }),

  getRound: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        roundNumber: z.number().min(1).max(10),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify session belongs to user
      const session = await db
        .select()
        .from(gameSessions)
        .where(
          and(
            eq(gameSessions.id, input.sessionId),
            eq(gameSessions.user_id, ctx.user.userId)
          )
        )
        .limit(1);

      if (session.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão não encontrada",
        });
      }

      if (session[0].status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta sessão já foi finalizada",
        });
      }

      // Get the round
      const round = await db
        .select()
        .from(gameRounds)
        .where(
          and(
            eq(gameRounds.session_id, input.sessionId),
            eq(gameRounds.round_number, input.roundNumber)
          )
        )
        .limit(1);

      if (round.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rodada não encontrada",
        });
      }

      // Get clue info
      const clueResult = await db
        .select()
        .from(clues)
        .where(eq(clues.id, round[0].clue_id))
        .limit(1);

      if (clueResult.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Pista não encontrada",
        });
      }

      // Get country options
      const allCountries = await db.select().from(countries);

      const countryOptions = allCountries.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        flag_emoji: c.flag_emoji || "",
      }));

      return {
        roundNumber: input.roundNumber,
        totalRounds: session[0].total_rounds,
        clueText: clueResult[0].clue_text,
        category: clueResult[0].category,
        difficulty: clueResult[0].difficulty,
        pointsValue: clueResult[0].points_value,
        countries: countryOptions,
        timeLimit: 30,
        score: session[0].score,
        streak: session[0].streak,
        alreadyAnswered: round[0].selected_country_id !== null,
      };
    }),

  submitAnswer: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        roundNumber: z.number().min(1).max(10),
        selectedCountryId: z.number(),
        timeTakenMs: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify session
      const sessionArr = await db
        .select()
        .from(gameSessions)
        .where(
          and(
            eq(gameSessions.id, input.sessionId),
            eq(gameSessions.user_id, ctx.user.userId)
          )
        )
        .limit(1);

      if (sessionArr.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão não encontrada",
        });
      }

      const session = sessionArr[0];

      if (session.status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta sessão já foi finalizada",
        });
      }

      // Get round
      const roundArr = await db
        .select()
        .from(gameRounds)
        .where(
          and(
            eq(gameRounds.session_id, input.sessionId),
            eq(gameRounds.round_number, input.roundNumber)
          )
        )
        .limit(1);

      if (roundArr.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rodada não encontrada",
        });
      }

      const round = roundArr[0];

      if (round.selected_country_id !== null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta rodada já foi respondida",
        });
      }

      const isCorrect = input.selectedCountryId === round.correct_country_id;

      // Get clue for points
      const clueArr = await db
        .select()
        .from(clues)
        .where(eq(clues.id, round.clue_id))
        .limit(1);

      const basePoints = clueArr[0]?.points_value || 10;

      // Calculate streak and points
      let newStreak = isCorrect ? session.streak + 1 : 0;
      let streakBonus = 0;

      if (isCorrect && newStreak > 1) {
        streakBonus = Math.floor(basePoints * (newStreak - 1) * 0.5);
      }

      const pointsEarned = isCorrect ? basePoints + streakBonus : 0;
      const newScore = session.score + pointsEarned;
      const newBestStreak = Math.max(session.best_streak, newStreak);

      // Update round
      await db
        .update(gameRounds)
        .set({
          selected_country_id: input.selectedCountryId,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          time_taken_ms: input.timeTakenMs,
          answered_at: new Date(),
        })
        .where(eq(gameRounds.id, round.id));

      // Check if game is complete
      const isLastRound = input.roundNumber >= session.total_rounds;

      // Update session
      await db
        .update(gameSessions)
        .set({
          current_round: isLastRound ? session.total_rounds : input.roundNumber + 1,
          score: newScore,
          streak: newStreak,
          best_streak: newBestStreak,
          status: isLastRound ? "completed" : "in_progress",
          finished_at: isLastRound ? new Date() : null,
        })
        .where(eq(gameSessions.id, input.sessionId));

      // If game complete, update user stats and leaderboard
      if (isLastRound) {
        // Count correct answers
        const rounds = await db
          .select()
          .from(gameRounds)
          .where(eq(gameRounds.session_id, input.sessionId));

        const correctAnswers = rounds.filter((r) => r.is_correct).length;

        // Update user stats
        await db
          .update(users)
          .set({
            total_score: sql`total_score + ${newScore}`,
            games_played: sql`games_played + 1`,
            best_streak: sql`GREATEST(best_streak, ${newBestStreak})`,
          })
          .where(eq(users.id, ctx.user.userId));

        // Add to leaderboard
        await db.insert(leaderboard).values({
          user_id: ctx.user.userId,
          score: newScore,
          rounds_played: session.total_rounds,
          correct_answers: correctAnswers,
          best_streak: newBestStreak,
        });
      }

      return {
        isCorrect,
        correctCountryId: round.correct_country_id,
        pointsEarned,
        streak: newStreak,
        totalScore: newScore,
        streakBonus,
        isGameOver: isLastRound,
      };
    }),

  getSessionResult: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input, ctx }) => {
      const sessionArr = await db
        .select()
        .from(gameSessions)
        .where(
          and(
            eq(gameSessions.id, input.sessionId),
            eq(gameSessions.user_id, ctx.user.userId)
          )
        )
        .limit(1);

      if (sessionArr.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sessão não encontrada",
        });
      }

      const session = sessionArr[0];

      // Get all rounds with clue and country info
      const rounds = await db
        .select()
        .from(gameRounds)
        .where(eq(gameRounds.session_id, input.sessionId));

      const allClues = await db.select().from(clues);
      const allCountries = await db.select().from(countries);

      const roundResults = rounds
        .sort((a, b) => a.round_number - b.round_number)
        .map((r) => {
          const clue = allClues.find((c) => c.id === r.clue_id);
          const correctCountry = allCountries.find((c) => c.id === r.correct_country_id);
          const selectedCountry = r.selected_country_id
            ? allCountries.find((c) => c.id === r.selected_country_id)
            : null;

          return {
            roundNumber: r.round_number,
            clueText: clue?.clue_text || "",
            category: clue?.category || "cultura",
            correctCountry: correctCountry?.name || "",
            selectedCountry: selectedCountry?.name || null,
            isCorrect: r.is_correct || false,
            pointsEarned: r.points_earned,
            timeTakenMs: r.time_taken_ms,
          };
        });

      const correctAnswers = roundResults.filter((r) => r.isCorrect).length;
      const totalTime = roundResults.reduce(
        (sum, r) => sum + (r.timeTakenMs || 0),
        0
      );

      return {
        sessionId: session.id,
        score: session.score,
        totalRounds: session.total_rounds,
        correctAnswers,
        bestStreak: session.best_streak,
        rounds: roundResults,
        timeTaken: totalTime,
      };
    }),
});
