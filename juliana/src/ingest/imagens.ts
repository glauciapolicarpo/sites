import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { caminhos } from '../config';

/**
 * Preparo das imagens de obra.
 *
 * Muita foto de produto vem com fundo de estudio ou com a moldura ja aplicada,
 * e compor moldura dentro de moldura fica ruim. Aqui o fundo e removido por
 * diferenca de cor e o resultado e gravado como PNG com transparencia em
 * `data/obras/`.
 *
 * Qualquer arquivo dessa pasta pode ser trocado a mao por um recorte melhor.
 * O controle e o arquivo irmao `<id>.auto`: se ele existe, o PNG foi gerado
 * por esta rotina e pode ser regerado; se nao existe, alguem colocou aquele
 * arquivo ali de proposito e a ingestao nao encosta nele.
 */

const LADO_MAXIMO = 1600;
/** Distancia de cor (0..441) a partir da qual o pixel deixa de ser fundo. */
const TOLERANCIA_FUNDO = 42;

export interface ResultadoImagem {
  /** Caminho relativo a `data/`, ou null se nao foi possivel preparar. */
  caminhoLocal: string | null;
  cores: string[];
  recortada: boolean;
  preservadaManual: boolean;
  erro?: string;
}

function arquivoDaObra(id: string): string {
  const seguro = id.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
  return path.join(caminhos.obras, `${seguro}.png`);
}

function marcadorAutomatico(destino: string): string {
  return `${destino.replace(/\.png$/, '')}.auto`;
}

async function baixar(url: string): Promise<Buffer> {
  const resposta = await fetch(url, {
    headers: { 'user-agent': 'juliana-ingest/1.0 (+multiplosmm.com.br)' },
    redirect: 'follow',
  });
  if (!resposta.ok) throw new Error(`imagem respondeu ${resposta.status}`);
  const tipo = resposta.headers.get('content-type') ?? '';
  if (tipo && !tipo.startsWith('image/')) throw new Error(`content-type inesperado: ${tipo}`);
  return Buffer.from(await resposta.arrayBuffer());
}

interface Pixels {
  data: Buffer;
  largura: number;
  altura: number;
}

/**
 * Estima a cor do fundo pela mediana da borda. Mediana e nao media porque a
 * borda costuma ter uma faixa de sombra que puxa a media.
 */
function corDoFundo(px: Pixels): [number, number, number] {
  const amostras: [number, number, number][] = [];
  const passo = Math.max(1, Math.floor(px.largura / 64));
  for (let x = 0; x < px.largura; x += passo) {
    for (const y of [0, px.altura - 1]) {
      const i = (y * px.largura + x) * 4;
      amostras.push([px.data[i], px.data[i + 1], px.data[i + 2]]);
    }
  }
  const passoY = Math.max(1, Math.floor(px.altura / 64));
  for (let y = 0; y < px.altura; y += passoY) {
    for (const x of [0, px.largura - 1]) {
      const i = (y * px.largura + x) * 4;
      amostras.push([px.data[i], px.data[i + 1], px.data[i + 2]]);
    }
  }
  const canal = (c: 0 | 1 | 2) => {
    const valores = amostras.map((a) => a[c]).sort((a, b) => a - b);
    return valores[Math.floor(valores.length / 2)] ?? 255;
  };
  return [canal(0), canal(1), canal(2)];
}

function distancia(
  data: Buffer,
  i: number,
  [r, g, b]: [number, number, number],
): number {
  return Math.hypot(data[i] - r, data[i + 1] - g, data[i + 2] - b);
}

/**
 * Preenchimento a partir das bordas: so vira transparente o pixel parecido com
 * o fundo E ligado a borda. Isso evita furar o meio da obra quando ela tem uma
 * area clara grande, que e o erro classico de recorte por limiar simples.
 */
