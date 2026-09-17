import type { BancoJuliana } from '../db/index';

/**
 * Interface de ranqueamento isolada de proposito. Com menos de mil itens o
 * FTS5 entrega qualidade suficiente; quando o catalogo crescer, basta trocar a
 * implementacao por embeddings sem mexer em /search nem no /chat.
 */
export interface Ranqueador {
  readonly nome: string;
  /**
   * Devolve os ids candidatos ordenados por relevancia ao texto, do melhor
   * para o pior. Ids sem relevancia alguma ficam de fora.
   */
  ranquear(db: BancoJuliana, texto: string, idsCandidatos: string[]): string[];
}

/** Palavras que so adicionam ruido a uma consulta de catalogo em portugues. */
const VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'pra', 'com', 'sem', 'que', 'e',
  'ou', 'ao', 'aos', 'a', 'me', 'meu', 'minha', 'meus', 'minhas', 'quero', 'queria',
  'gostaria', 'procuro', 'buscando', 'algo', 'alguma', 'algum', 'coisa', 'tem',
  'tenho', 'ter', 'seja', 'ser', 'e', 'esta', 'este', 'isso', 'muito', 'mais',
  'ate', 'sobre', 'como', 'qual', 'quais', 'obra', 'obras', 'quadro', 'quadros',
  'arte', 'peca', 'pecas',
]);

/**
 * Traduz texto livre em portugues para uma expressao MATCH do FTS5.
 * Acentos ja sao normalizados pelo tokenizador (remove_diacritics 2), entao
 * "geometrico" e "geométrico" caem no mesmo token.
 */
export function consultaFts(texto: string): string {
  const termos = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !VAZIAS.has(t))
    .slice(0, 12);

  if (termos.length === 0) return '';
  // Prefixo em cada termo: "geomet" casa com "geometrico" e "geometria".
  return termos.map((t) => `"${t}"*`).join(' OR ');
}

/**
 * Ranqueamento por BM25 do SQLite sobre titulo, artista, descricao e tags.
 * Os pesos privilegiam titulo e artista, que sao como o cliente nomeia a obra.
 */
export class RanqueadorFts5 implements Ranqueador {
  readonly nome = 'fts5-bm25';

  ranquear(db: BancoJuliana, texto: string, idsCandidatos: string[]): string[] {
    const match = consultaFts(texto);
    if (!match || idsCandidatos.length === 0) return [];

    const permitidos = new Set(idsCandidatos);
    let linhas: { id: string }[];
    try {
      linhas = db
        .prepare(
          `SELECT id
             FROM obras_fts
            WHERE obras_fts MATCH ?
            ORDER BY bm25(obras_fts, 0.0, 8.0, 6.0, 2.0, 4.0) ASC
            LIMIT 400`,
        )
        .all(match) as { id: string }[];
    } catch {
      // Expressao invalida chega aqui; melhor devolver nada do que derrubar a busca.
      return [];
    }

    return linhas.map((l) => l.id).filter((id) => permitidos.has(id));
  }
}

export const ranqueadorPadrao: Ranqueador = new RanqueadorFts5();
