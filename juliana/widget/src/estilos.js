/**
 * CSS do widget. Vive inteiro dentro do shadow root.
 *
 * O site roda Semantic UI 2.2.12, que aplica estilo global agressivo em
 * `button`, `input`, `div` e classes genericas. Nada aqui vaza para fora e
 * nada de la entra, porque o shadow root isola os dois lados. Por isso todo
 * seletor pode ser simples: nao existe colisao possivel.
 */
export const CSS = `
:host {
  all: initial;
  --mm-branco:      #FFFFFF;
  --mm-papel:       #F7F7F6;
  --mm-tinta:       #1B1C1D;
  --mm-texto:       #444444;
  --mm-cinza:       #767676;
  --mm-linha:       #D4D4D5;
  --mm-linha-fraca: #E6E6E6;
  --mm-ok:          #21BA45;
  --mm-erro:        #DB2828;
  --mm-raio:        4px;
  --mm-fonte: 'Century Gothic', 'Jost', 'Questrial', 'Apple Gothic', 'URW Gothic', sans-serif;

  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 2147483000;
  font-family: var(--mm-fonte);
  color: var(--mm-texto);
  line-height: 1.5;
}

*, *::before, *::after { box-sizing: border-box; }

button, input, textarea, select {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  margin: 0;
}

/* Foco sempre visivel, em todos os controles. */
:focus-visible {
  outline: 2px solid var(--mm-tinta);
  outline-offset: 2px;
}

.numero { font-variant-numeric: tabular-nums; }

.oculto { display: none !important; }

.apenas-leitor {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* ---------------------------------------------------------------- lancador */

.lancador {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  background: var(--mm-tinta);
  color: var(--mm-branco);
  border: 0;
  border-radius: var(--mm-raio);
  font-size: 15px;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.lancador:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28); }
.lancador:active { transform: translateY(1px); }

/* ---------------------------------------------------------------- painel */

.painel {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 400px;
  max-width: calc(100vw - 32px);
  height: 620px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  background: var(--mm-branco);
  border: 1px solid var(--mm-linha);
  border-radius: var(--mm-raio);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

@media (max-width: 520px) {
  .painel {
    right: 0; bottom: 0; left: 0;
    width: 100vw;
    max-width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border: 0;
    border-radius: 0;
  }
  .lancador { right: 12px; bottom: 12px; }
}

/* ---------------------------------------------------------------- cabecalho */

.cabecalho {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--mm-papel);
  border-bottom: 1px solid var(--mm-linha);
  flex: 0 0 auto;
}

.avatar {
  width: 34px; height: 34px;
  flex: 0 0 34px;
  border-radius: 50%;
  background: var(--mm-tinta);
  color: var(--mm-branco);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  letter-spacing: 0.02em;
}

.identidade { flex: 1 1 auto; min-width: 0; }

.nome {
  font-size: 15px;
  color: var(--mm-tinta);
  letter-spacing: 0.01em;
}

/* Subtitulo fixo: a Juliana nunca se apresenta como pessoa. */
.subtitulo {
  font-size: 11.5px;
  color: var(--mm-cinza);
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logo { height: 20px; width: auto; opacity: 0.9; }

.fechar {
  width: 32px; height: 32px;
  flex: 0 0 32px;
  background: transparent;
  border: 0;
  border-radius: var(--mm-raio);
  color: var(--mm-cinza);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.fechar:hover { background: var(--mm-linha-fraca); color: var(--mm-tinta); }

/* ---------------------------------------------------------------- mensagens */

.mensagens {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--mm-branco);
}

.balao {
  max-width: 85%;
  padding: 10px 13px;
  border-radius: var(--mm-raio);
  font-size: 14.5px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.balao.dela {
  align-self: flex-start;
  background: var(--mm-papel);
  color: var(--mm-texto);
}

.balao.minha {
  align-self: flex-end;
  background: var(--mm-tinta);
  color: var(--mm-branco);
}

.balao.erro {
  align-self: flex-start;
  background: var(--mm-branco);
  color: var(--mm-erro);
  border: 1px solid var(--mm-erro);
}

.digitando {
  align-self: flex-start;
  display: flex;
  gap: 4px;
  padding: 12px 13px;
  background: var(--mm-papel);
  border-radius: var(--mm-raio);
}
.digitando span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--mm-cinza);
  animation: pulsa 1.2s infinite ease-in-out;
}
.digitando span:nth-child(2) { animation-delay: 0.15s; }
.digitando span:nth-child(3) { animation-delay: 0.3s; }

@keyframes pulsa {
  0%, 60%, 100% { opacity: 0.25; }
  30% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .digitando span { animation: none; opacity: 0.5; }
  .lancador { transition: none; }
}

/* ---------------------------------------------------------------- chips */

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-self: flex-start;
  max-width: 100%;
}

.chip {
  padding: 7px 12px;
  background: var(--mm-branco);
  border: 1px solid var(--mm-linha);
  border-radius: var(--mm-raio);
  color: var(--mm-texto);
  font-size: 13.5px;
  cursor: pointer;
}
.chip:hover { border-color: var(--mm-tinta); color: var(--mm-tinta); }

/* ---------------------------------------------------------------- cartao */

.cartao {
  align-self: stretch;
  display: block;
  border: 1px solid var(--mm-linha);
  border-radius: var(--mm-raio);
  overflow: hidden;
  background: var(--mm-branco);
  text-decoration: none;
  color: inherit;
}
.cartao:hover { border-color: var(--mm-tinta); }

.cartao-imagem {
  width: 100%;
  height: 168px;
  object-fit: contain;
  background: var(--mm-papel);
  display: block;
}

.cartao-corpo { padding: 11px 13px; }

.cartao-titulo {
  font-size: 14.5px;
  color: var(--mm-tinta);
  margin-bottom: 2px;
}

.cartao-artista {
  font-size: 13px;
  color: var(--mm-texto);
  margin-bottom: 6px;
}

.cartao-meta {
  font-size: 12px;
  color: var(--mm-cinza);
  letter-spacing: 0.01em;
}

.cartao-preco {
  font-size: 15px;
  color: var(--mm-tinta);
  margin-top: 7px;
}

.cartao-acoes {
  display: flex;
  gap: 8px;
  padding: 0 13px 13px;
}

.botao {
  flex: 1 1 auto;
  padding: 9px 10px;
  border-radius: var(--mm-raio);
  border: 1px solid var(--mm-tinta);
  background: var(--mm-tinta);
  color: var(--mm-branco);
  font-size: 13px;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
}
.botao.secundario {
  background: var(--mm-branco);
  color: var(--mm-tinta);
}
.botao:disabled { opacity: 0.45; cursor: not-allowed; }

/* ---------------------------------------------------------------- redacao */

.redacao {
  flex: 0 0 auto;
  border-top: 1px solid var(--mm-linha);
  padding: 10px 12px;
  background: var(--mm-branco);
}

.linha-redacao {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.campo {
  flex: 1 1 auto;
  min-height: 40px;
  max-height: 110px;
  padding: 10px 12px;
  background: var(--mm-papel);
  border: 1px solid var(--mm-linha);
  border-radius: var(--mm-raio);
  font-size: 14.5px;
  resize: none;
  overflow-y: auto;
}
.campo::placeholder { color: var(--mm-cinza); }

.enviar {
  flex: 0 0 auto;
  width: 40px; height: 40px;
  border: 0;
  border-radius: var(--mm-raio);
  background: var(--mm-tinta);
  color: var(--mm-branco);
  cursor: pointer;
  font-size: 15px;
}
.enviar:disabled { opacity: 0.4; cursor: not-allowed; }

.aviso-rodape {
  margin-top: 7px;
  font-size: 11px;
  color: var(--mm-cinza);
  text-align: center;
}

/* ---------------------------------------------------------------- ambientacao */

.ambientacao {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--mm-branco);
}

.amb-topo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--mm-linha);
  background: var(--mm-papel);
  flex: 0 0 auto;
}

.amb-titulo {
  flex: 1 1 auto;
  font-size: 14.5px;
  color: var(--mm-tinta);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amb-corpo {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px;
}

.amb-passo {
  font-size: 12px;
  color: var(--mm-cinza);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.amb-instrucao {
  font-size: 14px;
  color: var(--mm-texto);
  margin-bottom: 12px;
}

.palco {
  position: relative;
  width: 100%;
  background: var(--mm-papel);
  border: 1px solid var(--mm-linha);
  border-radius: var(--mm-raio);
  overflow: hidden;
  margin-bottom: 12px;
}

.palco canvas {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
  cursor: crosshair;
}
.palco canvas.arrastavel { cursor: grab; }
.palco canvas.arrastando { cursor: grabbing; }

.rotulo {
  display: block;
  font-size: 12.5px;
  color: var(--mm-cinza);
  margin-bottom: 5px;
}

.entrada-numero {
  width: 110px;
  padding: 9px 11px;
  background: var(--mm-papel);
  border: 1px solid var(--mm-linha);
  border-radius: var(--mm-raio);
  font-size: 14.5px;
}

.arquivo {
  display: block;
  width: 100%;
  padding: 22px 14px;
  text-align: center;
  background: var(--mm-papel);
  border: 1px dashed var(--mm-linha);
  border-radius: var(--mm-raio);
  color: var(--mm-texto);
  font-size: 14px;
  cursor: pointer;
}
.arquivo:hover { border-color: var(--mm-tinta); color: var(--mm-tinta); }
.arquivo input { position: absolute; width: 1px; height: 1px; opacity: 0; }

.molduras {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 7px;
  margin: 10px 0 14px;
}

.moldura-opcao {
  padding: 8px 6px;
  border: 1px solid var(--mm-linha);
  border-radius: var(--mm-raio);
  background: var(--mm-branco);
  cursor: pointer;
  text-align: center;
  font-size: 12px;
  color: var(--mm-texto);
}
.moldura-opcao[aria-pressed="true"] {
  border-color: var(--mm-tinta);
  background: var(--mm-tinta);
  color: var(--mm-branco);
}

.amostra {
  display: block;
  width: 100%;
  height: 22px;
  border-radius: 2px;
  margin-bottom: 5px;
  background: var(--mm-papel);
}

.medida-viva {
  font-size: 12.5px;
  color: var(--mm-cinza);
  margin-bottom: 12px;
}

.amb-rodape {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
  padding: 11px 14px;
  border-top: 1px solid var(--mm-linha);
  background: var(--mm-branco);
}

.privacidade {
  font-size: 11.5px;
  color: var(--mm-cinza);
  padding: 0 14px 10px;
  text-align: center;
}

.erro-inline {
  font-size: 13px;
  color: var(--mm-erro);
  margin-bottom: 10px;
}
`;
