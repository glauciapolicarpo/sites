import { CSS } from './estilos';
import { h, limpar, prenderFoco } from './dom';
import { criarApi } from './api';
import { criarCartao } from './cartao';
import { criarAmbientacao } from './ambientacao';
import { PERGUNTAS, resumoDaTriagem } from './triagem';
import { EVENTOS, definirSessao, empurrar } from './eventos';

/**
 * Ponto de entrada do widget.
 *
 * Carregado por uma tag de HTML personalizado no GTM que apenas puxa este
 * arquivo do nosso dominio. O bundle nunca e colado dentro da tag: assim
 * versionamento, cache e tamanho continuam sob controle.
 */

const CHAVE_SESSAO = 'juliana_session_id';
const CHAVE_ABERTA = 'juliana_aberta_nesta_navegacao';
const SEGUNDOS_ATE_CONVITE = 40;

function scriptAtual() {
  return (
    document.currentScript ||
    document.querySelector('script[data-api][src*="widget.js"]') ||
    document.querySelector('script[src*="widget.js"]')
  );
}

function lerConfiguracao() {
  const script = scriptAtual();
  const src = script && script.src ? script.src : '';
  let origemPadrao = '';
  try {
    origemPadrao = src ? new URL(src).origin : '';
  } catch {
    origemPadrao = '';
  }
  return {
    api: (script && script.getAttribute('data-api')) || origemPadrao,
    seletorAmbientacao:
      (script && script.getAttribute('data-seletor-ambientacao')) ||
      '[data-juliana-ambientar], .juliana-ambientar, [data-ambientar]',
    logo: (script && script.getAttribute('data-logo')) || '/assets/image/logo/logo.png',
  };
}

function guardar(chave, valor) {
  try {
    window.sessionStorage.setItem(chave, valor);
  } catch {
    // Navegacao privada bloqueia sessionStorage; o widget segue funcionando.
  }
}

