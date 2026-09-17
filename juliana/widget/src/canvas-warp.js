import { aplicar, homografiaDoQuadradoUnitario } from '../../src/compartilhado/geometria';

/**
 * Desenho com perspectiva em canvas 2D.
 *
 * O canvas 2D nao tem transformacao projetiva, so afim. A saida e subdividir a
 * imagem numa malha de triangulos: dentro de cada triangulo pequeno a
 * homografia e bem aproximada por uma afim, e o conjunto reproduz a
 * perspectiva. E o que faz a obra parecer real numa parede fotografada de
 * angulo, que e a maioria das fotos que o cliente manda.
 */

/** Resolve o sistema 3x3 por Cramer. Devolve null se for singular. */
function resolver3(m, b) {
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  if (Math.abs(det) < 1e-12) return null;

  const coluna = (indice) => {
    const c = m.map((linha) => linha.slice());
    for (let i = 0; i < 3; i += 1) c[i][indice] = b[i];
    return (
      c[0][0] * (c[1][1] * c[2][2] - c[1][2] * c[2][1]) -
      c[0][1] * (c[1][0] * c[2][2] - c[1][2] * c[2][0]) +
      c[0][2] * (c[1][0] * c[2][1] - c[1][1] * c[2][0])
    ) / det;
  };

  return [coluna(0), coluna(1), coluna(2)];
}

/**
 * Desenha um triangulo da imagem de origem no triangulo de destino,
 * resolvendo a afim exata que leva um no outro.
 */
function triangulo(ctx, imagem, s0, s1, s2, d0, d1, d2) {
  const M = [
    [s0.x, s0.y, 1],
    [s1.x, s1.y, 1],
    [s2.x, s2.y, 1],
  ];
  const linhaX = resolver3(M, [d0.x, d1.x, d2.x]);
  const linhaY = resolver3(M, [d0.y, d1.y, d2.y]);
  if (!linhaX || !linhaY) return;

  ctx.save();

  // Um leve alargamento a partir do baricentro fecha as costuras entre
  // triangulos vizinhos, que de outro modo aparecem como linhas claras.
  const cx = (d0.x + d1.x + d2.x) / 3;
  const cy = (d0.y + d1.y + d2.y) / 3;
  const inflar = (p) => ({ x: cx + (p.x - cx) * 1.02, y: cy + (p.y - cy) * 1.02 });
  const e0 = inflar(d0);
  const e1 = inflar(d1);
  const e2 = inflar(d2);

  ctx.beginPath();
  ctx.moveTo(e0.x, e0.y);
  ctx.lineTo(e1.x, e1.y);
  ctx.lineTo(e2.x, e2.y);
  ctx.closePath();
  ctx.clip();

  // canvas: x' = a*x + c*y + e ; y' = b*x + d*y + f
  ctx.transform(linhaX[0], linhaY[0], linhaX[1], linhaY[1], linhaX[2], linhaY[2]);
  ctx.drawImage(imagem, 0, 0);
  ctx.restore();
}

/**
 * Desenha `imagem` preenchendo o quadrilatero `quad` com perspectiva.
 * `divisoes` controla a finura da malha; 12 e o ponto em que o ganho visual
 * para de compensar o custo, inclusive em celular.
 */
export function desenharComPerspectiva(ctx, imagem, quad, divisoes = 12) {
  const H = homografiaDoQuadradoUnitario(quad);
  const largura = imagem.width;
  const altura = imagem.height;
  if (!largura || !altura) return;

  for (let i = 0; i < divisoes; i += 1) {
    for (let j = 0; j < divisoes; j += 1) {
      const u0 = i / divisoes;
      const u1 = (i + 1) / divisoes;
      const v0 = j / divisoes;
      const v1 = (j + 1) / divisoes;

      const d00 = aplicar(H, u0, v0);
      const d10 = aplicar(H, u1, v0);
      const d11 = aplicar(H, u1, v1);
      const d01 = aplicar(H, u0, v1);

      const s00 = { x: u0 * largura, y: v0 * altura };
      const s10 = { x: u1 * largura, y: v0 * altura };
      const s11 = { x: u1 * largura, y: v1 * altura };
      const s01 = { x: u0 * largura, y: v1 * altura };

      triangulo(ctx, imagem, s00, s10, s11, d00, d10, d11);
      triangulo(ctx, imagem, s00, s11, s01, d00, d11, d01);
    }
  }
}

/** Caminho fechado do quadrilatero, para recorte ou contorno. */
export function caminhoDoQuad(ctx, quad) {
  ctx.beginPath();
  ctx.moveTo(quad[0].x, quad[0].y);
  for (let i = 1; i < quad.length; i += 1) ctx.lineTo(quad[i].x, quad[i].y);
  ctx.closePath();
}
