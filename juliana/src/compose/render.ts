import sharp from 'sharp';
import {
  aplicar,
  caixaEnvolvente,
  colocarObra,
  deslocamentoDaSombra,
  homografiaDoQuadradoUnitario,
  inverter,
  OPACIDADE_SOMBRA,
  planoDaParede,
  quadNormalizadoParaPixel,
  type Ponto,
  type Quad,
} from '../compartilhado/geometria';
import { moldura, type MolduraId } from '../compartilhado/molduras';

/**
 * Composicao do PNG final. Usa exatamente a mesma matematica do preview:
 * os cantos vem do widget em coordenadas normalizadas, o plano e reconstruido
 * aqui e a obra e projetada pela mesma homografia.
 */

export interface PedidoComposicao {
  /** Foto do cliente, como veio do navegador. */
  foto: Buffer;
  /** Recorte da obra em PNG com transparencia. */
  obra: Buffer;
  larguraObraCm: number;
  alturaObraCm: number;
  quadNormalizado: [[number, number], [number, number], [number, number], [number, number]];
  posicao: { x: number; y: number };
  paredeCm: number;
  moldura: MolduraId;
  ladoMaiorPx: number;
  marcaDagua: string;
}

interface Bitmap {
  data: Buffer;
  largura: number;
  altura: number;
}

/**
 * Desenha a obra emoldurada achatada (sem perspectiva), do tamanho que a peca
 * tem em pixels na imagem final. A moldura cresce para fora, com a mesma
 * espessura em cm dos quatro lados.
 */
async function pecaEmoldurada(
  obraPng: Buffer,
  larguraTotalPx: number,
  alturaTotalPx: number,
  espessuraPx: number,
  molduraId: MolduraId,
): Promise<Buffer> {
  const m = moldura(molduraId);
  const larguraInterna = Math.max(1, Math.round(larguraTotalPx - 2 * espessuraPx));
  const alturaInterna = Math.max(1, Math.round(alturaTotalPx - 2 * espessuraPx));

  const arte = await sharp(obraPng)
    .resize(larguraInterna, alturaInterna, { fit: 'fill' })
    .ensureAlpha()
    .png()
    .toBuffer();

  if (!m.cor || espessuraPx < 0.5) {
    return await sharp(arte)
      .resize(Math.round(larguraTotalPx), Math.round(alturaTotalPx), { fit: 'fill' })
      .png()
      .toBuffer();
  }

  const largura = Math.round(larguraTotalPx);
  const altura = Math.round(alturaTotalPx);
  const borda = Math.round(espessuraPx);
  // Chanfro interno: uma linha mais escura da volume a moldura sem custar render.
  const chanfro = Math.max(1, Math.round(espessuraPx * 0.18));

  const fundo = `
    <svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${largura}" height="${altura}" fill="${m.cor}"/>
      <rect x="${borda - chanfro}" y="${borda - chanfro}"
            width="${largura - 2 * (borda - chanfro)}" height="${altura - 2 * (borda - chanfro)}"
            fill="${m.corInterna ?? m.cor}"/>
    </svg>`;

  return await sharp(Buffer.from(fundo))
    .composite([{ input: arte, left: borda, top: borda }])
    .png()
    .toBuffer();
}

/**
 * Warp projetivo por mapeamento inverso, com amostragem bilinear.
 * So percorre a caixa envolvente do destino, entao o custo acompanha o tamanho
 * da obra na foto e nao o tamanho da foto.
 */
