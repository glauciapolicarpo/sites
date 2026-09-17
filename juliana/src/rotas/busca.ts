import type { FastifyInstance } from 'fastify';
import { banco } from '../db/index';
import { buscar } from '../busca/index';
import type { FiltroBusca } from '../compartilhado/tipos';

/**
 * POST /search
 * Uso interno, chamado pelo modelo como ferramenta, e util para depuracao.
 * So devolve obras disponiveis.
 */
export async function rotaBusca(app: FastifyInstance): Promise<void> {
  app.post('/search', async (pedido, resposta) => {
    const corpo = (pedido.body ?? {}) as FiltroBusca;
    try {
      const resultado = buscar(banco(), corpo);
      return resultado;
    } catch (erro) {
      pedido.log.error({ erro }, 'falha na busca');
      return resposta.status(500).send({ erro: 'Nao foi possivel consultar o catalogo.' });
    }
  });
}
