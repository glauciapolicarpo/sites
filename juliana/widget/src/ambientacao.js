import {
  ALTURA_CENTRO_PADRAO_CM,
  PAREDE_PADRAO_CM,
  colocarObra,
  deslocamentoDaSombra,
  inverter,
  aplicar,
  OPACIDADE_SOMBRA,
  planoDaParede,
  vDaAlturaDoChao,
} from '../../src/compartilhado/geometria';
import { MOLDURAS, moldura } from '../../src/compartilhado/molduras';
import { caminhoDoQuad, desenharComPerspectiva } from './canvas-warp';
import { h, limpar, medidaEmCm } from './dom';
import { EVENTOS, empurrar } from './eventos';

/**
 * Painel de ambientacao.
 *
 * O fluxo segue o briefing, na ordem:
 *   1. o cliente envia a foto (que nao sai do navegador nesta etapa);
 *   2. informa a largura aproximada da parede em cm, que e a referencia que
 *      produz a escala real;
 *   3. marca os quatro cantos da area de parede;
 *   4. a obra e desenhada dentro do plano, com perspectiva;
 *   5. arrasta para posicionar;
 *   6. escolhe entre as sete molduras;
 *   7. salva, e so nesse momento a foto sobe para o servidor.
 */

const PASSOS = {
  foto: 'foto',
  parede: 'parede',
  cantos: 'cantos',
  ajuste: 'ajuste',
};

