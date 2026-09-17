import fs from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { caminhos, config } from '../config';

/**
 * Leitura do feed XML do Google Shopping.
 *
 * Ponto conhecido do briefing: uma requisicao isolada devolve cerca de 150
 * itens e o catalogo tem 927. A Plataforma Neo nao documenta o parametro de
 * paginacao, entao a estrategia aqui e: tentar `page`, tentar `offset` e, se
 * nenhum dos dois mudar o conteudo, parar e deixar a ingestao falhar de forma
 * visivel no lugar de indexar um catalogo pela metade.
 */

export type ItemFeed = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  trimValues: true,
  // `g:id` e `id` sao campos diferentes: o prefixo precisa sobreviver.
  removeNSPrefix: false,
  parseTagValue: false,
  isArray: (nome) => nome === 'item' || nome === 'entry',
});

/** Extrai a lista de itens de um XML ja parseado, tolerando RSS e Atom. */
export function itensDoXml(xml: string): ItemFeed[] {
  const arvore = parser.parse(xml) as Record<string, any>;
  const candidatos = [
    arvore?.rss?.channel?.item,
    arvore?.channel?.item,
    arvore?.feed?.entry,
    arvore?.products?.product,
    arvore?.item,
  ];
  for (const c of candidatos) {
    if (Array.isArray(c) && c.length > 0) return c as ItemFeed[];
    if (c && typeof c === 'object') return [c as ItemFeed];
  }
  return [];
}

/** Le o valor de um campo aceitando `g:campo`, `campo` e nó com `#text`. */
export function campo(item: ItemFeed, ...nomes: string[]): string | null {
  for (const nome of nomes) {
    for (const chave of [`g:${nome}`, nome, `G:${nome}`]) {
      const valor = (item as Record<string, unknown>)[chave];
      const texto = achatar(valor);
      if (texto) return texto;
    }
  }
  return null;
}

function achatar(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string') return valor.trim() || null;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (Array.isArray(valor)) {
    const partes = valor.map(achatar).filter(Boolean);
    return partes.length ? partes.join(' | ') : null;
  }
  if (typeof valor === 'object') {
    const obj = valor as Record<string, unknown>;
    if ('#text' in obj) return achatar(obj['#text']);
    // `g:product_detail` vem como { attribute_name, attribute_value }.
    const partes = Object.entries(obj)
      .filter(([k]) => !k.startsWith('@'))
      .map(([, v]) => achatar(v))
      .filter(Boolean);
    return partes.length ? partes.join(': ') : null;
  }
  return null;
}

/** Concatena todos os `g:product_detail` do item num texto pesquisavel. */
export function detalhesDoProduto(item: ItemFeed): string {
  const bruto = (item as Record<string, unknown>)['g:product_detail'] ?? (item as Record<string, unknown>)['product_detail'];
  if (!bruto) return '';
  const lista = Array.isArray(bruto) ? bruto : [bruto];
  return lista.map(achatar).filter(Boolean).join(' | ');
}

function montarUrl(base: string, parametros: Record<string, string | number>): string {
  const url = new URL(base);
  for (const [chave, valor] of Object.entries(parametros)) {
    url.searchParams.set(chave, String(valor));
  }
  return url.toString();
}

async function baixarTexto(url: string): Promise<string> {
  const resposta = await fetch(url, {
    headers: { 'user-agent': 'juliana-ingest/1.0 (+multiplosmm.com.br)' },
    redirect: 'follow',
  });
  if (!resposta.ok) {
    throw new Error(`Feed respondeu ${resposta.status} ${resposta.statusText} em ${url}`);
  }
  return await resposta.text();
}

export interface ResultadoFeed {
  itens: ItemFeed[];
  /** Como os itens foram obtidos, para o relatorio. */
  estrategia: string;
  paginas: number;
}

function idDoItem(item: ItemFeed): string {
  return campo(item, 'id', 'sku', 'guid', 'link') ?? JSON.stringify(item).slice(0, 200);
}