function recuperar(chave) {
  try {
    return window.sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}

function novoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Onde o widget se mostra. A decisao fica aqui, no codigo do widget, e nao no
 * GTM, para poder ser ajustada sem tocar no container.
 */
function ehPaginaDeProduto() {
  if (document.querySelector('[itemtype*="Product" i]')) return true;
  const og = document.querySelector('meta[property="og:type"]');
  if (og && /product/i.test(og.getAttribute('content') || '')) return true;
  if (document.querySelector('.product, #product, .produto, #produto, [data-product-id]')) return true;
  return /\/(produto|product|obra|p)\//i.test(location.pathname);
}

function iniciar() {
  if (window.__julianaCarregada === 'pronta') return;
  window.__julianaCarregada = 'pronta';

  const conf = lerConfiguracao();
  if (!conf.api) return;

  const api = criarApi(conf.api);

  let sessionId = recuperar(CHAVE_SESSAO);
  if (!sessionId) {
    sessionId = novoId();
    guardar(CHAVE_SESSAO, sessionId);
  }
  definirSessao(sessionId);

  // Shadow root fechado: nem o Semantic UI entra, nem nosso CSS vaza.
  const hospedeiro = document.createElement('div');
  hospedeiro.setAttribute('data-juliana', '');
  document.body.appendChild(hospedeiro);
  const raiz = hospedeiro.attachShadow({ mode: 'closed' });

  const folha = document.createElement('style');
  folha.textContent = CSS;
  raiz.appendChild(folha);

  // Jost cobre quem nao tem Century Gothic instalada, que e fonte de sistema
  // sem licenca web. O link vai dentro do shadow root, junto do resto.
  const fonte = document.createElement('link');
  fonte.rel = 'stylesheet';
  fonte.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap';
  raiz.appendChild(fonte);

  const estado = {
    aberta: false,
    enviando: false,
    triagem: {},
    passoTriagem: 0,
    triagemConcluida: false,
    ultimaObra: null,
  };

  // ------------------------------------------------------------------ montagem

  const mensagens = h('div', {
    class: 'mensagens',
    role: 'log',
    'aria-live': 'polite',
    'aria-relevant': 'additions text',
    'aria-label': 'Conversa com a Juliana',
  });

  const campo = h('textarea', {
    class: 'campo',
    rows: '1',
    'aria-label': 'Escreva sua mensagem para a Juliana',
    placeholder: 'Escreva aqui...',
    onkeydown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviar(campo.value);
      }
    },
    oninput: () => {
      campo.style.height = 'auto';
      campo.style.height = `${Math.min(campo.scrollHeight, 110)}px`;
    },
  });

  const botaoEnviar = h('button', {
    class: 'enviar',
    type: 'button',
    'aria-label': 'Enviar mensagem',
    texto: '↑',
    onclick: () => enviar(campo.value),
  });

  const redacao = h('div', { class: 'redacao' }, [
    h('div', { class: 'linha-redacao' }, [campo, botaoEnviar]),
    h('p', {
      class: 'aviso-rodape',
      texto: 'Juliana e uma assistente virtual e pode errar. Confira os dados na pagina da obra.',
    }),
  ]);

  const logo = h('img', { class: 'logo', src: conf.logo, alt: 'Multiplos Mayer Mizrahi' });
  logo.addEventListener('error', () => logo.remove());

  const painel = h(
    'div',
    { class: 'painel oculto', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'Juliana, consultora de arte' },
    [
      h('header', { class: 'cabecalho' }, [
        h('div', { class: 'avatar', 'aria-hidden': 'true' }, 'J'),
        h('div', { class: 'identidade' }, [
          h('div', { class: 'nome', texto: 'Juliana' }),
          h('div', { class: 'subtitulo', texto: 'assistente virtual · Múltiplos MM' }),
        ]),
        logo,
        h('button', {
          class: 'fechar',
          type: 'button',
          'aria-label': 'Fechar a conversa',
          texto: '×',
          onclick: fecharPainel,
        }),
      ]),
      mensagens,
      redacao,
    ],
  );

  const ambientacao = criarAmbientacao({
    api,
    aoFechar: () => campo.focus(),
    aoConsultor: (obra) => pedirConsultor(obra),
  });
  painel.appendChild(ambientacao.raiz);

  const lancador = h('button', {
    class: 'lancador',
    type: 'button',
    texto: 'Falar com a Juliana',
    onclick: () => abrirPainel('botao'),
  });

  raiz.appendChild(lancador);
  raiz.appendChild(painel);
  painel.addEventListener('keydown', prenderFoco(raiz, painel));
  painel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharPainel();
  });

  // ------------------------------------------------------------------ conversa

  function rolarAoFim() {
    mensagens.scrollTop = mensagens.scrollHeight;
  }

  function dizer(texto, classe = 'dela') {
    const balao = h('div', { class: `balao ${classe}`, texto });
    mensagens.appendChild(balao);
    rolarAoFim();
    return balao;
  }

  function mostrarChips(opcoes, aoEscolher) {
    const grupo = h('div', { class: 'chips', role: 'group' });
    for (const opcao of opcoes) {
      grupo.appendChild(
        h('button', {
          class: 'chip',
          type: 'button',
          texto: opcao,
          onclick: () => {
            grupo.remove();
            aoEscolher(opcao);
          },
        }),
      );
    }
    mensagens.appendChild(grupo);
    rolarAoFim();
    return grupo;
  }

  function digitando(ligar) {
    const existente = raiz.querySelector('.digitando');
    if (!ligar) {
      if (existente) existente.remove();
      return;
    }
    if (existente) return;
    mensagens.appendChild(
      h('div', { class: 'digitando', 'aria-hidden': 'true' }, [
        h('span'),
        h('span'),
        h('span'),
      ]),
    );
    rolarAoFim();
  }

  function proximaPerguntaDaTriagem() {
    if (estado.passoTriagem >= PERGUNTAS.length) {
      estado.triagemConcluida = true;
      empurrar(EVENTOS.triagem, {
        ambiente: estado.triagem.ambiente || null,
        gosto: estado.triagem.gosto || null,
        faixa: estado.triagem.faixa || null,
      });
      enviar(resumoDaTriagem(estado.triagem), { silencioso: true });
      return;
    }

    const pergunta = PERGUNTAS[estado.passoTriagem];
    dizer(pergunta.texto);
    mostrarChips(pergunta.opcoes, (escolha) => {
      dizer(escolha, 'minha');
      estado.triagem[pergunta.chave] = escolha;
      estado.passoTriagem += 1;
      proximaPerguntaDaTriagem();
    });
  }

  async function enviar(texto, { silencioso = false } = {}) {
    const conteudo = String(texto || '').trim();
    if (!conteudo || estado.enviando) return;

    // Texto livre a qualquer momento encerra a triagem por chips.
    estado.triagemConcluida = true;

    if (!silencioso) dizer(conteudo, 'minha');
    campo.value = '';
    campo.style.height = 'auto';

    estado.enviando = true;
    botaoEnviar.disabled = true;
    digitando(true);

    try {
      const resposta = await api.conversar(sessionId, conteudo);
      digitando(false);

      if (resposta.session_id && resposta.session_id !== sessionId) {
        sessionId = resposta.session_id;
        guardar(CHAVE_SESSAO, sessionId);
        definirSessao(sessionId);
      }

      if (resposta.resposta) dizer(resposta.resposta);

      const obras = Array.isArray(resposta.obras) ? resposta.obras : [];
      obras.forEach((obra, indice) => {
        mensagens.appendChild(
          criarCartao(obra, {
            api,
            posicao: indice + 1,
            aoAmbientar: abrirAmbientacao,
            aoConsultor: pedirConsultor,
          }),
        );
      });
      if (obras.length > 0) estado.ultimaObra = obras[0];
      rolarAoFim();

      for (const acao of resposta.acoes || []) {
        if (acao.tipo === 'abrir_ambientacao') {
          const alvo = obras.find((o) => o.id === acao.obra_id) || estado.ultimaObra;
          if (alvo) abrirAmbientacao(alvo);
        } else if (acao.tipo === 'chamar_consultor') {
          mostrarBotaoConsultor(acao);
        }
      }
    } catch (e) {
      digitando(false);
      dizer(
        e.status === 429
          ? e.message
          : 'Tive um problema para responder agora. Pode tentar de novo em instantes?',
        'erro',
      );
    } finally {
      estado.enviando = false;
      botaoEnviar.disabled = false;
    }
  }

  function mostrarBotaoConsultor(acao) {
    empurrar(EVENTOS.handoff, { motivo: acao.motivo || '', obra_id: acao.obra_id || null });
    if (!acao.whatsapp_url) return;
    mensagens.appendChild(
      h('a', {
        class: 'botao',
        href: acao.whatsapp_url,
        target: '_blank',
        rel: 'noopener',
        texto: 'Falar com um consultor no WhatsApp',
      }),
    );
    rolarAoFim();
  }

  function pedirConsultor(obra) {
    estado.ultimaObra = obra || estado.ultimaObra;
    const nome = obra && obra.titulo ? ` sobre a obra ${obra.titulo}` : '';
    enviar(`Gostaria de falar com um consultor humano${nome}.`);
  }

  function abrirAmbientacao(obra) {
    if (!obra) return;
    estado.ultimaObra = obra;
    abrirPainel('ambientacao');
    ambientacao.abrir(obra);
  }

  // ------------------------------------------------------------------ abertura

  function abrirPainel(origem) {
    if (estado.aberta) return;
    estado.aberta = true;
    painel.classList.remove('oculto');
    lancador.classList.add('oculto');
    guardar(CHAVE_ABERTA, '1');
    empurrar(EVENTOS.aberta, { origem: origem || 'botao' });

    if (mensagens.childElementCount === 0) {
      dizer(
        'Ola! Sou a Juliana, assistente virtual da Multiplos MM. Posso te ajudar a escolher uma obra e mostrar como ela fica na sua parede.',
      );
      if (!estado.triagemConcluida) proximaPerguntaDaTriagem();
    }
    setTimeout(() => campo.focus(), 50);
  }

  function fecharPainel() {
    estado.aberta = false;
    painel.classList.add('oculto');
    lancador.classList.remove('oculto');
    ambientacao.fechar();
    lancador.focus();
  }

  // Caso 1: clique no botao de ambientacao de um card de produto.
  document.addEventListener(
    'click',
    (evento) => {
      const alvo = evento.target && evento.target.closest
        ? evento.target.closest(conf.seletorAmbientacao)
        : null;
      if (!alvo) return;
      evento.preventDefault();
      const obraId = alvo.getAttribute('data-obra-id') || alvo.getAttribute('data-product-id');
      abrirPainel('card-produto');
      if (obraId) enviar(`Quero ver a obra ${obraId} na minha parede.`, { silencioso: true });
    },
    true,
  );

  // Caso 2: 40 segundos na mesma pagina de produto, com rolagem ate o fim.
  if (ehPaginaDeProduto() && recuperar(CHAVE_ABERTA) !== '1') {
    let chegouAoFim = false;
    let tempoCumprido = false;

    const tentar = () => {
      if (chegouAoFim && tempoCumprido && !estado.aberta) abrirPainel('permanencia');
    };

    setTimeout(() => {
      tempoCumprido = true;
      tentar();
    }, SEGUNDOS_ATE_CONVITE * 1000);

    const aoRolar = () => {
      const fim =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 120;
      if (fim) {
        chegouAoFim = true;
        window.removeEventListener('scroll', aoRolar);
        tentar();
      }
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
  }

  // Grava a transcricao quando o visitante fecha a aba.
  window.addEventListener('pagehide', () => {
    if (mensagens.childElementCount === 0) return;
    try {
      const corpo = JSON.stringify({ session_id: sessionId });
      navigator.sendBeacon(
        `${api.raiz}/chat/encerrar`,
        new Blob([corpo], { type: 'application/json' }),
      );
    } catch {
      // Sem sendBeacon a sessao e encerrada pela varredura de inatividade.
    }
  });

  // Superficie publica minima, para o site abrir a Juliana quando quiser.
  window.Juliana = {
    abrir: () => abrirPainel('api'),
    fechar: fecharPainel,
    ambientar: (obraId) => {
      abrirPainel('api');
      if (obraId) enviar(`Quero ver a obra ${obraId} na minha parede.`, { silencioso: true });
    },
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true });
} else {
  iniciar();
}