export function warpPerspectiva(
  origem: Bitmap,
  destinoQuad: Quad,
  larguraCanvas: number,
  alturaCanvas: number,
): { bitmap: Bitmap; esquerda: number; topo: number } | null {
  const caixa = caixaEnvolvente(destinoQuad, 1);
  const esquerda = Math.max(0, caixa.x);
  const topo = Math.max(0, caixa.y);
  const direita = Math.min(larguraCanvas, caixa.x + caixa.largura);
  const base = Math.min(alturaCanvas, caixa.y + caixa.altura);

  const largura = Math.ceil(direita - esquerda);
  const altura = Math.ceil(base - topo);
  if (largura <= 0 || altura <= 0) return null;

  const inversa = inverter(homografiaDoQuadradoUnitario(destinoQuad));
  const saida = Buffer.alloc(largura * altura * 4, 0);

  for (let y = 0; y < altura; y += 1) {
    const py = topo + y + 0.5;
    for (let x = 0; x < largura; x += 1) {
      const px = esquerda + x + 0.5;
      const uv = aplicar(inversa, px, py);
      if (uv.x < 0 || uv.x >= 1 || uv.y < 0 || uv.y >= 1) continue;

      const sx = uv.x * (origem.largura - 1);
      const sy = uv.y * (origem.altura - 1);
      amostrarBilinear(origem, sx, sy, saida, (y * largura + x) * 4);
    }
  }

  return { bitmap: { data: saida, largura, altura }, esquerda, topo };
}

function amostrarBilinear(src: Bitmap, sx: number, sy: number, destino: Buffer, offset: number): void {
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(x0 + 1, src.largura - 1);
  const y1 = Math.min(y0 + 1, src.altura - 1);
  const fx = sx - x0;
  const fy = sy - y0;

  const i00 = (y0 * src.largura + x0) * 4;
  const i10 = (y0 * src.largura + x1) * 4;
  const i01 = (y1 * src.largura + x0) * 4;
  const i11 = (y1 * src.largura + x1) * 4;

  for (let c = 0; c < 4; c += 1) {
    const cima = src.data[i00 + c] * (1 - fx) + src.data[i10 + c] * fx;
    const baixo = src.data[i01 + c] * (1 - fx) + src.data[i11 + c] * fx;
    destino[offset + c] = Math.round(cima * (1 - fy) + baixo * fy);
  }
}

/** Silhueta preta com o alfa do bitmap, base da sombra projetada. */
function silhueta(bitmap: Bitmap, opacidade: number): Bitmap {
  const data = Buffer.alloc(bitmap.data.length, 0);
  for (let i = 0; i < bitmap.data.length; i += 4) {
    data[i + 3] = Math.round(bitmap.data[i + 3] * opacidade);
  }
  return { data, largura: bitmap.largura, altura: bitmap.altura };
}

function marcaDaguaSvg(largura: number, altura: number, texto: string): Buffer {
  const tamanho = Math.max(13, Math.round(largura * 0.016));
  const margem = Math.round(tamanho * 1.4);
  const escapado = texto.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] ?? c));
  return Buffer.from(`
    <svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
      <text x="${margem}" y="${altura - margem}"
            font-family="Jost, 'Century Gothic', Questrial, sans-serif"
            font-size="${tamanho}" fill="#FFFFFF" fill-opacity="0.85"
            stroke="#000000" stroke-opacity="0.35" stroke-width="${Math.max(1, tamanho * 0.06)}"
            paint-order="stroke">${escapado}</text>
    </svg>`);
}

export interface ResultadoComposicao {
  png: Buffer;
  largura: number;
  altura: number;
  /** Fracao da largura do plano ocupada pela peca, util para conferencia. */
  fracaoDaLargura: number;
  larguraTotalCm: number;
  alturaTotalCm: number;
}

