import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { caminhos, config, garantirPastas } from './config';
import { abrirBanco, gravarMeta, regravarCatalogo, totalDeObras } from './db/index';
import { buscar } from './busca/index';
import { construirServidor } from './index';
import type { Obra } from './compartilhado/tipos';

/**
 * Teste de ponta a ponta do servico, sem depender do feed real nem da API do
 * modelo: o catalogo e semeado a mao e as rotas sao exercitadas por injecao.
 */

const AGORA = new Date().toISOString();

function obra(parcial: Partial<Obra> & { id: string; titulo: string }): Obra {
  return {
    artista: '',
    descricao: '',
    tecnica: '',
    edicao: null,
    largura_cm: null,
    altura_cm: null,
    preco: 0,
    disponivel: true,
    url: '',
    imagem_url: '',
    imagem_local: null,
    tags_estetica: [],
    cores: [],
    atualizado_em: AGORA,
    ...parcial,
  };
}

const CATALOGO: Obra[] = [
  obra({
    id: 'T-001',
    titulo: 'Composicao geometrica em vermelho',
    artista: 'Ana Ribeiro',
    descricao: 'Serigrafia geometrica com cores vibrantes, formas em losango.',
    tecnica: 'Serigrafia',
    edicao: 'Tiragem de 50',
    largura_cm: 50,
    altura_cm: 70,
    preco: 4200,
    url: 'https://www.multiplosmm.com.br/p/t-001',
    tags_estetica: ['geometrico', 'cor_forte'],
  }),
  obra({
    id: 'T-002',
    titulo: 'Paisagem organica',
    artista: 'Bruno Salles',
    descricao: 'Gravura em metal, traco organico, tons neutros de cinza.',
    tecnica: 'Gravura em metal',
    largura_cm: 40,
    altura_cm: 40,
    preco: 2400,
    url: 'https://www.multiplosmm.com.br/p/t-002',
    tags_estetica: ['organico', 'preto_e_branco'],
  }),
  obra({
    id: 'T-003',
    titulo: 'Grade cromatica',
    artista: 'Ana Ribeiro',
    descricao: 'Estrutura geometrica em malha, azul e amarelo saturados.',
    tecnica: 'Serigrafia',
    largura_cm: 90,
    altura_cm: 90,
    preco: 14500,
    url: 'https://www.multiplosmm.com.br/p/t-003',
    tags_estetica: ['geometrico', 'cor_forte'],
  }),
  obra({
    id: 'T-004',
    titulo: 'Retrato indisponivel',
    artista: 'Carla Diniz',
    descricao: 'Fotografia figurativa, ja vendida.',
    tecnica: 'Fotografia',
    largura_cm: 60,
    altura_cm: 80,
    preco: 3800,
    disponivel: false,
    url: 'https://www.multiplosmm.com.br/p/t-004',
    tags_estetica: ['figurativo'],
  }),
];

async function semear(): Promise<void> {
  garantirPastas();
  const db = abrirBanco();
  regravarCatalogo(db, CATALOGO);
  gravarMeta(db, 'ultima_ingestao', AGORA);
  db.close();
}

test('busca filtra por preco e so devolve obra disponivel', async () => {
  await semear();
  const db = abrirBanco();

  const r = buscar(db, { texto: 'geometrico colorido para a sala', preco_max: 10000, limite: 3 });
  assert.ok(r.obras.length > 0, 'deveria achar alguma obra');
  assert.ok(r.obras.every((o) => o.disponivel), 'nenhuma obra indisponivel pode sair da busca');
  assert.ok(r.obras.every((o) => o.preco <= 10000), 'o teto de preco precisa ser respeitado');
  assert.equal(r.obras[0].id, 'T-001', 'a obra geometrica e colorida deveria vir primeiro');
  assert.ok(!r.obras.some((o) => o.id === 'T-003'), 'T-003 custa 14500 e nao cabe no teto');

  db.close();
});

test('obra indisponivel nunca aparece, nem buscando pelo titulo exato', async () => {
  await semear();
  const db = abrirBanco();
  const r = buscar(db, { texto: 'Retrato indisponivel', limite: 5 });
  assert.ok(!r.obras.some((o) => o.id === 'T-004'));
  db.close();
});

test('largura_max_cm nao promete obra sem medida cadastrada', async () => {
  await semear();
  const db = abrirBanco();
  const semMedida = [...CATALOGO, obra({ id: 'T-005', titulo: 'Sem medida', preco: 1000 })];
  regravarCatalogo(db, semMedida);

  const r = buscar(db, { largura_max_cm: 100, limite: 10 });
  assert.ok(!r.obras.some((o) => o.id === 'T-005'), 'obra sem medida nao cabe em promessa de espaco');

  regravarCatalogo(db, CATALOGO);
  db.close();
});

