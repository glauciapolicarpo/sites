/** Ajudantes minimos de DOM. Sem framework, por requisito do briefing. */

export function h(tag, props = {}, filhos = []) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (chave === 'class') el.className = valor;
    else if (chave === 'texto') el.textContent = valor;
    else if (chave === 'html') el.innerHTML = valor;
    else if (chave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else if (chave === 'estilo') Object.assign(el.style, valor);
    else el.setAttribute(chave, String(valor));
  }
  for (const filho of [].concat(filhos)) {
    if (filho === null || filho === undefined || filho === false) continue;
    el.appendChild(typeof filho === 'string' ? document.createTextNode(filho) : filho);
  }
  return el;
}

export function limpar(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

const FORMATO_REAL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export function emReais(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return 'Sob consulta';
  return FORMATO_REAL.format(valor);
}

export function medidaEmCm(largura, altura) {
  if (!largura || !altura) return null;
  const n = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  return `${n(largura)} x ${n(altura)} cm`;
}

/** Mantem o foco preso no painel enquanto ele esta aberto. */
export function prenderFoco(raiz, container) {
  return (evento) => {
    if (evento.key !== 'Tab') return;
    const focaveis = container.querySelectorAll(
      'button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = raiz.activeElement;
    if (evento.shiftKey && ativo === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && ativo === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };
}
