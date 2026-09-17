import fs from 'node:fs';
import { caminhos } from '../config';

/**
 * Extracao de medidas. O feed do Google Shopping nao tem campo proprio de
 * dimensao de obra, entao a medida e garimpada de `g:product_detail`, do
 * titulo e da descricao, nesta ordem de confianca.
 */

export interface Medida {
  largura_cm: number;
  altura_cm: number;
  /** De onde a medida saiu, util no relatorio de cobertura. */
  origem: 'override' | 'product_detail' | 'titulo' | 'descricao';
}

/**
 * Casa "50 x 70 cm", "50x70cm", "50 por 70", "50 × 70", "1,20 x 0,80 m".
 * A unidade e opcional e pode vir colada ou depois do segundo numero.
 */
const PADRAO_MEDIDA =
  /(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:x|×|por)\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(cm|mm|m)?\b/gi;

function paraNumero(bruto: string): number {
  return Number.parseFloat(bruto.replace(',', '.'));
}

function paraCentimetros(valor: number, unidade: string | undefined): number {
  switch ((unidade ?? 'cm').toLowerCase()) {
    case 'mm':
      return valor / 10;
    case 'm':
      return valor * 100;
    default:
      return valor;
  }
}

/** Uma obra de parede fora desta faixa quase sempre e erro de parsing. */
const MIN_CM = 3;
const MAX_CM = 600;

export function extrairMedida(texto: string | null | undefined): { largura_cm: number; altura_cm: number } | null {
  if (!texto) return null;
  PADRAO_MEDIDA.lastIndex = 0;
  let achado: RegExpExecArray | null;
  while ((achado = PADRAO_MEDIDA.exec(texto)) !== null) {
    const unidade = achado[3];
    const largura = paraCentimetros(paraNumero(achado[1]), unidade);
    const altura = paraCentimetros(paraNumero(achado[2]), unidade);
    if (
      Number.isFinite(largura) && Number.isFinite(altura) &&
      largura >= MIN_CM && largura <= MAX_CM &&
      altura >= MIN_CM && altura <= MAX_CM
    ) {
      return { largura_cm: arredondar(largura), altura_cm: arredondar(altura) };
    }
  }
  return null;
}

function arredondar(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Procura a medida em varias fontes, da mais confiavel para a menos.
 */
export function medidaDaObra(fontes: {
  productDetail?: string | null;
  titulo?: string | null;
  descricao?: string | null;
}): Medida | null {
  const tentativas: [Medida['origem'], string | null | undefined][] = [
    ['product_detail', fontes.productDetail],
    ['titulo', fontes.titulo],
    ['descricao', fontes.descricao],
  ];
  for (const [origem, texto] of tentativas) {
    const m = extrairMedida(texto);
    if (m) return { ...m, origem };
  }
  return null;
}

/**
 * Le `data/dimensoes-override.csv` (colunas: id,largura_cm,altura_cm).
 * A cliente preenche esse arquivo a mao para as obras principais e o que
 * estiver la sempre vence o que veio do feed.
 */
export function lerOverrides(arquivo: string = caminhos.dimensoesOverride): Map<string, Medida> {
  const mapa = new Map<string, Medida>();
  if (!fs.existsSync(arquivo)) return mapa;

  const linhas = fs.readFileSync(arquivo, 'utf8').split(/\r?\n/);
  for (const [indice, linha] of linhas.entries()) {
    const limpa = linha.trim();
    if (!limpa) continue;
    // O separador e detectado por linha: a cliente edita este arquivo no Excel
    // em portugues, que salva com ponto e virgula e usa a virgula como decimal.
    // Assumir a virgula como separador de campo transformaria "40,5" em duas
    // colunas e a medida sairia errada sem ninguem perceber.
    const separador = limpa.includes(';') ? ';' : limpa.includes('\t') ? '\t' : ',';
    const colunas = limpa.split(separador).map((c) => c.trim().replace(/^"|"$/g, ''));
    // Pula o cabecalho, se houver.
    if (indice === 0 && /^id$/i.test(colunas[0] ?? '')) continue;
    const [id, larguraBruta, alturaBruta] = colunas;
    if (!id) continue;
    const largura = paraNumero(larguraBruta ?? '');
    const altura = paraNumero(alturaBruta ?? '');
    if (!Number.isFinite(largura) || !Number.isFinite(altura)) continue;
    if (largura <= 0 || altura <= 0) continue;
    mapa.set(id, {
      largura_cm: arredondar(largura),
      altura_cm: arredondar(altura),
      origem: 'override',
    });
  }
  return mapa;
}

/** Grava o CSV das obras que ficaram sem medida, para a cliente preencher. */
export function gravarSemDimensao(
  obras: { id: string; titulo: string; url: string }[],
  arquivo: string = caminhos.semDimensao,
): void {
  const escapar = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const linhas = [
    'id,titulo,url,largura_cm,altura_cm',
    ...obras.map((o) => [escapar(o.id), escapar(o.titulo), escapar(o.url), '', ''].join(',')),
  ];
  fs.writeFileSync(arquivo, `${linhas.join('\n')}\n`, 'utf8');
}
