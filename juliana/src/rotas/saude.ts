import type { FastifyInstance } from 'fastify';
import { config } from '../config';
import { banco, lerMeta, totalDeObras } from '../db/index';
import { sessoesAtivas } from '../chat/sessoes';

/**
 * GET /health
 * Versao, data da ultima ingestao bem-sucedida e total de obras indexadas.
 * Responde 503 quando o catalogo esta abaixo do minimo aceitavel, para o
 * monitoramento do VPS pegar uma ingestao quebrada sem alguem olhar log.
 */
export async function rotaSaude(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_pedido, resposta) => {
    let total = 0;
    let disponiveis = 0;
    let ultimaIngestao: string | null = null;
    let erro: string | null = null;

    try {
      const db = banco();
      total = totalDeObras(db);
      disponiveis = totalDeObras(db, true);
      ultimaIngestao = lerMeta(db, 'ultima_ingestao');
    } catch (e) {
      erro = (e as Error).message;
    }

    const saudavel = erro === null && total >= config.feedMinimoObras;
    return resposta.status(saudavel ? 200 : 503).send({
      ok: saudavel,
      versao: config.versao,
      modelo: config.anthropicModel,
      ultima_ingestao: ultimaIngestao,
      obras_indexadas: total,
      obras_disponiveis: disponiveis,
      minimo_aceitavel: config.feedMinimoObras,
      sessoes_ativas: sessoesAtivas(),
      chave_do_modelo_configurada: config.anthropicApiKey.length > 0,
      erro,
    });
  });
}
