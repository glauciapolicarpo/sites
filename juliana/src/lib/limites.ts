import { config } from '../config';

/**
 * Rate limit em memoria, por IP e por sessao. Sem isso o credito da API
 * evapora numa tarde. O servico roda num processo so no VPS, entao contador
 * em memoria basta e evita mais uma dependencia.
 */

interface Janela {
  contagem: number;
  expiraEm: number;
}

const porIp = new Map<string, Janela>();
const UMA_HORA = 60 * 60 * 1000;

export interface Veredito {
  permitido: boolean;
  motivo?: string;
  restante: number;
}

export function limitarPorIp(ip: string, teto = config.rateLimitIpHora): Veredito {
  const agora = Date.now();
  const atual = porIp.get(ip);

  if (!atual || atual.expiraEm <= agora) {
    porIp.set(ip, { contagem: 1, expiraEm: agora + UMA_HORA });
    return { permitido: true, restante: teto - 1 };
  }

  if (atual.contagem >= teto) {
    return {
      permitido: false,
      motivo: 'Muitas requisicoes deste endereco. Tente de novo em alguns minutos.',
      restante: 0,
    };
  }

  atual.contagem += 1;
  return { permitido: true, restante: teto - atual.contagem };
}

export function limitarPorSessao(mensagensJaEnviadas: number, teto = config.rateLimitSessao): Veredito {
  if (mensagensJaEnviadas >= teto) {
    return {
      permitido: false,
      motivo:
        'Esta conversa chegou ao limite de mensagens. Fale com um consultor humano para continuar o atendimento.',
      restante: 0,
    };
  }
  return { permitido: true, restante: teto - mensagensJaEnviadas };
}

/** Remove janelas vencidas para a memoria nao crescer sem teto. */
export function varrerLimites(): void {
  const agora = Date.now();
  for (const [ip, janela] of porIp) {
    if (janela.expiraEm <= agora) porIp.delete(ip);
  }
}

/** Endereco real do visitante, respeitando o proxy reverso do VPS. */
export function ipDoPedido(headers: Record<string, unknown>, socketIp: string | undefined): string {
  const encaminhado = headers['x-forwarded-for'];
  if (typeof encaminhado === 'string' && encaminhado.length > 0) {
    return encaminhado.split(',')[0]!.trim();
  }
  const real = headers['x-real-ip'];
  if (typeof real === 'string' && real.length > 0) return real.trim();
  return socketIp ?? 'desconhecido';
}