/**
 * Pagina a partir de `url`, variando `parametro`, ate a resposta repetir ou
 * vir vazia. Devolve o acumulado sem duplicatas.
 */
async function paginar(
  url: string,
  parametro: string,
  primeiroValor: number,
  passo: number,
  extras: Record<string, string | number>,
  log: (msg: string) => void,
): Promise<ItemFeed[]> {
  const acumulado = new Map<string, ItemFeed>();

  for (let pagina = 0; pagina < config.feedMaxPaginas; pagina += 1) {
    const valor = primeiroValor + pagina * passo;
    const alvo = montarUrl(url, { ...extras, [parametro]: valor });
    let itens: ItemFeed[];
    try {
      itens = itensDoXml(await baixarTexto(alvo));
    } catch (erro) {
      log(`  ${parametro}=${valor}: ${(erro as Error).message}`);
      break;
    }

    if (itens.length === 0) {
      log(`  ${parametro}=${valor}: vazio, fim da paginacao`);
      break;
    }

    const antes = acumulado.size;
    for (const item of itens) acumulado.set(idDoItem(item), item);
    const novos = acumulado.size - antes;
    log(`  ${parametro}=${valor}: ${itens.length} itens, ${novos} novos (total ${acumulado.size})`);

    // A resposta repetiu inteira: o parametro nao e o de paginacao.
    if (novos === 0) break;
  }

  return [...acumulado.values()];
}

/**
 * Baixa o catalogo completo. Se `FEED_URL` estiver vazia, usa `data/feed.xml`,
 * que e o mesmo pipeline para quando a cliente entrega o arquivo em vez da URL.
 */
export async function baixarCatalogo(
  log: (msg: string) => void = () => {},
): Promise<ResultadoFeed> {
  if (!config.feedUrl) {
    if (!fs.existsSync(caminhos.feedLocal)) {
      throw new Error(
        `Sem FEED_URL e sem ${caminhos.feedLocal}. Configure a URL do feed ou coloque o XML exportado nesse caminho.`,
      );
    }
    log(`Lendo arquivo local ${caminhos.feedLocal}`);
    const itens = itensDoXml(fs.readFileSync(caminhos.feedLocal, 'utf8'));
    return { itens, estrategia: 'arquivo local', paginas: 1 };
  }

  log(`Baixando ${config.feedUrl}`);
  const primeira = itensDoXml(await baixarTexto(config.feedUrl));
  log(`  requisicao sem paginacao: ${primeira.length} itens`);

  if (config.feedModoPaginacao === 'nenhum') {
    return { itens: primeira, estrategia: 'sem paginacao', paginas: 1 };
  }

  const tentativas: { nome: string; executar: () => Promise<ItemFeed[]> }[] = [];

  if (config.feedModoPaginacao === 'auto' || config.feedModoPaginacao === 'page') {
    tentativas.push({
      nome: `paginacao por ${config.feedParamPagina}`,
      executar: () => paginar(config.feedUrl, config.feedParamPagina, 1, 1, {}, log),
    });
  }
  if (config.feedModoPaginacao === 'auto' || config.feedModoPaginacao === 'offset') {
    tentativas.push({
      nome: `paginacao por ${config.feedParamOffset}`,
      executar: () =>
        paginar(
          config.feedUrl,
          config.feedParamOffset,
          0,
          config.feedTamanhoPagina,
          { [config.feedParamLimite]: config.feedTamanhoPagina },
          log,
        ),
    });
  }

  let melhor: ItemFeed[] = primeira;
  let estrategia = 'sem paginacao';

  for (const tentativa of tentativas) {
    log(`Tentando ${tentativa.nome}`);
    const itens = await tentativa.executar();
    if (itens.length > melhor.length) {
      melhor = itens;
      estrategia = tentativa.nome;
    }
    // Ja passou do minimo exigido: nao ha motivo para martelar o servidor da loja.
    if (melhor.length >= config.feedMinimoObras) break;
  }

  return { itens: melhor, estrategia, paginas: Math.ceil(melhor.length / config.feedTamanhoPagina) };
}
