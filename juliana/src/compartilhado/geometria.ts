/**
 * Matematica da ambientacao, compartilhada entre o preview em canvas (widget)
 * e a composicao em PNG (/compose). Um unico arquivo para que o arquivo salvo
 * pelo cliente seja identico ao que ele viu na tela.
 *
 * Convencao de cantos, sempre nesta ordem:
 *   0 = superior esquerdo, 1 = superior direito,
 *   2 = inferior direito,  3 = inferior esquerdo.
 *
 * O quadrado unitario (u, v) pertence a [0,1]^2, com u crescendo para a
 * direita e v crescendo para baixo, e e mapeado no quadrilatero marcado pelo
 * cliente por uma homografia.
 */

export interface Ponto {
  x: number;
  y: number;
}

/** Quatro cantos do plano da parede, na ordem TL, TR, BR, BL. */
export type Quad = [Ponto, Ponto, Ponto, Ponto];

/** Matriz 3x3 em row-major: [a, b, c, d, e, f, g, h, i]. */
export type Matriz3 = [number, number, number, number, number, number, number, number, number];

/** Altura museologica do centro da obra, em cm a partir do chao. */
export const ALTURA_CENTRO_PADRAO_CM = 145;

/** Largura de parede assumida quando o cliente nao informa outra, em cm. */
export const PAREDE_PADRAO_CM = 320;

export function distancia(a: Ponto, b: Ponto): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Homografia que leva o quadrado unitario no quadrilatero informado.
 * Derivacao classica de Heckbert ("Fundamentals of Texture Mapping and Image
 * Warping", apendice de mapeamento projetivo do quadrado unitario).
 * Degrada para uma transformacao afim quando o quadrilatero e um
 * paralelogramo, caso em que o sistema projetivo e singular.
 */
export function homografiaDoQuadradoUnitario(q: Quad): Matriz3 {
  const [p0, p1, p2, p3] = q;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;

  // Paralelogramo: sem componente projetiva.
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    return [
      p1.x - p0.x, p3.x - p0.x, p0.x,
      p1.y - p0.y, p3.y - p0.y, p0.y,
      0, 0, 1,
    ];
  }

  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(den) < 1e-12) {
    // Cantos degenerados (colineares). Melhor entregar a afim do que NaN.
    return [
      p1.x - p0.x, p3.x - p0.x, p0.x,
      p1.y - p0.y, p3.y - p0.y, p0.y,
      0, 0, 1,
    ];
  }

  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;

  return [
    p1.x - p0.x + g * p1.x, p3.x - p0.x + h * p3.x, p0.x,
    p1.y - p0.y + g * p1.y, p3.y - p0.y + h * p3.y, p0.y,
    g, h, 1,
  ];
}

/** Aplica a homografia a um ponto (u, v). */
export function aplicar(m: Matriz3, u: number, v: number): Ponto {
  const w = m[6] * u + m[7] * v + m[8];
  const seguro = Math.abs(w) < 1e-12 ? 1e-12 : w;
  return {
    x: (m[0] * u + m[1] * v + m[2]) / seguro,
    y: (m[3] * u + m[4] * v + m[5]) / seguro,
  };
}

/** Inversa (adjunta) de uma matriz 3x3 homogenea. */
export function inverter(m: Matriz3): Matriz3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = f * g - d * i;
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) throw new Error('Homografia nao inversivel: verifique os quatro cantos.');
  const k = 1 / det;
  return [
    A * k, (c * h - b * i) * k, (b * f - c * e) * k,
    B * k, (a * i - c * g) * k, (c * d - a * f) * k,
    C * k, (b * g - a * h) * k, (a * e - b * d) * k,
  ];
}

export interface PlanoParede {
  /** Cantos em pixels da imagem de trabalho. */
  quad: Quad;
  /** Largura fisica do plano, informada pelo cliente. */
  paredeCm: number;
  /** Altura fisica estimada do plano, derivada da proporcao do quadrilatero. */
  alturaCm: number;
  /** Largura media do quadrilatero em pixels. */
  larguraPx: number;
  /** Altura media do quadrilatero em pixels. */
  alturaPx: number;
  /**
   * Escala de referencia, sem perspectiva. E a conta do briefing:
   * largura do plano em px dividida pela largura da parede em cm.
   */
  pixelsPorCm: number;
  homografia: Matriz3;
}

/**
 * Monta o plano da parede a partir dos quatro cantos e da largura informada.
 *
 * A altura fisica do plano nao e observavel a partir de uma unica foto sem
 * calibracao de camera, entao e estimada assumindo que o cliente marcou uma
 * regiao retangular na parede: a proporcao altura/largura em pixels do
 * quadrilatero e usada como proporcao fisica. O erro residual e pequeno para
 * os angulos usuais de foto de sala e nao afeta a largura da obra, que e a
 * medida que trava a compra.
 */
export function planoDaParede(quad: Quad, paredeCm: number): PlanoParede {
  const largura = (distancia(quad[0], quad[1]) + distancia(quad[3], quad[2])) / 2;
  const altura = (distancia(quad[0], quad[3]) + distancia(quad[1], quad[2])) / 2;
  const larguraPx = Math.max(largura, 1e-6);
  const alturaPx = Math.max(altura, 1e-6);
  const parede = Math.max(paredeCm, 1);
  return {
    quad,
    paredeCm: parede,
    alturaCm: (parede * alturaPx) / larguraPx,
    larguraPx,
    alturaPx,
    pixelsPorCm: larguraPx / parede,
    homografia: homografiaDoQuadradoUnitario(quad),
  };
}

