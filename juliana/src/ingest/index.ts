import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { caminhos, config, garantirPastas } from '../config';
import { abrirBanco, gravarMeta, regravarCatalogo, totalDeObras } from '../db/index';
import type { Obra } from '../compartilhado/tipos';
import { baixarCatalogo, campo, detalhesDoProduto, type ItemFeed } from './feed';
import { gravarSemDimensao, lerOverrides, medidaDaObra } from './dimensoes';
import { prepararImagem } from './imagens';
import { classificar } from './regras-tags';

/**
 * Ingestao do catalogo: baixa o feed, normaliza, enriquece e regrava o banco.
 * Roda por `npm run ingest` e pelo cron diario das 4h.
 */

function log(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

function limpar(texto: string | null): string {
  if (!texto) return '';
  return texto
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function precoDoCampo(bruto: string | null): number {
  if (!bruto) return 0;
  // "2400.00 BRL", "R$ 2.400,00", "2400,00"
  const semMoeda = bruto.replace(/[A-Za-z$\s]/g, '');
  const normalizado = semMoeda.includes(',')
    ? semMoeda.replace(/\./g, '').replace(',', '.')
    : semMoeda;
  const valor = Number.parseFloat(normalizado);
  return Number.isFinite(valor) && valor >= 0 ? valor : 0;
}

function disponibilidade(bruto: string | null): boolean {
  if (!bruto) return true;
  const v = bruto.toLowerCase();
  if (v.includes('out of stock') || v.includes('out_of_stock')) return false;
  if (v.includes('indisponivel') || v.includes('indisponível')) return false;
  if (v.includes('esgotado')) return false;
  if (v.includes('preorder') || v.includes('backorder')) return false;
  return true;
}

/**
 * O feed nem sempre traz `g:brand`. Quando nao traz, o artista costuma estar no
 * titulo em um dos formatos "Titulo - Artista" ou "Artista | Titulo".
 */
function artistaDoItem(item: ItemFeed, titulo: string): string {
  const marca = limpar(campo(item, 'brand', 'artist', 'autor'));
  if (marca) return marca;
  const separador = titulo.match(/^(.*?)\s+[|–—-]\s+(.*)$/);
  if (separador) {
    const [, esquerda, direita] = separador;
    // Nome de pessoa costuma ser curto e sem numeros.
    const candidato = /\d/.test(direita) || direita.length > 40 ? esquerda : direita;
    return limpar(candidato);
  }
  return '';
}

function tecnicaDoItem(item: ItemFeed, detalhes: string, descricao: string): string {
  const direto = limpar(campo(item, 'material', 'tecnica', 'product_type'));
  if (direto) return direto;
  const fonte = `${detalhes} ${descricao}`;
  const achado = fonte.match(
    /\b(serigrafia|litografia|gravura(?:\s+em\s+metal)?|xilogravura|agua[-\s]?forte|giclee|gicl[eé]e|fine\s*art|impress[aã]o|fotografia|[oó]leo|acr[ií]lica|aquarela|nanquim|carv[aã]o|t[eé]cnica\s+mista|escultura|objeto)\b/i,
  );
  return achado ? limpar(achado[0]) : '';
}

function edicaoDoItem(detalhes: string, descricao: string): string | null {
  const fonte = `${detalhes} ${descricao}`;
  const tiragem = fonte.match(/\b(?:tiragem|edi[cç][aã]o)\s*(?:de|:)?\s*(\d{1,4})\s*(?:exemplares|c[oó]pias|pe[cç]as)?/i);
  if (tiragem) return `Tiragem de ${tiragem[1]}`;
  const fracao = fonte.match(/\b(\d{1,3}\s*\/\s*\d{1,4})\b/);
  if (fracao) return fracao[1].replace(/\s/g, '');
  const prova = fonte.match(/\bprova\s+d[eo]\s+artista\b/i);
  if (prova) return 'Prova do artista';
  return null;
}

export interface Relatorio {
  totalNoFeed: number;
  totalIndexado: number;
  disponiveis: number;
  comDimensao: number;
  porOverride: number;
  semDimensao: number;
  imagensRecortadas: number;
  imagensPreservadas: number;
  imagensComFalha: number;
  comTags: number;
  estrategiaFeed: string;
  duracaoSegundos: number;
}

export async function executarIngestao(): Promise<Relatorio> {
  const comecou = Date.now();
  garantirPastas();

  const { itens, estrategia } = await baixarCatalogo(log);
  log(`\nFeed: ${itens.length} itens por "${estrategia}"`);

  if (itens.length < config.feedMinimoObras) {
    throw new Error(
      `Ingestao abortada: o feed entregou ${itens.length} itens e o minimo aceitavel e ${config.feedMinimoObras}. ` +
        'O catalogo tem 927 obras e uma requisicao isolada devolve cerca de 150, entao esse numero baixo significa ' +
        'que a paginacao nao pegou. Ajuste FEED_MODO_PAGINACAO / FEED_PARAM_PAGINA ou informe o parametro ' +
        'documentado pela Plataforma Neo. O banco atual foi preservado.',
    );
  }

  const overrides = lerOverrides();
  log(`Overrides de dimensao: ${overrides.size} obras em ${caminhos.dimensoesOverride}`);

  const obras: Obra[] = [];
  const faltando: { id: string; titulo: string; url: string }[] = [];
  let porOverride = 0;
  let recortadas = 0;
  let preservadas = 0;
  let falhasImagem = 0;

  const agora = new Date().toISOString();
  log('\nNormalizando e enriquecendo...');

  for (const [indice, item] of itens.entries()) {
    const id = campo(item, 'id', 'sku');
    if (!id) continue;

    const titulo = limpar(campo(item, 'title'));
    const descricao = limpar(campo(item, 'description'));
    const detalhes = limpar(detalhesDoProduto(item));
    const url = campo(item, 'link', 'url') ?? '';
    const imagemUrl = campo(item, 'image_link', 'image', 'imagem') ?? '';

    const artista = artistaDoItem(item, titulo);
    const tecnica = tecnicaDoItem(item, detalhes, descricao);

    // Overrides vencem o feed: a cliente preenche a mao as obras principais.
    const daPlanilha = overrides.get(id);
    const doFeed = medidaDaObra({ productDetail: detalhes, titulo, descricao });
    const medida = daPlanilha ?? doFeed;
    if (daPlanilha) porOverride += 1;
    if (!medida) faltando.push({ id, titulo, url });

    const imagem = await prepararImagem(id, imagemUrl);
    if (imagem.preservadaManual) preservadas += 1;
    else if (imagem.recortada) recortadas += 1;
    else if (imagem.erro) falhasImagem += 1;

    obras.push({
      id,
      titulo,
      artista,
      descricao,
      tecnica,
      edicao: edicaoDoItem(detalhes, descricao),
      largura_cm: medida?.largura_cm ?? null,
      altura_cm: medida?.altura_cm ?? null,
      preco: precoDoCampo(campo(item, 'sale_price', 'price')),
      disponivel: disponibilidade(campo(item, 'availability')),
      url,
      imagem_url: imagemUrl,
      imagem_local: imagem.caminhoLocal,
      tags_estetica: classificar({ titulo, artista, tecnica, descricao: `${descricao} ${detalhes}` }),
      cores: imagem.cores,
      atualizado_em: agora,
    });

    if ((indice + 1) % 100 === 0) log(`  ${indice + 1}/${itens.length}`);
  }

  gravarSemDimensao(faltando);

  const db = abrirBanco();
  regravarCatalogo(db, obras);
  gravarMeta(db, 'ultima_ingestao', agora);
  gravarMeta(db, 'estrategia_feed', estrategia);
  const disponiveis = totalDeObras(db, true);
  db.close();

  const relatorio: Relatorio = {
    totalNoFeed: itens.length,
    totalIndexado: obras.length,
    disponiveis,
    comDimensao: obras.length - faltando.length,
    porOverride,
    semDimensao: faltando.length,
    imagensRecortadas: recortadas,
    imagensPreservadas: preservadas,
    imagensComFalha: falhasImagem,
    comTags: obras.filter((o) => o.tags_estetica.length > 0).length,
    estrategiaFeed: estrategia,
    duracaoSegundos: Math.round((Date.now() - comecou) / 100) / 10,
  };

  imprimirRelatorio(relatorio);
  return relatorio;
}

function imprimirRelatorio(r: Relatorio): void {
  const pct = (n: number) => `${Math.round((n / Math.max(r.totalIndexado, 1)) * 100)}%`;
  log(`
================ RELATORIO DA INGESTAO ================
Itens no feed ................ ${r.totalNoFeed}  (${r.estrategiaFeed})
Obras indexadas .............. ${r.totalIndexado}
  disponiveis ................ ${r.disponiveis}
Com dimensao ................. ${r.comDimensao}  (${pct(r.comDimensao)})
  vindas do override ......... ${r.porOverride}
Sem dimensao ................. ${r.semDimensao}  -> ${caminhos.semDimensao}
Imagens recortadas ........... ${r.imagensRecortadas}  (${pct(r.imagensRecortadas)})
  recortes manuais mantidos .. ${r.imagensPreservadas}
  falhas de imagem ........... ${r.imagensComFalha}
Com tag estetica ............. ${r.comTags}  (${pct(r.comTags)})
Duracao ...................... ${r.duracaoSegundos}s
=======================================================
`);
}

const executadoDiretamente =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executadoDiretamente) {
  executarIngestao().catch((erro: Error) => {
    process.stderr.write(`\nFALHA NA INGESTAO: ${erro.message}\n`);
    process.exit(1);
  });
}