test('/health responde com a ultima ingestao e o total indexado', async () => {
  await semear();
  const app = await construirServidor();

  const resposta = await app.inject({ method: 'GET', url: '/health' });
  const corpo = resposta.json();

  assert.equal(corpo.obras_indexadas, CATALOGO.length);
  assert.equal(corpo.obras_disponiveis, 3);
  assert.equal(corpo.ultima_ingestao, AGORA);
  // Com 4 obras de teste o servico fica abaixo do minimo e avisa: e o
  // comportamento desejado, /health precisa pegar ingestao quebrada.
  assert.equal(resposta.statusCode, 503);
  assert.equal(corpo.ok, false);

  await app.close();
});

test('/search rejeita nada e respeita a regra de disponibilidade', async () => {
  await semear();
  const app = await construirServidor();

  const resposta = await app.inject({
    method: 'POST',
    url: '/search',
    payload: { texto: 'serigrafia', limite: 5 },
  });

  assert.equal(resposta.statusCode, 200);
  const corpo = resposta.json();
  assert.ok(Array.isArray(corpo.obras));
  assert.ok(corpo.obras.every((o: Obra) => o.disponivel));

  await app.close();
});

test('/chat recusa mensagem vazia', async () => {
  const app = await construirServidor();
  const resposta = await app.inject({ method: 'POST', url: '/chat', payload: { mensagem: '   ' } });
  assert.equal(resposta.statusCode, 400);
  await app.close();
});

test('/compose recusa arquivo que nao e imagem, mesmo rotulado como PNG', async () => {
  await semear();
  const app = await construirServidor();

  const resposta = await app.inject({
    method: 'POST',
    url: '/compose',
    payload: {
      obra_id: 'T-001',
      foto: `data:image/png;base64,${Buffer.from('isto nao e uma imagem').toString('base64')}`,
      quad: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]],
      posicao: { x: 0.5, y: 0.5 },
      parede_cm: 320,
      moldura: 'sem',
    },
  });

  assert.equal(resposta.statusCode, 415);
  await app.close();
});

test('/compose recusa obra indisponivel', async () => {
  await semear();
  const app = await construirServidor();
  const resposta = await app.inject({
    method: 'POST',
    url: '/compose',
    payload: {
      obra_id: 'T-004',
      foto: 'x',
      quad: [[0, 0], [1, 0], [1, 1], [0, 1]],
      posicao: { x: 0.5, y: 0.5 },
      parede_cm: 320,
      moldura: 'sem',
    },
  });
  assert.equal(resposta.statusCode, 404);
  await app.close();
});

test('/compose gera PNG em escala real com a marca dagua', async () => {
  await semear();

  // Recorte da obra e foto da parede, fabricados para o teste.
  const recorte = path.join(caminhos.obras, 'T-001.png');
  fs.mkdirSync(caminhos.obras, { recursive: true });
  await sharp({
    create: { width: 500, height: 700, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } },
  })
    .png()
    .toFile(recorte);

  const db = abrirBanco();
  regravarCatalogo(
    db,
    CATALOGO.map((o) => (o.id === 'T-001' ? { ...o, imagem_local: 'obras/T-001.png' } : o)),
  );
  db.close();

  const foto = await sharp({
    create: { width: 1600, height: 1200, channels: 3, background: { r: 225, g: 222, b: 216 } },
  })
    .jpeg()
    .toBuffer();

  const app = await construirServidor();
  const resposta = await app.inject({
    method: 'POST',
    url: '/compose',
    payload: {
      obra_id: 'T-001',
      // Plano ocupando toda a foto: parede de 300 cm.
      quad: [[0, 0], [1, 0], [1, 1], [0, 1]],
      foto: `data:image/jpeg;base64,${foto.toString('base64')}`,
      posicao: { x: 0.5, y: 0.5 },
      parede_cm: 300,
      moldura: 'classica',
    },
  });

  assert.equal(resposta.statusCode, 200, resposta.body);
  const corpo = resposta.json();

  // Criterio de aceite 9: obra 50x70 com moldura classica vira 64 x 84.
  assert.equal(corpo.medida_com_moldura_cm.largura, 64);
  assert.equal(corpo.medida_com_moldura_cm.altura, 84);
  // 64 cm numa parede de 300 cm.
  assert.ok(Math.abs(corpo.fracao_da_parede - 64 / 300) < 1e-4);

  // Lado maior do PNG em 2000 px, como pede o briefing.
  assert.equal(Math.max(corpo.largura, corpo.altura), config.composeLadoMaiorPx);

  const nome = corpo.url.split('/').pop()!;
  const arquivo = path.join(caminhos.composicoes, nome);
  assert.ok(fs.existsSync(arquivo), 'o PNG precisa estar em disco');

  const meta = await sharp(arquivo).metadata();
  assert.equal(meta.format, 'png');
  assert.equal(meta.width, 2000);

  // A obra foi mesmo desenhada: o vermelho do recorte precisa aparecer.
  const { data, info } = await sharp(arquivo).raw().toBuffer({ resolveWithObject: true });
  let vermelhos = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 150 && data[i + 1] < 90 && data[i + 2] < 90) vermelhos += 1;
  }
  assert.ok(vermelhos > 1000, `esperava area vermelha da obra, achei ${vermelhos} pixels`);

  fs.unlinkSync(arquivo);
  fs.unlinkSync(recorte);
  await app.close();
});