/** Converte um ponto (u, v) do plano em pixels da imagem. */
export function planoParaPixel(plano: PlanoParede, u: number, v: number): Ponto {
  return aplicar(plano.homografia, u, v);
}

/** Converte um pixel da imagem em coordenadas (u, v) do plano. */
export function pixelParaPlano(plano: PlanoParede, p: Ponto): Ponto {
  const inv = inverter(plano.homografia);
  const q = aplicar(inv, p.x, p.y);
  return { x: q.x, y: q.y };
}

/**
 * Posicao vertical padrao do centro da obra, em coordenada v do plano.
 * Assume que a borda inferior do quadrilatero marcado encosta no chao, que e
 * como a marcacao e pedida na interface. O cliente pode arrastar depois.
 */
export function vDaAlturaDoChao(plano: PlanoParede, alturaCm = ALTURA_CENTRO_PADRAO_CM): number {
  const v = 1 - alturaCm / plano.alturaCm;
  return Math.min(Math.max(v, 0), 1);
}

export interface ObraNoPlano {
  /** Medida da obra sem moldura, em cm. */
  larguraCm: number;
  alturaCm: number;
  /** Espessura de cada lado da moldura, em cm. */
  espessuraMolduraCm: number;
  /** Centro da peca emoldurada, em coordenadas (u, v) do plano. */
  centro: Ponto;
}

export interface ColocacaoDaObra {
  /** Cantos da peca emoldurada em pixels da imagem, na ordem TL, TR, BR, BL. */
  quad: Quad;
  /** Cantos em coordenadas (u, v) do plano. */
  quadPlano: Quad;
  /** Medida externa, com moldura, em cm. */
  larguraTotalCm: number;
  alturaTotalCm: number;
  /** Fracao da largura do plano ocupada pela peca emoldurada. */
  fracaoDaLargura: number;
}

/**
 * Posiciona a obra no plano e devolve seus quatro cantos ja projetados.
 * A largura em (u, v) e a razao direta entre a medida da peca e a largura da
 * parede, que e o que produz a escala real: 50 cm numa parede de 300 cm ocupa
 * exatamente um sexto da largura do plano.
 */
export function colocarObra(plano: PlanoParede, obra: ObraNoPlano): ColocacaoDaObra {
  const larguraTotalCm = obra.larguraCm + 2 * obra.espessuraMolduraCm;
  const alturaTotalCm = obra.alturaCm + 2 * obra.espessuraMolduraCm;

  const meiaU = larguraTotalCm / plano.paredeCm / 2;
  const meiaV = alturaTotalCm / plano.alturaCm / 2;

  const u0 = obra.centro.x - meiaU;
  const u1 = obra.centro.x + meiaU;
  const v0 = obra.centro.y - meiaV;
  const v1 = obra.centro.y + meiaV;

  const quadPlano: Quad = [
    { x: u0, y: v0 },
    { x: u1, y: v0 },
    { x: u1, y: v1 },
    { x: u0, y: v1 },
  ];

  const quad = quadPlano.map((p) => planoParaPixel(plano, p.x, p.y)) as Quad;

  return {
    quad,
    quadPlano,
    larguraTotalCm,
    alturaTotalCm,
    fracaoDaLargura: larguraTotalCm / plano.paredeCm,
  };
}

/** Caixa envolvente inteira de um conjunto de pontos, com folga opcional. */
export function caixaEnvolvente(
  pontos: readonly Ponto[],
  folga = 0,
): { x: number; y: number; largura: number; altura: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pontos) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const x = Math.floor(minX - folga);
  const y = Math.floor(minY - folga);
  return {
    x,
    y,
    largura: Math.ceil(maxX + folga) - x,
    altura: Math.ceil(maxY + folga) - y,
  };
}

/** Deslocamento da sombra, em pixels, proporcional a espessura da moldura. */
export function deslocamentoDaSombra(espessuraCm: number, pixelsPorCm: number): {
  dx: number;
  dy: number;
  desfoque: number;
} {
  // Uma moldura mais grossa se afasta mais da parede: a sombra cresce junto.
  const salienciaCm = 0.8 + espessuraCm * 0.45;
  const px = salienciaCm * pixelsPorCm;
  return {
    dx: px * 0.55,
    dy: px * 0.95,
    desfoque: Math.max(1, px * 0.8),
  };
}

/** Opacidade da sombra projetada, fixada pelo briefing. */
export const OPACIDADE_SOMBRA = 0.3;

/** Normaliza um quadrilatero 0..1 recebido da API para pixels. */
export function quadNormalizadoParaPixel(
  quad: readonly (readonly [number, number])[],
  largura: number,
  altura: number,
): Quad {
  if (!Array.isArray(quad) || quad.length !== 4) {
    throw new Error('O quadrilatero da parede precisa ter exatamente quatro cantos.');
  }
  return quad.map(([x, y]) => ({ x: x * largura, y: y * altura })) as Quad;
}
