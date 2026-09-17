import type { FastifyInstance } from 'fastify';
import { config } from '../config';
import { conversar } from '../chat/juliana';
import { encerrarSessao, novoIdDeSessao, obterSessao } from '../chat/sessoes';
import { ipDoPedido, limitarPorIp, limitarPorSessao } from '../lib/limites';

/**
 * POST /chat
 * Proxy da API do modelo. A chave nunca sai do servidor.
 */
export async function rotaChat(app: FastifyInstance): Promise<void> {
  app.post('/chat', async (pedido, resposta) => {
    const corpo = (pedido.body ?? {}) as { session_id?: unknown; mensagem?: unknown };

    const mensagem = typeof corpo.mensagem === 'string' ? corpo.mensagem.trim() : '';
    if (!mensagem) {
      return resposta.status(400).send({ erro: 'Campo "mensagem" e obrigatorio.' });
    }
    if (mensagem.length > 2000) {
      return resposta.status(400).send({ erro: 'Mensagem longa demais.' });
    }

    const ip = ipDoPedido(pedido.headers as Record<string, unknown>, pedido.ip);
    const porIp = limitarPorIp(ip);
    if (!porIp.permitido) {
      return resposta.status(429).send({ erro: porIp.motivo });
    }

    const sessionId =
      typeof corpo.session_id === 'string' && /^[\w-]{8,64}$/.test(corpo.session_id)
        ? corpo.session_id
        : novoIdDeSessao();

    const sessao = obterSessao(sessionId);
    const porSessao = limitarPorSessao(sessao.mensagensDoVisitante);
    if (!porSessao.permitido) {
      return resposta.status(429).send({
        erro: porSessao.motivo,
        session_id: sessionId,
        limite_atingido: true,
      });
    }

    if (!config.anthropicApiKey) {
      pedido.log.error('ANTHROPIC_API_KEY ausente: /chat indisponivel');
      return resposta.status(503).send({
        erro: 'O atendimento esta temporariamente indisponivel. Tente novamente em instantes.',
      });
    }

    try {
      return await conversar({ sessionId, mensagem });
    } catch (erro) {
      // O detalhe vai para o log do servidor; o visitante recebe texto neutro.
      pedido.log.error({ erro: (erro as Error).message }, 'falha no turno de chat');
      return resposta.status(502).send({
        erro: 'Nao consegui responder agora. Pode tentar de novo?',
        session_id: sessionId,
      });
    }
  });

  /** Encerra a conversa e grava a transcricao. O widget chama ao fechar. */
  app.post('/chat/encerrar', async (pedido, resposta) => {
    const corpo = (pedido.body ?? {}) as { session_id?: unknown };
    if (typeof corpo.session_id === 'string') encerrarSessao(corpo.session_id, 'pedido');
    return resposta.status(204).send();
  });
}