export function criarAmbientacao({ api, aoFechar, aoConsultor }) {
  const estado = {
    obra: null,
    passo: PASSOS.foto,
    imagemFoto: null,
    fotoDataUrl: '',
    paredeCm: PAREDE_PADRAO_CM,
    /** Cantos em coordenadas normalizadas 0..1 da foto. */
    cantos: [],
    /** Centro da peca, em coordenadas (u,v) do plano. */
    centro: { x: 0.5, y: 0.5 },
    moldura: 'sem',
    imagemObra: null,
    arrastando: false,
    salvando: false,
  };

  const canvas = h('canvas', { role: 'img', 'aria-label': 'Previa da obra na sua parede' });
  const ctx = canvas.getContext('2d');
  const palco = h('div', { class: 'palco oculto' }, [canvas]);

  const passoRotulo = h('p', { class: 'amb-passo' });
  const instrucao = h('p', { class: 'amb-instrucao' });
  const erro = h('p', { class: 'erro-inline oculto', role: 'alert' });
  const medidaViva = h('p', { class: 'medida-viva' });
  const areaControles = h('div');

  const titulo = h('span', { class: 'amb-titulo' });
  const corpo = h('div', { class: 'amb-corpo' }, [
    passoRotulo,
    instrucao,
    erro,
    palco,
    medidaViva,
    areaControles,
  ]);

  const botaoVoltar = h('button', {
    class: 'botao secundario',
    type: 'button',
    texto: 'Refazer',
    onclick: reiniciarMarcacao,
  });
  const botaoSalvar = h('button', {
    class: 'botao',
    type: 'button',
    texto: 'Salvar imagem',
    onclick: salvar,
  });
  const rodape = h('div', { class: 'amb-rodape oculto' }, [botaoVoltar, botaoSalvar]);

  const privacidade = h('p', {
    class: 'privacidade',
    texto: 'Sua foto fica no seu aparelho. Ela so e enviada ao nosso servidor quando voce toca em salvar.',
  });

  const raiz = h('section', { class: 'ambientacao oculto', 'aria-label': 'Ver na minha parede' }, [
    h('div', { class: 'amb-topo' }, [
      h('button', {
        class: 'fechar',
        type: 'button',
        'aria-label': 'Voltar para a conversa',
        texto: '←',
        onclick: fechar,
      }),
      titulo,
    ]),
    corpo,
    privacidade,
    rodape,
  ]);

  // ------------------------------------------------------------------ passos

  function abrir(obra) {
    estado.obra = obra;
    estado.passo = obra ? PASSOS.foto : PASSOS.foto;
    estado.cantos = [];
    estado.centro = { x: 0.5, y: 0.5 };
    estado.moldura = 'sem';
    estado.imagemObra = null;
    raiz.classList.remove('oculto');

    titulo.textContent = obra ? obra.titulo : 'Ver na minha parede';
    empurrar(EVENTOS.ambientacaoIniciada, { obra_id: obra ? obra.id : null });

    if (obra) {
      const imagem = new Image();
      imagem.crossOrigin = 'anonymous';
      imagem.onload = () => {
        estado.imagemObra = imagem;
        desenhar();
      };
      imagem.onerror = () => mostrarErro('Nao consegui carregar a imagem desta obra.');
      imagem.src = api.urlDaObra(obra);
    }

    // Se a foto ja foi enviada antes, o cliente nao precisa repetir o passo.
    estado.passo = estado.imagemFoto ? PASSOS.cantos : PASSOS.foto;
    if (estado.imagemFoto) estado.cantos = [];
    renderizar();
  }

  function fechar() {
    raiz.classList.add('oculto');
    if (typeof aoFechar === 'function') aoFechar();
  }

  function mostrarErro(texto) {
    erro.textContent = texto;
    erro.classList.toggle('oculto', !texto);
  }

  function reiniciarMarcacao() {
    estado.cantos = [];
    estado.passo = PASSOS.cantos;
    mostrarErro('');
    renderizar();
  }

  function renderizar() {
    limpar(areaControles);
    mostrarErro('');
    rodape.classList.add('oculto');
    palco.classList.toggle('oculto', !estado.imagemFoto);

    if (estado.passo === PASSOS.foto) return renderizarFoto();
    if (estado.passo === PASSOS.parede) return renderizarParede();
    if (estado.passo === PASSOS.cantos) return renderizarCantos();
    return renderizarAjuste();
  }

  function renderizarFoto() {
    passoRotulo.textContent = 'Passo 1 de 4';
    instrucao.textContent =
      'Tire ou escolha uma foto da parede onde a obra vai ficar. Fotografe de frente, com a parede inteira visivel.';
    medidaViva.textContent = '';

    const entrada = h('input', {
      type: 'file',
      accept: 'image/*',
      id: 'juliana-foto',
      onchange: (e) => receberFoto(e.target.files && e.target.files[0]),
    });

    areaControles.appendChild(
      h('label', { class: 'arquivo', for: 'juliana-foto' }, [
        'Toque para enviar uma foto da parede',
        entrada,
      ]),
    );
  }

  function renderizarParede() {
    passoRotulo.textContent = 'Passo 2 de 4';
    instrucao.textContent =
      'Qual a largura aproximada dessa parede, em centimetros? E essa medida que coloca a obra em escala real.';
    medidaViva.textContent = '';

    const campo = h('input', {
      class: 'entrada-numero numero',
      type: 'number',
      inputmode: 'numeric',
      min: '50',
      max: '2000',
      step: '10',
      id: 'juliana-parede',
      value: String(estado.paredeCm),
    });

    const seguir = h('button', {
      class: 'botao',
      type: 'button',
      texto: 'Continuar',
      onclick: () => {
        const valor = Number(campo.value);
        if (!Number.isFinite(valor) || valor < 50 || valor > 2000) {
          return mostrarErro('Informe uma largura entre 50 e 2000 cm.');
        }
        estado.paredeCm = valor;
        estado.passo = PASSOS.cantos;
        renderizar();
      },
    });

    areaControles.appendChild(
      h('div', {}, [
        h('label', { class: 'rotulo', for: 'juliana-parede' }, 'Largura da parede em centimetros'),
        h('div', { class: 'linha-redacao' }, [campo, seguir]),
      ]),
    );
  }

  function renderizarCantos() {
    passoRotulo.textContent = 'Passo 3 de 4';
    const faltam = 4 - estado.cantos.length;
    instrucao.textContent =
      faltam > 0
        ? `Toque nos quatro cantos da area de parede, no sentido horario comecando pelo canto superior esquerdo. Faltam ${faltam}.`
        : 'Cantos marcados.';
    medidaViva.textContent = '';
    areaControles.appendChild(
      h('button', {
        class: 'botao secundario',
        type: 'button',
        texto: 'Comecar de novo',
        onclick: reiniciarMarcacao,
      }),
    );
    desenhar();
  }

  function renderizarAjuste() {
    passoRotulo.textContent = 'Passo 4 de 4';
    instrucao.textContent = 'Arraste a obra para posicionar e escolha a moldura.';
    rodape.classList.remove('oculto');

    const grade = h('div', { class: 'molduras', role: 'group', 'aria-label': 'Moldura' });
    for (const m of MOLDURAS) {
      const amostra = h('span', {
        class: 'amostra',
        'aria-hidden': 'true',
        estilo: {
          background: m.cor || 'var(--mm-papel)',
          border: m.cor ? '0' : '1px dashed var(--mm-linha)',
        },
      });
      grade.appendChild(
        h(
          'button',
          {
            class: 'moldura-opcao',
            type: 'button',
            'aria-pressed': String(estado.moldura === m.id),
            onclick: () => {
              estado.moldura = m.id;
              renderizar();
            },
          },
          [amostra, m.nome],
        ),
      );
    }
    areaControles.appendChild(grade);
    atualizarMedidaViva();
    desenhar();
  }

  function atualizarMedidaViva() {
    const obra = estado.obra;
    if (!obra || !obra.largura_cm || !obra.altura_cm) {
      medidaViva.textContent = 'Esta obra ainda nao tem medida cadastrada: a escala aqui e aproximada.';
      return;
    }
    const m = moldura(estado.moldura);
    const total = medidaEmCm(
      obra.largura_cm + 2 * m.espessuraCm,
      obra.altura_cm + 2 * m.espessuraCm,
    );
    const nua = medidaEmCm(obra.largura_cm, obra.altura_cm);
    medidaViva.textContent =
      m.espessuraCm > 0
        ? `Obra ${nua}. Com ${m.nome.toLowerCase()} (${String(m.espessuraCm).replace('.', ',')} cm), a peca ocupa ${total} na parede.`
        : `Obra ${nua}, sem moldura.`;
  }

  // -------------------------------------------------------------- foto/canvas

  function receberFoto(arquivo) {
    if (!arquivo) return;
    if (!/^image\//.test(arquivo.type)) {
      return mostrarErro('Escolha um arquivo de imagem.');
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onload = () => {
        estado.imagemFoto = imagem;
        estado.fotoDataUrl = String(leitor.result);
        estado.cantos = [];
        estado.passo = PASSOS.parede;
        ajustarCanvas();
        renderizar();
      };
      imagem.onerror = () => mostrarErro('Nao consegui abrir essa imagem.');
      imagem.src = String(leitor.result);
    };
    leitor.onerror = () => mostrarErro('Nao consegui ler o arquivo.');
    leitor.readAsDataURL(arquivo);
  }

  function ajustarCanvas() {
    const imagem = estado.imagemFoto;
    if (!imagem) return;
    const larguraAlvo = Math.min(palco.clientWidth || 360, 720) || 360;
    const escala = larguraAlvo / imagem.width;
    canvas.width = Math.round(imagem.width * escala);
    canvas.height = Math.round(imagem.height * escala);
  }

  /** Converte os cantos normalizados para pixels do canvas. */
  function quadEmPixels() {
    return estado.cantos.map((c) => ({ x: c.x * canvas.width, y: c.y * canvas.height }));
  }

  function planoAtual() {
    if (estado.cantos.length !== 4) return null;
    return planoDaParede(quadEmPixels(), estado.paredeCm);
  }

  /** Obra emoldurada desenhada achatada, para depois ser projetada. */
  function comporPeca(plano) {
    const obra = estado.obra;
    const m = moldura(estado.moldura);
    const larguraCm = obra && obra.largura_cm ? obra.largura_cm : 50;
    const alturaCm = obra && obra.altura_cm ? obra.altura_cm : 70;

    const totalLargura = larguraCm + 2 * m.espessuraCm;
    const totalAltura = alturaCm + 2 * m.espessuraCm;

    // Resolucao da peca achatada: o dobro do que ela ocupa na tela, com teto,
    // para o texture mapping nao ficar serrilhado nem pesar no celular.
    const alvoPx = Math.min(900, Math.max(180, plano.pixelsPorCm * totalLargura * 2));
    const escala = alvoPx / totalLargura;

    const fora = document.createElement('canvas');
    fora.width = Math.max(8, Math.round(totalLargura * escala));
    fora.height = Math.max(8, Math.round(totalAltura * escala));
    const fctx = fora.getContext('2d');
    const borda = m.espessuraCm * escala;

    if (m.cor && borda >= 0.5) {
      fctx.fillStyle = m.cor;
      fctx.fillRect(0, 0, fora.width, fora.height);
      const chanfro = Math.max(1, borda * 0.18);
      fctx.fillStyle = m.corInterna || m.cor;
      fctx.fillRect(
        borda - chanfro,
        borda - chanfro,
        fora.width - 2 * (borda - chanfro),
        fora.height - 2 * (borda - chanfro),
      );
    }

    if (estado.imagemObra) {
      fctx.drawImage(
        estado.imagemObra,
        borda,
        borda,
        fora.width - 2 * borda,
        fora.height - 2 * borda,
      );
    } else {
      fctx.fillStyle = '#E6E6E6';
      fctx.fillRect(borda, borda, fora.width - 2 * borda, fora.height - 2 * borda);
    }

    return fora;
  }

  function desenhar() {
    if (!estado.imagemFoto || !ctx) return;
    if (canvas.width === 0) ajustarCanvas();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(estado.imagemFoto, 0, 0, canvas.width, canvas.height);

    const pontos = quadEmPixels();

    if (estado.cantos.length < 4) {
      desenharMarcadores(pontos);
      canvas.classList.remove('arrastavel');
      return;
    }

    const plano = planoAtual();
    if (!plano) return;

    const m = moldura(estado.moldura);
    const obra = estado.obra;
    const colocacao = colocarObra(plano, {
      larguraCm: obra && obra.largura_cm ? obra.largura_cm : 50,
      alturaCm: obra && obra.altura_cm ? obra.altura_cm : 70,
      espessuraMolduraCm: m.espessuraCm,
      centro: estado.centro,
    });

    const peca = comporPeca(plano);

    // Sombra projetada, proporcional a espessura da moldura. Sem ela a obra
    // parece adesivo colado na foto.
    const desloc = deslocamentoDaSombra(m.espessuraCm, plano.pixelsPorCm);
    ctx.save();
    ctx.globalAlpha = OPACIDADE_SOMBRA;
    if (typeof ctx.filter === 'string') {
      ctx.filter = `blur(${Math.min(24, Math.max(1, desloc.desfoque)).toFixed(1)}px)`;
    }
    ctx.fillStyle = '#000000';
    caminhoDoQuad(
      ctx,
      colocacao.quad.map((p) => ({ x: p.x + desloc.dx, y: p.y + desloc.dy })),
    );
    ctx.fill();
    ctx.restore();

    desenharComPerspectiva(ctx, peca, colocacao.quad, 12);
    canvas.classList.add('arrastavel');
  }

  function desenharMarcadores(pontos) {
    if (pontos.length === 0) return;
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(27, 28, 29, 0.85)';

    if (pontos.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pontos[0].x, pontos[0].y);
      for (let i = 1; i < pontos.length; i += 1) ctx.lineTo(pontos[i].x, pontos[i].y);
      if (pontos.length === 4) ctx.closePath();
      ctx.stroke();
    }

    for (const [indice, p] of pontos.entries()) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(indice + 1), p.x, p.y);
      ctx.fillStyle = 'rgba(27, 28, 29, 0.85)';
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ ponteiro

  function posicaoNoCanvas(evento) {
    const caixa = canvas.getBoundingClientRect();
    return {
      x: ((evento.clientX - caixa.left) / caixa.width) * canvas.width,
      y: ((evento.clientY - caixa.top) / caixa.height) * canvas.height,
    };
  }

  canvas.addEventListener('pointerdown', (evento) => {
    if (!estado.imagemFoto) return;
    const p = posicaoNoCanvas(evento);

    if (estado.cantos.length < 4) {
      estado.cantos.push({ x: p.x / canvas.width, y: p.y / canvas.height });
      if (estado.cantos.length === 4) {
        const plano = planoAtual();
        // Comeca na altura museologica de 145 cm do chao, centrado na parede.
        estado.centro = { x: 0.5, y: plano ? vDaAlturaDoChao(plano, ALTURA_CENTRO_PADRAO_CM) : 0.5 };
        estado.passo = PASSOS.ajuste;
        renderizar();
      } else {
        renderizarCantos();
      }
      return;
    }

    estado.arrastando = true;
    canvas.classList.add('arrastando');
    canvas.setPointerCapture(evento.pointerId);
    moverPara(p);
  });

  canvas.addEventListener('pointermove', (evento) => {
    if (!estado.arrastando) return;
    evento.preventDefault();
    moverPara(posicaoNoCanvas(evento));
  });

  const soltar = (evento) => {
    if (!estado.arrastando) return;
    estado.arrastando = false;
    canvas.classList.remove('arrastando');
    try {
      canvas.releasePointerCapture(evento.pointerId);
    } catch {
      // Ponteiro ja liberado pelo navegador.
    }
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);

  function moverPara(pontoPx) {
    const plano = planoAtual();
    if (!plano) return;
    const uv = aplicar(inverter(plano.homografia), pontoPx.x, pontoPx.y);
    estado.centro = {
      x: Math.min(1, Math.max(0, uv.x)),
      y: Math.min(1, Math.max(0, uv.y)),
    };
    desenhar();
  }

  // Teclado: mover a obra sem ponteiro, para o fluxo ser navegavel.
  canvas.setAttribute('tabindex', '0');
  canvas.addEventListener('keydown', (evento) => {
    if (estado.cantos.length !== 4) return;
    const passo = evento.shiftKey ? 0.05 : 0.01;
    const mapa = {
      ArrowLeft: [-passo, 0],
      ArrowRight: [passo, 0],
      ArrowUp: [0, -passo],
      ArrowDown: [0, passo],
    };
    const delta = mapa[evento.key];
    if (!delta) return;
    evento.preventDefault();
    estado.centro = {
      x: Math.min(1, Math.max(0, estado.centro.x + delta[0])),
      y: Math.min(1, Math.max(0, estado.centro.y + delta[1])),
    };
    desenhar();
  });

  // ------------------------------------------------------------------ salvar

  async function salvar() {
    if (estado.salvando) return;
    const obra = estado.obra;
    if (!obra || estado.cantos.length !== 4) return;

    estado.salvando = true;
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = 'Gerando...';
    mostrarErro('');

    try {
      const resultado = await api.compor({
        obra_id: obra.id,
        foto: estado.fotoDataUrl,
        quad: estado.cantos.map((c) => [c.x, c.y]),
        posicao: estado.centro,
        parede_cm: estado.paredeCm,
        moldura: estado.moldura,
      });

      empurrar(EVENTOS.ambientacaoGerada, { obra_id: obra.id, moldura: estado.moldura });

      const link = h('a', {
        class: 'botao',
        href: resultado.url,
        target: '_blank',
        rel: 'noopener',
        download: `${obra.titulo || 'obra'}-na-minha-parede.png`,
        texto: 'Baixar imagem',
        onclick: () => empurrar(EVENTOS.imagemBaixada, { obra_id: obra.id }),
      });

      limpar(areaControles).appendChild(
        h('div', {}, [
          h('p', { class: 'amb-instrucao', texto: 'Sua imagem esta pronta.' }),
          link,
        ]),
      );
    } catch (e) {
      mostrarErro(e.message || 'Nao consegui gerar a imagem agora.');
    } finally {
      estado.salvando = false;
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = 'Salvar imagem';
    }
  }

  window.addEventListener('resize', () => {
    if (!estado.imagemFoto || raiz.classList.contains('oculto')) return;
    ajustarCanvas();
    desenhar();
  });

  return {
    raiz,
    abrir,
    fechar,
    pedirConsultor: () => {
      if (typeof aoConsultor === 'function') aoConsultor(estado.obra);
    },
  };
}
