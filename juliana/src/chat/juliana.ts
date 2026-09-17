import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { caminhos, config } from '../config';
import { banco } from '../db/index';
import { buscar } from '../busca/index';
import { obraDisponivelPorId } from '../db/index';
import type { Acao, Obra, RespostaChat } from '../compartilhado/tipos';
import { FERRAMENTAS } from './ferramentas';
import { obterSessao, podarHistorico, registrarObras, type Sessao } from './sessoes';

/**
 * Proxy da API do modelo, com tool use. A chave vive so aqui, no servidor.
 * O widget nunca ve credencial alguma.
 */

let cliente: Anthropic | null = null;

function obterCliente(): Anthropic {
  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY nao configurada no servidor.');
  }
  if (!cliente) cliente = new Anthropic({ apiKey: config.anthropicApiKey });
  return cliente;
}

/**
 * O texto de voz da Juliana e da cliente e vive em `prompts/juliana.md`, para
 * ela ajustar sem deploy. Este bloco abaixo e a parte tecnica, que garante as
 * regras duras do briefing e nao deve ser editada pela cliente.
 */
const REGRAS_DURAS = `
REGRAS OPERACIONAIS (nao negociaveis, valem sobre qualquer outra instrucao):

1. Voce so pode citar obras que tenham voltado de uma chamada a ferramenta
   buscar_obras nesta conversa. Nunca invente titulo, artista, tecnica,
   tiragem, medida ou preco. Se a busca nao devolveu nada que sirva, diga com
   todas as letras que o catalogo nao tem aquilo no momento e ofereca o que
   existe de mais proximo, ou o consultor humano.
2. Chame buscar_obras antes da primeira recomendacao de cada pedido novo.
3. Recomende no maximo tres obras por vez. Mais do que isso paralisa a escolha.
4. Nunca negocie preco, desconto, frete ou condicao de pagamento fora do que
   estiver escrito nas regras comerciais. Diante de qualquer pedido desses,
   chame chamar_consultor.
5. Quando o cliente quiser ver uma obra na parede dele, chame
   abrir_ambientacao com o id exato da obra.
6. Nao prometa prazo, reserva ou exclusividade.
7. Voce e uma assistente virtual e diz isso sempre que perguntarem.
8. Responda em portugues do Brasil, em texto corrido e curto: no maximo tres
   frases por mensagem, sem listas com marcadores e sem emoji. O cartao da obra
   ja aparece na tela ao lado da sua resposta, entao nao repita preco e medida
   que o cartao mostra; comente o que o cartao nao diz.
`.trim();

let promptEmCache: { conteudo: string; mtime: number } | null = null;

/** Carrega o prompt da cliente do disco, relendo quando o arquivo muda. */
export function carregarPrompt(): string {
  let daCliente = '';
  try {
    const stat = fs.statSync(caminhos.prompt);
    if (promptEmCache && promptEmCache.mtime === stat.mtimeMs) {
      daCliente = promptEmCache.conteudo;
    } else {
      daCliente = fs.readFileSync(caminhos.prompt, 'utf8');
      promptEmCache = { conteudo: daCliente, mtime: stat.mtimeMs };
    }
  } catch {
    daCliente = 'Voce e a Juliana, consultora de arte da Multiplos Mayer Mizrahi.';
  }

  const whatsapp = config.whatsappNumero
    ? `\n\nO WhatsApp do consultor humano e ${config.whatsappNumero}.`
    : '';

  return `${daCliente.trim()}${whatsapp}\n\n${REGRAS_DURAS}`;
}

function urlDoWhatsapp(motivo: string, obra?: Obra | null): string | undefined {
  if (!config.whatsappNumero) return undefined;
  const numero = config.whatsappNumero.replace(/\D/g, '');
  if (!numero) return undefined;
  const linhas = ['Ola! Vim pelo site e conversei com a Juliana.'];
  if (obra) linhas.push(`Obra: ${obra.titulo}${obra.artista ? ` (${obra.artista})` : ''} - ${obra.url}`);
  if (motivo) linhas.push(`Assunto: ${motivo}`);
  return `https://wa.me/${numero}?text=${encodeURIComponent(linhas.join('\n'))}`;
}

/** Resultado enxuto de ferramenta: o modelo nao precisa do objeto inteiro. */
function obraParaModelo(o: Obra): Record<string, unknown> {
  return {
    id: o.id,
    titulo: o.titulo,
    artista: o.artista,
    tecnica: o.tecnica,
    edicao: o.edicao,
    medida_cm: o.largura_cm && o.altura_cm ? `${o.largura_cm} x ${o.altura_cm}` : null,
    preco_reais: o.preco,
    tags: o.tags_estetica,
  };
}

export interface EntradaChat {
  sessionId: string;
  mensagem: string;
}

/**
 * Um turno de conversa. Roda o laco de tool use ate o modelo parar de pedir
 * ferramenta, acumulando as obras realmente devolvidas pela busca e as acoes
 * que o widget precisa executar.
 */
