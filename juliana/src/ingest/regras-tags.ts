/**
 * REGRAS DE CLASSIFICACAO ESTETICA
 * =================================
 * Este arquivo existe para ser editado sem programar. Cada regra olha o
 * titulo, o artista, a tecnica e a descricao da obra e, se encontrar uma das
 * palavras da lista, aplica a tag.
 *
 * Para ajustar a classificacao:
 *   - acrescente ou remova palavras dentro das aspas, separadas por virgula;
 *   - as palavras nao precisam de acento: "geometrico" encontra "geométrico";
 *   - maiusculas e minusculas nao importam;
 *   - a comparacao e por trecho da palavra, entao "geometr" ja encontra
 *     "geometria", "geometrico" e "geometricas".
 *
 * Depois de editar, rode `npm run ingest` para reclassificar o catalogo.
 */

import type { TagEstetica } from '../compartilhado/tipos';

export interface RegraDeTag {
  tag: TagEstetica;
  /** Basta uma destas palavras aparecer para a tag ser aplicada. */
  palavras: string[];
  /** Se alguma destas aparecer, a tag NAO e aplicada, mesmo com acerto acima. */
  excecoes?: string[];
}

export const REGRAS: RegraDeTag[] = [
  {
    tag: 'geometrico',
    palavras: [
      'geometr', 'abstracao geometrica', 'construtiv', 'concretis', 'neoconcret',
      'quadrado', 'triangulo', 'circulo', 'losango', 'linhas', 'linha reta',
      'grade', 'malha', 'modulo', 'simetria', 'diagonal', 'ritmo', 'estrutura',
      'op art', 'cinetic', 'xadrez', 'listras', 'faixas',
    ],
  },
  {
    tag: 'organico',
    palavras: [
      'organic', 'fluid', 'sinuos', 'curva', 'natureza', 'vegeta', 'folha',
      'flor', 'floral', 'botanic', 'paisagem', 'mar', 'agua', 'onda', 'arvore',
      'raiz', 'pedra', 'terra', 'informal', 'gestual', 'mancha', 'respingo',
      'textura natural',
    ],
  },
  {
    tag: 'figurativo',
    palavras: [
      'figurativ', 'retrato', 'figura humana', 'corpo', 'rosto', 'personagem',
      'cena', 'natureza morta', 'animal', 'cavalo', 'passaro', 'peixe',
      'cidade', 'urbano', 'arquitetura', 'casa', 'janela', 'nu ', 'nus',
      'autorretrato', 'mulher', 'homem', 'crianca',
    ],
    excecoes: ['abstrat', 'abstracao'],
  },
  {
    tag: 'cor_forte',
    palavras: [
      'colorid', 'cores vibrantes', 'vibrante', 'saturad', 'vermelho', 'amarelo',
      'azul', 'verde', 'laranja', 'rosa', 'magenta', 'roxo', 'violeta', 'ciano',
      'fluorescente', 'neon', 'policromia', 'multicolor', 'arco-iris',
    ],
    excecoes: ['preto e branco', 'monocrom', 'tons neutros'],
  },
  {
    tag: 'preto_e_branco',
    palavras: [
      'preto e branco', 'p&b', 'pb', 'monocrom', 'preta e branca', 'grafite',
      'nanquim', 'carvao', 'bico de pena', 'gravura em metal', 'xilogravura',
      'agua-forte', 'litografia em preto', 'tons de cinza', 'escala de cinza',
      'neutro', 'tons neutros', 'sepia',
    ],
  },
];

/** Normaliza para comparacao: minusculas, sem acento, espacos colapsados. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Aplica as regras acima e devolve as tags da obra, sem repetir. */
export function classificar(campos: {
  titulo?: string;
  artista?: string;
  tecnica?: string;
  descricao?: string;
}): TagEstetica[] {
  const alvo = normalizar(
    [campos.titulo, campos.artista, campos.tecnica, campos.descricao].filter(Boolean).join(' '),
  );

  const tags: TagEstetica[] = [];
  for (const regra of REGRAS) {
    const bateu = regra.palavras.some((p) => alvo.includes(normalizar(p)));
    if (!bateu) continue;
    const vetado = (regra.excecoes ?? []).some((p) => alvo.includes(normalizar(p)));
    if (vetado) continue;
    if (!tags.includes(regra.tag)) tags.push(regra.tag);
  }
  return tags;
}
