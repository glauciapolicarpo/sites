import { linhaParaObra, type BancoJuliana } from '../db/index';
import type { FiltroBusca, Obra, RespostaBusca } from '../compartilhado/tipos';
import { ranqueadorPadrao, type Ranqueador } from './ranqueador';

const LIMITE_PADRAO = 3;
const LIMITE_MAXIMO = 12;

function numeroOuNulo(v: unknown): number | null {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/**
 * Busca em duas camadas:
 *   1. filtro em SQL para o que e objetivo (preco, tecnica, artista, medida,
 *      disponibilidade);
 *   2. ranqueamento por relevancia textual sobre o conjunto ja filtrado.
 *
 * Regra dura: obra indisponivel nunca sai daqui, em nenhum caminho.
 */
export function buscar(
  db: BancoJuliana,
  filtro: FiltroBusca,
  ranqueador: Ranqueador = ranqueadorPadrao,
): RespostaBusca {
  const condicoes: string[] = ['disponivel = 1'];
  const parametros: unknown[] = [];

  const precoMin = numeroOuNulo(filtro.preco_min);
  if (precoMin !== null) {
    condicoes.push('preco >= ?');
    parametros.push(precoMin);
  }

  const precoMax = numeroOuNulo(filtro.preco_max);
  if (precoMax !== null) {
    condicoes.push('preco <= ?');
    parametros.push(precoMax);
  }

  if (filtro.tecnica) {
    condicoes.push('lower(tecnica) LIKE ?');
    parametros.push(`%${String(filtro.tecnica).toLowerCase()}%`);
  }

  if (filtro.artista) {
    condicoes.push('lower(artista) LIKE ?');
    parametros.push(`%${String(filtro.artista).toLowerCase()}%`);
  }

  const larguraMax = numeroOuNulo(filtro.largura_max_cm);
  if (larguraMax !== null) {
    // Obra sem medida conhecida nao pode ser prometida como cabendo no espaco.
    condicoes.push('largura_cm IS NOT NULL AND largura_cm <= ?');
    parametros.push(larguraMax);
  }

  const tags = Array.isArray(filtro.tags) ? filtro.tags.filter((t) => typeof t === 'string') : [];
  for (const tag of tags.slice(0, 5)) {
    condicoes.push('tags_estetica LIKE ?');
    parametros.push(`%"${tag}"%`);
  }

  const sql = `SELECT * FROM obras WHERE ${condicoes.join(' AND ')}`;
  const candidatas = db.prepare(sql).all(...parametros).map((l) => linhaParaObra(l as never));

  const limite = Math.min(
    Math.max(Number.parseInt(String(filtro.limite ?? LIMITE_PADRAO), 10) || LIMITE_PADRAO, 1),
    LIMITE_MAXIMO,
  );

  const texto = typeof filtro.texto === 'string' ? filtro.texto.trim() : '';
  let ordenadas: Obra[];

  if (texto) {
    const porId = new Map(candidatas.map((o) => [o.id, o]));
    const ranqueadas = ranqueador
      .ranquear(db, texto, [...porId.keys()])
      .map((id) => porId.get(id)!)
      .filter(Boolean);

    // O texto pode nao casar com nada; os filtros objetivos ainda valem, entao
    // o resto do conjunto entra depois das relevantes em vez de sumir.
    const jaEscolhidas = new Set(ranqueadas.map((o) => o.id));
    const resto = candidatas.filter((o) => !jaEscolhidas.has(o.id)).sort(porDestaque);
    ordenadas = [...ranqueadas, ...resto];
  } else {
    ordenadas = [...candidatas].sort(porDestaque);
  }

  return { obras: ordenadas.slice(0, limite), total: candidatas.length };
}

/**
 * Sem texto de busca, a ordem precisa ser estavel e util: obra com medida e
 * recorte pronto ambienta melhor, entao aparece antes; empate pelo preco.
 */
function porDestaque(a: Obra, b: Obra): number {
  const nota = (o: Obra) =>
    (o.largura_cm !== null && o.altura_cm !== null ? 2 : 0) + (o.imagem_local ? 1 : 0);
  const d = nota(b) - nota(a);
  if (d !== 0) return d;
  if (a.preco !== b.preco) return a.preco - b.preco;
  return a.id.localeCompare(b.id);
}

export { ranqueadorPadrao } from './ranqueador';
export type { Ranqueador } from './ranqueador';
