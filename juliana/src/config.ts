import path from 'node:path';
import fs from 'node:fs';

/**
 * Configuracao do servico. Todo segredo vive aqui, no servidor, e nunca no
 * bundle do widget. Um .env e lido se existir, sem dependencia externa.
 */

function carregarDotEnv(arquivo: string): void {
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const igual = limpa.indexOf('=');
    if (igual === -1) continue;
    const chave = limpa.slice(0, igual).trim();
    let valor = limpa.slice(igual + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (process.env[chave] === undefined) process.env[chave] = valor;
  }
}

export const RAIZ = path.resolve(process.cwd());
carregarDotEnv(path.join(RAIZ, '.env'));

function texto(chave: string, padrao = ''): string {
  const v = process.env[chave];
  return v === undefined || v === '' ? padrao : v;
}

function inteiro(chave: string, padrao: number): number {
  const v = Number.parseInt(texto(chave, ''), 10);
  return Number.isFinite(v) ? v : padrao;
}

function lista(chave: string, padrao: string[]): string[] {
  const v = texto(chave, '');
  if (!v) return padrao;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export const config = {
  porta: inteiro('PORT', 8787),
  host: texto('HOST', '0.0.0.0'),
  baseUrlPublica: texto('PUBLIC_BASE_URL', 'https://juliana.multiplosmm.com.br').replace(/\/+$/, ''),

  feedUrl: texto('FEED_URL', ''),
  /** `page` usa ?page=N; `offset` usa ?offset=N&limit=L; `auto` tenta os dois. */
  feedModoPaginacao: texto('FEED_MODO_PAGINACAO', 'auto') as 'auto' | 'page' | 'offset' | 'nenhum',
  feedParamPagina: texto('FEED_PARAM_PAGINA', 'page'),
  feedParamOffset: texto('FEED_PARAM_OFFSET', 'offset'),
  feedParamLimite: texto('FEED_PARAM_LIMITE', 'limit'),
  feedTamanhoPagina: inteiro('FEED_TAMANHO_PAGINA', 150),
  feedMaxPaginas: inteiro('FEED_MAX_PAGINAS', 60),
  /** A ingestao falha de forma visivel abaixo deste total. */
  feedMinimoObras: inteiro('FEED_MINIMO_OBRAS', 800),

  anthropicApiKey: texto('ANTHROPIC_API_KEY', ''),
  anthropicModel: texto('ANTHROPIC_MODEL', 'claude-opus-5'),
  /** low | medium | high | xhigh | max. Um atendimento de chat pede latencia baixa. */
  anthropicEsforco: texto('ANTHROPIC_ESFORCO', 'low'),
  anthropicMaxTokens: inteiro('ANTHROPIC_MAX_TOKENS', 2048),

  whatsappNumero: texto('WHATSAPP_NUMERO', ''),

  origensPermitidas: lista('ALLOWED_ORIGINS', [
    'https://www.multiplosmm.com.br',
    'https://multiplosmm.com.br',
  ]),
  rateLimitSessao: inteiro('RATE_LIMIT_SESSAO', 30),
  rateLimitIpHora: inteiro('RATE_LIMIT_IP_HORA', 60),

  /** Teto do corpo do /compose. 8 MB de foto mais folga de base64. */
  maxUploadBytes: inteiro('MAX_UPLOAD_BYTES', 8 * 1024 * 1024),
  /** Lado maior do PNG final. */
  composeLadoMaiorPx: inteiro('COMPOSE_LADO_MAIOR_PX', 2000),
  /** Dias ate o cron apagar uma composicao. */
  composeValidadeDias: inteiro('COMPOSE_VALIDADE_DIAS', 30),

  /** Teto de turnos mantidos em memoria por sessao. */
  maxTurnos: inteiro('MAX_TURNOS', 20),
  /** Minutos de inatividade ate a transcricao ser gravada e a sessao liberada. */
  minutosAteEncerrar: inteiro('MINUTOS_ATE_ENCERRAR', 30),

  versao: texto('npm_package_version', '1.0.0'),
} as const;

export const caminhos = {
  dados: path.join(RAIZ, 'data'),
  banco: path.join(RAIZ, 'data', 'juliana.db'),
  feedLocal: path.join(RAIZ, 'data', 'feed.xml'),
  obras: path.join(RAIZ, 'data', 'obras'),
  composicoes: path.join(RAIZ, 'data', 'composicoes'),
  transcricoes: path.join(RAIZ, 'data', 'transcricoes'),
  semDimensao: path.join(RAIZ, 'data', 'sem_dimensao.csv'),
  dimensoesOverride: path.join(RAIZ, 'data', 'dimensoes-override.csv'),
  prompt: path.join(RAIZ, 'prompts', 'juliana.md'),
  widget: path.join(RAIZ, 'widget', 'dist'),
} as const;

export function garantirPastas(): void {
  for (const p of [
    caminhos.dados,
    caminhos.obras,
    caminhos.composicoes,
    caminhos.transcricoes,
  ]) {
    fs.mkdirSync(p, { recursive: true });
  }
}
