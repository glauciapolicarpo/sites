import { h, emReais, medidaEmCm } from './dom';
import { EVENTOS, empurrar } from './eventos';

/**
 * Cartao de obra. O cartao inteiro leva para a pagina do produto; os dois
 * botoes ficam fora do link, para o toque neles nao navegar sem querer.
 */
export function criarCartao(obra, { api, aoAmbientar, aoConsultor, posicao }) {
  const meta = [obra.tecnica, obra.edicao, medidaEmCm(obra.largura_cm, obra.altura_cm)]
    .filter(Boolean)
    .join(' · ');

  const link = h(
    'a',
    {
      class: 'cartao',
      href: obra.url || '#',
      target: '_blank',
      rel: 'noopener',
      onclick: () => empurrar(EVENTOS.cliqueProduto, { obra_id: obra.id }),
    },
    [
      h('img', {
        class: 'cartao-imagem',
        src: api.urlDaObra(obra),
        alt: `${obra.titulo}${obra.artista ? `, de ${obra.artista}` : ''}`,
        loading: 'lazy',
      }),
      h('div', { class: 'cartao-corpo' }, [
        h('div', { class: 'cartao-titulo', texto: obra.titulo }),
        obra.artista ? h('div', { class: 'cartao-artista', texto: obra.artista }) : null,
        meta ? h('div', { class: 'cartao-meta numero', texto: meta }) : null,
        h('div', { class: 'cartao-preco numero', texto: emReais(obra.preco) }),
      ]),
    ],
  );

  const acoes = h('div', { class: 'cartao-acoes' }, [
    h('button', {
      class: 'botao',
      type: 'button',
      texto: 'Ver na minha parede',
      onclick: () => aoAmbientar(obra),
    }),
    h('button', {
      class: 'botao secundario',
      type: 'button',
      texto: 'Falar com consultor',
      onclick: () => aoConsultor(obra),
    }),
  ]);

  empurrar(EVENTOS.recomendada, { obra_id: obra.id, posicao });

  return h('div', { class: 'cartao' }, [link, acoes]);
}
