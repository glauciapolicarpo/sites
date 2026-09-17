import type Anthropic from '@anthropic-ai/sdk';

/**
 * Ferramentas expostas ao modelo. `buscar_obras` roda no servidor; as outras
 * duas sao acoes de interface: o servidor confirma ao modelo que a acao foi
 * encaminhada e devolve a instrucao ao widget.
 */
export const FERRAMENTAS: Anthropic.Tool[] = [
  {
    name: 'buscar_obras',
    description:
      'Busca obras disponiveis no catalogo. Use sempre antes de mencionar qualquer obra. ' +
      'Nunca cite obra que nao tenha vindo desta busca.',
    input_schema: {
      type: 'object',
      properties: {
        texto: {
          type: 'string',
          description:
            'Descricao livre do que o cliente quer, em portugues. Ex.: "geometrico colorido para sala".',
        },
        preco_min: { type: 'number', description: 'Preco minimo em reais.' },
        preco_max: { type: 'number', description: 'Preco maximo em reais.' },
        tecnica: { type: 'string', description: 'Ex.: serigrafia, gravura, fotografia.' },
        artista: { type: 'string', description: 'Nome ou parte do nome do artista.' },
        largura_max_cm: {
          type: 'number',
          description: 'Largura maxima da obra em cm, quando o cliente informa o espaco.',
        },
        limite: {
          type: 'number',
          description: 'Quantas obras devolver. O padrao e 3, que e o ideal para o cliente comparar.',
        },
      },
    },
  },
  {
    name: 'abrir_ambientacao',
    description: 'Abre o painel de ambientacao com a obra escolhida.',
    input_schema: {
      type: 'object',
      properties: {
        obra_id: { type: 'string', description: 'Id da obra, exatamente como veio de buscar_obras.' },
      },
      required: ['obra_id'],
    },
  },
  {
    name: 'chamar_consultor',
    description:
      'Passa o atendimento para consultor humano no WhatsApp. Use para pedido de desconto, ' +
      'condicao de pagamento fora do padrao, obra fora de catalogo, ou pedido explicito.',
    input_schema: {
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Por que o atendimento esta sendo passado.' },
        obra_id: { type: 'string', description: 'Obra em discussao, se houver.' },
      },
      required: ['motivo'],
    },
  },
];