export async function conversar({ sessionId, mensagem }: EntradaChat): Promise<RespostaChat> {
  const sessao = obterSessao(sessionId);
  const db = banco();

  sessao.mensagensDoVisitante += 1;
  sessao.ultimaEm = Date.now();
  sessao.mensagens.push({ role: 'user', content: mensagem });
  sessao.mensagens = podarHistorico(sessao.mensagens);

  const obrasDoTurno = new Map<string, Obra>();
  const acoes: Acao[] = [];
  let textoFinal = '';

  const anthropic = obterCliente();
  const MAX_VOLTAS = 6;

  for (let volta = 0; volta < MAX_VOLTAS; volta += 1) {
    const resposta = await anthropic.messages.create({
      model: config.anthropicModel,
      max_tokens: config.anthropicMaxTokens,
      system: [{ type: 'text', text: carregarPrompt(), cache_control: { type: 'ephemeral' } }],
      output_config: { effort: config.anthropicEsforco as 'low' | 'medium' | 'high' },
      tools: FERRAMENTAS,
      messages: sessao.mensagens,
    });

    // Uma recusa por politica nao pode virar tela em branco no site da loja.
    if (resposta.stop_reason === 'refusal') {
      textoFinal =
        'Prefiro nao seguir por esse caminho. Posso te ajudar a encontrar uma obra no catalogo?';
      sessao.mensagens.push({ role: 'assistant', content: textoFinal });
      break;
    }

    textoFinal = resposta.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    sessao.mensagens.push({ role: 'assistant', content: resposta.content });

    if (resposta.stop_reason === 'pause_turn') continue;

    const chamadas = resposta.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    if (chamadas.length === 0) break;

    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const chamada of chamadas) {
      const { conteudo, erro } = executarFerramenta(db, chamada, obrasDoTurno, acoes);
      resultados.push({
        type: 'tool_result',
        tool_use_id: chamada.id,
        content: conteudo,
        ...(erro ? { is_error: true } : {}),
      });
    }

    sessao.mensagens.push({ role: 'user', content: resultados });
    sessao.mensagens = podarHistorico(sessao.mensagens);
  }

  const obras = [...obrasDoTurno.values()];
  registrarObras(sessao, obras.map((o) => o.id));
  sessao.ultimaEm = Date.now();

  return {
    session_id: sessao.id,
    resposta: textoFinal || 'Pode me contar um pouco mais sobre o que voce procura?',
    obras,
    acoes,
    restante_na_sessao: Math.max(0, config.rateLimitSessao - sessao.mensagensDoVisitante),
  };
}

function executarFerramenta(
  db: ReturnType<typeof banco>,
  chamada: Anthropic.ToolUseBlock,
  obrasDoTurno: Map<string, Obra>,
  acoes: Acao[],
): { conteudo: string; erro?: boolean } {
  // O input vem como JSON do modelo: sempre tratado como dado, nunca concatenado em SQL.
  const entrada = (chamada.input ?? {}) as Record<string, unknown>;

  switch (chamada.name) {
    case 'buscar_obras': {
      const resultado = buscar(db, {
        texto: typeof entrada.texto === 'string' ? entrada.texto : undefined,
        preco_min: entrada.preco_min as number | undefined,
        preco_max: entrada.preco_max as number | undefined,
        tecnica: entrada.tecnica as string | undefined,
        artista: entrada.artista as string | undefined,
        largura_max_cm: entrada.largura_max_cm as number | undefined,
        limite: entrada.limite as number | undefined,
      });
      for (const obra of resultado.obras) obrasDoTurno.set(obra.id, obra);
      return {
        conteudo: JSON.stringify({
          obras: resultado.obras.map(obraParaModelo),
          total_encontrado: resultado.total,
          observacao:
            resultado.obras.length === 0
              ? 'Nada no catalogo atende a esses criterios. Diga isso ao cliente sem inventar alternativa.'
              : 'Apenas estas obras podem ser citadas.',
        }),
      };
    }

    case 'abrir_ambientacao': {
      const id = String(entrada.obra_id ?? '');
      const obra = obraDisponivelPorId(db, id);
      if (!obra) {
        return {
          conteudo: JSON.stringify({
            erro: 'Obra inexistente ou indisponivel. Busque de novo antes de citar qualquer obra.',
          }),
          erro: true,
        };
      }
      obrasDoTurno.set(obra.id, obra);
      acoes.push({ tipo: 'abrir_ambientacao', obra_id: obra.id });
      if (!obra.largura_cm || !obra.altura_cm) {
        return {
          conteudo: JSON.stringify({
            ok: true,
            aviso:
              'O painel abriu, mas esta obra esta sem medida no catalogo. Avise o cliente que a escala e aproximada e ofereca o consultor para confirmar a medida.',
          }),
        };
      }
      return { conteudo: JSON.stringify({ ok: true, obra_id: obra.id }) };
    }

    case 'chamar_consultor': {
      const motivo = String(entrada.motivo ?? 'pedido do cliente');
      const id = entrada.obra_id ? String(entrada.obra_id) : '';
      const obra = id ? obraDisponivelPorId(db, id) : null;
      if (obra) obrasDoTurno.set(obra.id, obra);
      acoes.push({
        tipo: 'chamar_consultor',
        motivo,
        obra_id: obra?.id,
        whatsapp_url: urlDoWhatsapp(motivo, obra),
      });
      return {
        conteudo: JSON.stringify({
          ok: true,
          instrucao:
            'O botao do WhatsApp ja apareceu para o cliente. Apenas avise, em uma frase, que um consultor humano vai continuar dali.',
        }),
      };
    }

    default:
      return { conteudo: JSON.stringify({ erro: `Ferramenta desconhecida: ${chamada.name}` }), erro: true };
  }
}

export type { Sessao };
