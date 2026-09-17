import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aplicar,
  colocarObra,
  homografiaDoQuadradoUnitario,
  inverter,
  pixelParaPlano,
  planoDaParede,
  vDaAlturaDoChao,
  type Quad,
} from './geometria';
import { medidaComMoldura, moldura } from './molduras';

const perto = (a: number, b: number, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) < tol, `esperado ${b}, recebido ${a}`);

test('homografia leva os cantos do quadrado unitario nos cantos do quad', () => {
  const q: Quad = [
    { x: 120, y: 80 },
    { x: 900, y: 140 },
    { x: 880, y: 620 },
    { x: 100, y: 540 },
  ];
  const m = homografiaDoQuadradoUnitario(q);
  const cantos: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  cantos.forEach(([u, v], i) => {
    const p = aplicar(m, u, v);
    perto(p.x, q[i].x, 1e-6);
    perto(p.y, q[i].y, 1e-6);
  });
});

test('paralelogramo cai no caminho afim sem produzir NaN', () => {
  const q: Quad = [
    { x: 0, y: 0 },
    { x: 400, y: 0 },
    { x: 400, y: 300 },
    { x: 0, y: 300 },
  ];
  const m = homografiaDoQuadradoUnitario(q);
  assert.equal(m[6], 0);
  assert.equal(m[7], 0);
  const p = aplicar(m, 0.5, 0.5);
  perto(p.x, 200);
  perto(p.y, 150);
});

test('inverter desfaz aplicar, inclusive com perspectiva forte', () => {
  const q: Quad = [
    { x: 60, y: 200 },
    { x: 1000, y: 40 },
    { x: 1020, y: 700 },
    { x: 40, y: 640 },
  ];
  const m = homografiaDoQuadradoUnitario(q);
  const inv = inverter(m);
  for (const [u, v] of [[0.13, 0.77], [0.5, 0.5], [0.92, 0.08]] as const) {
    const px = aplicar(m, u, v);
    const volta = aplicar(inv, px.x, px.y);
    perto(volta.x, u, 1e-6);
    perto(volta.y, v, 1e-6);
  }
});

test('criterio de aceite 9: obra 50x70 em parede de 300 cm ocupa um sexto da largura', () => {
  const quad: Quad = [
    { x: 0, y: 0 },
    { x: 1200, y: 0 },
    { x: 1200, y: 800 },
    { x: 0, y: 800 },
  ];
  const plano = planoDaParede(quad, 300);
  perto(plano.pixelsPorCm, 4);

  const colocacao = colocarObra(plano, {
    larguraCm: 50,
    alturaCm: 70,
    espessuraMolduraCm: 0,
    centro: { x: 0.5, y: 0.5 },
  });

  perto(colocacao.fracaoDaLargura, 1 / 6);
  // Um sexto de 1200 px de plano sao 200 px na imagem.
  perto(colocacao.quad[1].x - colocacao.quad[0].x, 200);
  perto(colocacao.quad[3].y - colocacao.quad[0].y, 280);
});

test('criterio de aceite 9: com moldura classica a peca vira 64 x 84', () => {
  const m = medidaComMoldura(50, 70, 'classica');
  perto(m.larguraCm, 64);
  perto(m.alturaCm, 84);
  perto(m.espessuraCm, 7);
});

test('criterio de aceite 8: trocar canaleta por classica muda a medida visivelmente', () => {
  const canaleta = medidaComMoldura(50, 70, 'canaleta');
  const classica = medidaComMoldura(50, 70, 'classica');
  perto(canaleta.larguraCm, 54);
  perto(classica.larguraCm, 64);
  assert.ok(classica.larguraCm - canaleta.larguraCm === 10);
});

test('as sete molduras do briefing existem com as espessuras corretas', () => {
  const esperado: [string, number][] = [
    ['sem', 0],
    ['canaleta', 2],
    ['madeira', 4],
    ['preta', 4],
    ['branca', 4],
    ['classica', 7],
    ['metacrilato', 1.5],
  ];
  for (const [id, espessura] of esperado) {
    perto(moldura(id).espessuraCm, espessura);
  }
});

test('altura museologica de 145 cm cai no meio de uma parede de 290 cm', () => {
  const quad: Quad = [
    { x: 0, y: 0 },
    { x: 1000, y: 0 },
    { x: 1000, y: 1000 },
    { x: 0, y: 1000 },
  ];
  // Plano quadrado em px com 290 cm de largura => 290 cm de altura estimada.
  const plano = planoDaParede(quad, 290);
  perto(plano.alturaCm, 290);
  perto(vDaAlturaDoChao(plano), 0.5);
});

test('arrastar: pixel -> plano -> pixel devolve o mesmo ponto', () => {
  const quad: Quad = [
    { x: 100, y: 150 },
    { x: 980, y: 60 },
    { x: 1000, y: 690 },
    { x: 80, y: 620 },
  ];
  const plano = planoDaParede(quad, 320);
  const alvo = { x: 540, y: 400 };
  const uv = pixelParaPlano(plano, alvo);
  const volta = aplicar(plano.homografia, uv.x, uv.y);
  perto(volta.x, alvo.x, 1e-6);
  perto(volta.y, alvo.y, 1e-6);
});