export async function compor(pedido: PedidoComposicao): Promise<ResultadoComposicao> {
  // 1. Foto normalizada, lado maior no tamanho de entrega.
  const foto = sharp(pedido.foto, { failOn: 'none' }).rotate();
  const meta = await foto.metadata();
  if (!meta.width || !meta.height) throw new Error('Nao foi possivel ler as dimensoes da foto.');

  // O lado maior sempre vai para o tamanho de entrega, para cima ou para baixo:
  // o PNG salvo pelo cliente tem resolucao previsivel independente do aparelho.
  const escala = pedido.ladoMaiorPx / Math.max(meta.width, meta.height);
  const larguraFinal = Math.max(1, Math.round(meta.width * escala));
  const alturaFinal = Math.max(1, Math.round(meta.height * escala));

  const base = await foto
    .resize(larguraFinal, alturaFinal, { fit: 'fill' })
    .ensureAlpha()
    .png()
    .toBuffer();

  // 2. Plano da parede, reconstruido a partir dos cantos normalizados.
  const quad = quadNormalizadoParaPixel(pedido.quadNormalizado, larguraFinal, alturaFinal);
  const plano = planoDaParede(quad, pedido.paredeCm);
  const m = moldura(pedido.moldura);

  const colocacao = colocarObra(plano, {
    larguraCm: pedido.larguraObraCm,
    alturaCm: pedido.alturaObraCm,
    espessuraMolduraCm: m.espessuraCm,
    centro: pedido.posicao,
  });

  // 3. Peca achatada, resolvida na densidade que ela ocupa na foto.
  const ladoMaiorPx = Math.max(
    ...colocacao.quad.map((p, i) => {
      const proximo = colocacao.quad[(i + 1) % 4] as Ponto;
      return Math.hypot(proximo.x - p.x, proximo.y - p.y);
    }),
  );
  const densidade = Math.min(
    2.0,
    Math.max(1.0, (ladoMaiorPx * 1.5) / Math.max(colocacao.larguraTotalCm, 1)),
  );
  const larguraPecaPx = Math.max(24, Math.round(colocacao.larguraTotalCm * densidade));
  const alturaPecaPx = Math.max(24, Math.round(colocacao.alturaTotalCm * densidade));
  const espessuraPecaPx = m.espessuraCm * densidade;

  const peca = await pecaEmoldurada(
    pedido.obra,
    larguraPecaPx,
    alturaPecaPx,
    espessuraPecaPx,
    pedido.moldura,
  );
  const { data: pecaRaw, info: pecaInfo } = await sharp(peca)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bitmapPeca: Bitmap = { data: pecaRaw, largura: pecaInfo.width, altura: pecaInfo.height };

  // 4. Projecao da peca nos quatro cantos calculados.
  const warp = warpPerspectiva(bitmapPeca, colocacao.quad, larguraFinal, alturaFinal);
  if (!warp) throw new Error('A obra ficou inteiramente fora da foto. Reposicione antes de salvar.');

  const camadas: sharp.OverlayOptions[] = [];

  // 5. Sombra projetada. Sem ela a obra parece adesivo colado na foto.
  const desloc = deslocamentoDaSombra(m.espessuraCm, plano.pixelsPorCm);
  const quadSombra = colocacao.quad.map((p) => ({
    x: p.x + desloc.dx,
    y: p.y + desloc.dy,
  })) as Quad;
  const warpSombra = warpPerspectiva(bitmapPeca, quadSombra, larguraFinal, alturaFinal);
  if (warpSombra) {
    const sombra = silhueta(warpSombra.bitmap, OPACIDADE_SOMBRA);
    const sombraPng = await sharp(sombra.data, {
      raw: { width: sombra.largura, height: sombra.altura, channels: 4 },
    })
      .blur(Math.min(60, Math.max(0.4, desloc.desfoque)))
      .png()
      .toBuffer();
    camadas.push({ input: sombraPng, left: warpSombra.esquerda, top: warpSombra.topo });
  }

  const obraPng = await sharp(warp.bitmap.data, {
    raw: { width: warp.bitmap.largura, height: warp.bitmap.altura, channels: 4 },
  })
    .png()
    .toBuffer();
  camadas.push({ input: obraPng, left: warp.esquerda, top: warp.topo });

  // 6. Marca d'agua discreta no rodape.
  camadas.push({ input: marcaDaguaSvg(larguraFinal, alturaFinal, pedido.marcaDagua), left: 0, top: 0 });

  const png = await sharp(base).composite(camadas).png({ compressionLevel: 9 }).toBuffer();

  return {
    png,
    largura: larguraFinal,
    altura: alturaFinal,
    fracaoDaLargura: colocacao.fracaoDaLargura,
    larguraTotalCm: colocacao.larguraTotalCm,
    alturaTotalCm: colocacao.alturaTotalCm,
  };
}
