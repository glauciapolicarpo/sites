import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extrairMedida, lerOverrides, medidaDaObra } from './dimensoes';
import { classificar } from './regras-tags';
import { campo, detalhesDoProduto, itensDoXml } from './feed';

test('medidas sao extraidas nos formatos que aparecem no feed', () => {
  assert.deepEqual(extrairMedida('Serigrafia 50 x 70 cm'), { largura_cm: 50, altura_cm: 70 });
  assert.deepEqual(extrairMedida('50x70cm'), { largura_cm: 50, altura_cm: 70 });
  assert.deepEqual(extrairMedida('medindo 50 por 70'), { largura_cm: 50, altura_cm: 70 });
  assert.deepEqual(extrairMedida('30 × 40 cm'), { largura_cm: 30, altura_cm: 40 });
  assert.deepEqual(extrairMedida('1,20 x 0,80 m'), { largura_cm: 120, altura_cm: 80 });
  assert.deepEqual(extrairMedida('500 x 700 mm'), { largura_cm: 50, altura_cm: 70 });
});

test('medidas absurdas e textos sem medida nao viram dimensao', () => {
  assert.equal(extrairMedida('edicao 3 x 2'), null, '3x2 cm nao e obra de parede');
  assert.equal(extrairMedida('Sem qualquer medida aqui'), null);
  assert.equal(extrairMedida(''), null);
  assert.equal(extrairMedida(null), null);
  assert.equal(extrairMedida('900 x 1200 cm'), null, 'acima do limite fisico plausivel');
});

test('a medida vem da fonte mais confiavel disponivel', () => {
  const m = medidaDaObra({
    productDetail: 'Dimensoes: 40 x 60 cm',
    titulo: 'Obra 10 x 10 cm',
    descricao: '',
  });
  assert.deepEqual(m, { largura_cm: 40, altura_cm: 60, origem: 'product_detail' });

  const semDetalhe = medidaDaObra({ productDetail: null, titulo: 'Obra 50 x 70 cm', descricao: '' });
  assert.equal(semDetalhe?.origem, 'titulo');
});

test('o CSV de override e lido e aceita ponto e virgula ou virgula', () => {
  const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'juliana-')), 'over.csv');
  fs.writeFileSync(
    arquivo,
    'id,largura_cm,altura_cm\nA-1,50,70\n"A-2";40,5;60\n\nlinha-invalida\n',
    'utf8',
  );

  const mapa = lerOverrides(arquivo);
  assert.equal(mapa.get('A-1')?.largura_cm, 50);
  assert.equal(mapa.get('A-1')?.origem, 'override');
  assert.equal(mapa.get('A-2')?.largura_cm, 40.5);
  assert.equal(mapa.size, 2, 'linhas invalidas sao ignoradas em silencio');
});

test('as regras de tag classificam por palavra-chave, com acento ou sem', () => {
  assert.deepEqual(
    classificar({ titulo: 'Composição geométrica', descricao: 'cores vibrantes' }).sort(),
    ['cor_forte', 'geometrico'],
  );
  assert.ok(classificar({ descricao: 'gravura em nanquim, tons de cinza' }).includes('preto_e_branco'));
  assert.ok(classificar({ titulo: 'Retrato de mulher' }).includes('figurativo'));
  assert.deepEqual(classificar({ titulo: 'Sem pista alguma' }), []);
});

test('a excecao impede a tag errada', () => {
  // "abstrato" veta figurativo, mesmo com a palavra "cena" no texto.
  const tags = classificar({ titulo: 'Cena abstrata', descricao: 'pintura abstrata' });
  assert.ok(!tags.includes('figurativo'));
});

const XML = `<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0"><channel>
  <item>
    <g:id>MM-100</g:id>
    <title>Composicao em azul</title>
    <g:brand>Ana Ribeiro</g:brand>
    <g:price>4200.00 BRL</g:price>
    <g:availability>in stock</g:availability>
    <link>https://www.multiplosmm.com.br/p/mm-100</link>
    <g:image_link>https://cdn.exemplo/mm-100.jpg</g:image_link>
    <g:product_detail>
      <g:attribute_name>Dimensoes</g:attribute_name>
      <g:attribute_value>50 x 70 cm</g:attribute_value>
    </g:product_detail>
  </item>
  <item>
    <g:id>MM-101</g:id>
    <title>Outra obra</title>
    <g:availability>out of stock</g:availability>
  </item>
</channel></rss>`;

test('o XML do Google Shopping e lido com o prefixo g: preservado', () => {
  const itens = itensDoXml(XML);
  assert.equal(itens.length, 2);
  assert.equal(campo(itens[0], 'id'), 'MM-100');
  assert.equal(campo(itens[0], 'title'), 'Composicao em azul');
  assert.equal(campo(itens[0], 'brand'), 'Ana Ribeiro');
  assert.equal(campo(itens[0], 'availability'), 'in stock');
  assert.equal(campo(itens[1], 'availability'), 'out of stock');
});

test('product_detail vira texto pesquisavel com a medida dentro', () => {
  const itens = itensDoXml(XML);
  const detalhes = detalhesDoProduto(itens[0]);
  assert.match(detalhes, /50 x 70 cm/);
  assert.deepEqual(extrairMedida(detalhes), { largura_cm: 50, altura_cm: 70 });
});

test('um feed vazio nao quebra a leitura', () => {
  assert.deepEqual(itensDoXml('<rss><channel></channel></rss>'), []);
});
