import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { db } from "../db/index.js";
import { clues, countries } from "../db/schema.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Stable system prompt — cached on first use via cache_control
const SYSTEM_PROMPT = `Você é um criador de enunciados para um game show de trivia em português brasileiro sobre países da América do Sul (Argentina, Chile e Peru).
Dado uma resposta (o nome de um país), crie um enunciado que serve como dica para o jogador.

Regras obrigatórias:
- Máximo de 90 caracteres
- Linguagem fluída e oral (será lido em voz alta)
- 90% Inteligente e 10% criativo — não seja técnico demais
- Não revele o nome do país no enunciado
- Retorne APENAS o enunciado, sem explicações ou pontuação extra
- Não faça em forma de pergunta
- Não termine em exclamação
- Termine a frase em ponto final`;

async function callClaude(answer: string, context?: string): Promise<string> {
  const userContent = [
    context ? `Contexto adicional:\n${context.slice(0, 1500)}\n\n` : "",
    `Resposta: ${answer}\nEnunciado:`,
  ]
    .filter(Boolean)
    .join("");

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 200,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // Cache the stable system prompt — avoids re-tokenizing on every request
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Resposta inesperada da API Anthropic",
    });
  }

  return textBlock.text.trim();
}

export const statementsRouter = router({
  // Generate a clue text for any given answer string (preview without saving)
  generateClueText: protectedProcedure
    .input(
      z.object({
        answer: z.string().min(1).max(200),
        context: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ANTHROPIC_API_KEY não configurada no servidor",
        });
      }

      try {
        const clueText = await callClaude(input.answer, input.context);
        return { clueText };
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Erro na API Anthropic (${error.status}): ${error.message}`,
          });
        }
        throw error;
      }
    }),

  // Generate and save clue text for an existing clue record by ID
  generateAndSaveClue: protectedProcedure
    .input(
      z.object({
        clueId: z.number().int().positive(),
        context: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ANTHROPIC_API_KEY não configurada no servidor",
        });
      }

      // Fetch clue + country name
      const rows = await db
        .select({
          clueId: clues.id,
          countryName: countries.name,
          currentText: clues.clue_text,
        })
        .from(clues)
        .innerJoin(countries, eq(clues.country_id, countries.id))
        .where(eq(clues.id, input.clueId))
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dica não encontrada",
        });
      }

      const { countryName } = rows[0];

      try {
        const clueText = await callClaude(countryName, input.context);

        await db
          .update(clues)
          .set({ clue_text: clueText })
          .where(eq(clues.id, input.clueId));

        return { clueId: input.clueId, clueText };
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Erro na API Anthropic (${error.status}): ${error.message}`,
          });
        }
        throw error;
      }
    }),

  // Batch: generate and save clue texts for all clues of a given country
  batchGenerateByCountry: protectedProcedure
    .input(
      z.object({
        countryId: z.number().int().positive(),
        overwriteExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ANTHROPIC_API_KEY não configurada no servidor",
        });
      }

      const rows = await db
        .select({
          clueId: clues.id,
          countryName: countries.name,
          currentText: clues.clue_text,
        })
        .from(clues)
        .innerJoin(countries, eq(clues.country_id, countries.id))
        .where(eq(clues.country_id, input.countryId));

      if (rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhuma dica encontrada para este país",
        });
      }

      const toProcess = input.overwriteExisting
        ? rows
        : rows.filter((r) => !r.currentText || r.currentText.trim() === "");

      const results: Array<{ clueId: number; clueText: string; error?: string }> = [];

      for (const row of toProcess) {
        try {
          const clueText = await callClaude(row.countryName);
          await db
            .update(clues)
            .set({ clue_text: clueText })
            .where(eq(clues.id, row.clueId));
          results.push({ clueId: row.clueId, clueText });
        } catch (error) {
          const message =
            error instanceof Anthropic.APIError
              ? `API error ${error.status}: ${error.message}`
              : String(error);
          results.push({ clueId: row.clueId, clueText: "", error: message });
        }
      }

      return {
        processed: results.filter((r) => !r.error).length,
        errors: results.filter((r) => r.error).length,
        results,
      };
    }),
});