function recortarFundo(px: Pixels): { recortou: boolean } {
  const fundo = corDoFundo(px);
  const total = px.largura * px.altura;
  const visitado = new Uint8Array(total);
  const fila = new Int32Array(total);
  let inicio = 0;
  let fim = 0;

  const enfileirar = (indice: number) => {
    if (visitado[indice]) return;
    if (distancia(px.data, indice * 4, fundo) > TOLERANCIA_FUNDO) return;
    visitado[indice] = 1;
    fila[fim++] = indice;
  };

  for (let x = 0; x < px.largura; x += 1) {
    enfileirar(x);
    enfileirar((px.altura - 1) * px.largura + x);
  }
  for (let y = 0; y < px.altura; y += 1) {
    enfileirar(y * px.largura);
    enfileirar(y * px.largura + px.largura - 1);
  }

  while (inicio < fim) {
    const indice = fila[inicio++];
    const x = indice % px.largura;
    const y = (indice - x) / px.largura;
    if (x > 0) enfileirar(indice - 1);
    if (x < px.largura - 1) enfileirar(indice + 1);
    if (y > 0) enfileirar(indice - px.largura);
    if (y < px.altura - 1) enfileirar(indice + px.largura);
  }

  let removidos = 0;
  for (let i = 0; i < total; i += 1) {
    if (visitado[i]) {
      px.data[i * 4 + 3] = 0;
      removidos += 1;
    }
  }

  // Menos de 2% removido significa que nao havia fundo destacavel; mais de 92%
  // significa que o limiar comeu a obra. Nos dois casos o recorte nao vale.
  const fracao = removidos / total;
  if (fracao < 0.02 || fracao > 0.92) {
    for (let i = 0; i < total; i += 1) px.data[i * 4 + 3] = 255;
    return { recortou: false };
  }
  return { recortou: true };
}

/**
 * Tres cores dominantes por quantizacao em caixas de 4x4x4. Alimenta buscas do
 * tipo "algo colorido" e "tons neutros". Pixels transparentes sao ignorados.
 */
export function coresDominantes(px: Pixels): string[] {
  const baldes = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.data.length; i += 4) {
    if (px.data[i + 3] < 128) continue;
    const r = px.data[i];
    const g = px.data[i + 1];
    const b = px.data[i + 2];
    const chave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const atual = baldes.get(chave);
    if (atual) {
      atual.n += 1;
      atual.r += r;
      atual.g += g;
      atual.b += b;
    } else {
      baldes.set(chave, { n: 1, r, g, b });
    }
  }

  return [...baldes.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map(({ n, r, g, b }) => hex(Math.round(r / n), Math.round(g / n), Math.round(b / n)));
}

function hex(r: number, g: number, b: number): string {
  const p = (v: number) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
}

/**
 * Prepara a imagem de uma obra. Devolve o caminho local relativo, as cores
 * dominantes e se o recorte funcionou.
 */
export async function prepararImagem(
  id: string,
  imagemUrl: string,
): Promise<ResultadoImagem> {
  const destino = arquivoDaObra(id);
  const marcador = marcadorAutomatico(destino);
  const relativo = path.relative(caminhos.dados, destino);

  // Recorte trocado a mao: respeitar e apenas reler as cores.
  if (fs.existsSync(destino) && !fs.existsSync(marcador)) {
    try {
      const { data, info } = await sharp(destino)
        .ensureAlpha()
        .resize({ width: 256, height: 256, fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      return {
        caminhoLocal: relativo,
        cores: coresDominantes({ data, largura: info.width, altura: info.height }),
        recortada: true,
        preservadaManual: true,
      };
    } catch (erro) {
      return {
        caminhoLocal: relativo,
        cores: [],
        recortada: true,
        preservadaManual: true,
        erro: (erro as Error).message,
      };
    }
  }

  if (!imagemUrl) {
    return { caminhoLocal: null, cores: [], recortada: false, preservadaManual: false, erro: 'sem imagem_url' };
  }

  try {
    const original = await baixar(imagemUrl);
    const { data, info } = await sharp(original)
      .rotate()
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const px: Pixels = { data, largura: info.width, altura: info.height };
    const { recortou } = recortarFundo(px);
    const cores = coresDominantes(px);

    fs.mkdirSync(path.dirname(destino), { recursive: true });
    await sharp(px.data, { raw: { width: px.largura, height: px.altura, channels: 4 } })
      .trim({ threshold: 1 })
      .png({ compressionLevel: 9 })
      .toFile(destino);
    fs.writeFileSync(marcador, new Date().toISOString(), 'utf8');

    return { caminhoLocal: relativo, cores, recortada: recortou, preservadaManual: false };
  } catch (erro) {
    return {
      caminhoLocal: null,
      cores: [],
      recortada: false,
      preservadaManual: false,
      erro: (erro as Error).message,
    };
  }
}

/** Caminho absoluto do recorte de uma obra, se existir em disco. */
export function caminhoAbsolutoDaImagem(relativo: string | null): string | null {
  if (!relativo) return null;
  const absoluto = path.resolve(caminhos.dados, relativo);
  if (!absoluto.startsWith(path.resolve(caminhos.dados))) return null;
  return fs.existsSync(absoluto) ? absoluto : null;
}
