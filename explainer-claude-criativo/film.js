// O FILME — desenha o quadro t. Tudo é função pura de t, sincronizado com song.js pelo score.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { ev, C, FONT, SAFE, clock, BEAT } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H;
  const CX = SAFE.x + SAFE.w / 2; // centro da área segura (a direita fica livre para os botões da rede)
  const IMG = {};

  // ---------- utilidades ----------
  const appear = (t, t0, d = 0.35) => clamp((t - t0) / d);
  const txt = (ctx, s, x, y, o) => G.text(ctx, s, x, y, Object.assign({ boil: 0 }, o));
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const sceneOf = (t) => (t < ev.virada ? 'caos' : t < ev.revelacao ? 'virada' : t < ev.etapa1 ? 'revelacao' : t < ev.decide ? 'etapas' : t < ev.final ? 'decide' : 'final');

  // imagem com bordas esfumadas, para fundir o fundo da arte com o fundo noite
  // crop = [sx, sy, sw, sh] recorta a área útil; o esfumado é elíptico
  function feather(img, inner = 0.62, crop) {
    const [sx, sy, sw, sh] = crop || [0, 0, img.width, img.height];
    const c = G.makeCanvas(sw, sh), x = c.getContext('2d');
    x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    x.globalCompositeOperation = 'destination-in';
    x.save(); x.translate(sw / 2, sh / 2); x.scale(sw / 2, sh / 2);
    const g = x.createRadialGradient(0, 0, inner, 0, 0, 1);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(-1, -1, 2, 2); x.restore();
    return c;
  }

  // ---------- fundo: noite + grade do método que se desenha na revelação ----------
  function fundo(ctx, t) {
    ctx.fillStyle = C.noite; ctx.fillRect(0, 0, W, H);
    if (t < ev.revelacao) return;
    const k = ease.outCubic(clamp((t - ev.revelacao) / 1.2));
    ctx.save();
    ctx.strokeStyle = C.azulClaro; ctx.globalAlpha = 0.07; ctx.lineWidth = 2;
    const step = 96;
    for (let x = step / 2; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * k); ctx.stroke(); }
    for (let y = step / 2; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * k, y); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- o caos: rabisco que cresce nota a nota e se desembaraça na virada ----------
  function rabisco(ctx, t) {
    if (t >= ev.revelacao + 0.05) return;
    const notes = S.caosNotes;
    let n = 0;
    for (const nt of notes) if (t >= nt.t) n++;
    const last = notes[n - 1];
    const grow = last ? ease.outCubic(clamp((t - last.t) / 0.25)) : 0;
    const count = Math.max(0, Math.floor(((n - 1) + grow) * S.SCRIB_PER_NOTE)) + 1;
    const pts = S.scribble.slice(0, Math.min(count, S.scribble.length));
    if (pts.length < 2) return;
    // virada: cada ponto é puxado para uma linha reta (o fio do método)
    const u = ease.inOutCubic(clamp((t - ev.virada) / (clock.BAR * 0.85)));
    const y0 = H * 0.52, x0 = SAFE.x + 40, x1 = SAFE.x + SAFE.w - 40;
    const P = pts.map(([x, y], i) => {
      const lx = lerp(x0, x1, i / (pts.length - 1));
      return [lerp(x, lx, u), lerp(y, y0, u)];
    });
    ctx.save();
    ctx.strokeStyle = u > 0.98 ? C.azulClaro : C.laranjaCaos;
    ctx.lineWidth = 5 + 2 * u; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2;
      ctx.quadraticCurveTo(P[i][0], P[i][1], mx, my);
    }
    ctx.stroke();
    // faíscas do emaranhado em cada nota
    if (u < 0.2) for (const nt of notes) {
      const a = t - nt.t; if (a < 0 || a > 0.4) continue;
      const k = a / 0.4;
      for (let j = 0; j < 6; j++) {
        const ang = G.rnd(nt.t, j) * Math.PI * 2, d = 40 + 120 * k + G.rnd(j, nt.t) * 60;
        ctx.globalAlpha = 1 - k; ctx.lineWidth = 4;
        const cx = W / 2, cy = H * 0.52;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * (d + 140), cy + Math.sin(ang) * (d + 140));
        ctx.lineTo(cx + Math.cos(ang) * (d + 170), cy + Math.sin(ang) * (d + 170)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function cenaCaos(ctx, t) {
    // título de impacto, uma linha por compasso
    const y = SAFE.y + 120;
    const a1 = appear(t, 0.4, 0.25), a2 = appear(t, S.T(1), 0.25);
    const fade = 1 - clamp((t - ev.virada) / 0.4);
    if (a1 > 0) txt(ctx, 'MUITA IDEIA,', CX, y - 30 * (1 - ease.outBack(a1)), { size: 112, fam: FONT.metodo, weight: 700, color: C.areia, align: 'center', alpha: a1 * fade });
    if (a2 > 0) txt(ctx, 'POUCO MÉTODO.', CX, y + 120 - 30 * (1 - ease.outBack(a2)), { size: 112, fam: FONT.metodo, weight: 700, color: C.areia, align: 'center', alpha: a2 * fade });
    rabisco(ctx, t);
    for (const p of S.palavras) {
      const a = appear(t, p.t, 0.3); if (a <= 0) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(0.7 + 0.3 * ease.outBack(a, 2.5), 0.7 + 0.3 * ease.outBack(a, 2.5));
      txt(ctx, p.text, 0, 0, { size: 64, fam: FONT.mao, weight: 700, color: C.destaque, alpha: a * fade });
      ctx.restore();
    }
  }

  function cenaVirada(ctx, t) {
    rabisco(ctx, t);
    const a = appear(t, ev.virada + BEAT, 0.4);
    if (a > 0) {
      ctx.save(); ctx.translate(CX, H * 0.38); ctx.rotate(-0.05);
      txt(ctx, 'e se tivesse um método?', 0, 0, { size: 84, fam: FONT.mao, weight: 700, color: C.destaque, align: 'center', alpha: a });
      ctx.restore();
    }
  }

  // ---------- revelação: cérebro dividido + título do projeto ----------
  function cenaRevelacao(ctx, t) {
    const a = ease.outBack(clamp((t - ev.revelacao) / 0.45), 1.6);
    const img = IMG.cerebro;
    if (img) {
      const w = 640 * (0.6 + 0.4 * a), h = w * (img.height / img.width);
      ctx.save(); ctx.globalAlpha = clamp(a * 2);
      ctx.drawImage(img, CX - w / 2, H * 0.40 - h / 2, w, h);
      ctx.restore();
    }
    const y = H * 0.40 + 380;
    const k = clamp((t - ev.revelacao) / 0.2);
    txt(ctx, 'DO CAOS', CX, y, { size: 128, fam: FONT.metodo, weight: 700, color: C.areia, align: 'center', alpha: k });
    txt(ctx, 'AO MÉTODO', CX, y + 124, { size: 128, fam: FONT.metodo, weight: 700, color: C.areia, align: 'center', alpha: k });
    const m = appear(t, S.T(3, 2), 0.3);
    if (m > 0) {
      ctx.save(); ctx.translate(CX + 190, y + 210); ctx.rotate(-0.06);
      txt(ctx, 'com IA', 0, 0, { size: 88, fam: FONT.mao, weight: 700, color: C.laranjaVivo, align: 'center', alpha: m });
      ctx.strokeStyle = C.azulClaro; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-120, 26); ctx.lineTo(-120 + 240 * ease.outCubic(m), 22); ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- trilha de etapas (circuito com 3 nós) ----------
  function trilha(ctx, t, atual) {
    const y = SAFE.y + 70, xs = [CX - 300, CX, CX + 300];
    ctx.save();
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const feito = atual > i + 1 ? 1 : atual === i + 1 ? 0 : 0;
      ctx.strokeStyle = C.azulCircuito; ctx.beginPath(); ctx.moveTo(xs[i] + 44, y); ctx.lineTo(xs[i + 1] - 44, y); ctx.stroke();
      // a linha acende quando a etapa seguinte começa
      const e = S.etapas[i + 1];
      const p = feito || ease.outCubic(clamp((t - e.t) / 0.4));
      if (p > 0) { ctx.strokeStyle = C.azulClaro; ctx.beginPath(); ctx.moveTo(xs[i] + 44, y); ctx.lineTo(lerp(xs[i] + 44, xs[i + 1] - 44, p), y); ctx.stroke(); }
    }
    xs.forEach((x, i) => {
      const n = i + 1, e = S.etapas[i];
      const ativo = n === atual, feito = n < atual;
      const pop = ativo ? 1 + 0.25 * U.pulse(t, e.t, 7) : 1;
      ctx.beginPath(); ctx.arc(x, y, 40 * pop, 0, Math.PI * 2);
      ctx.fillStyle = ativo ? C.laranjaVivo : feito ? C.azulClaro : C.noite; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = ativo ? C.laranjaVivo : C.azulClaro; ctx.stroke();
      txt(ctx, String(n), x, y + 2, { size: 40, fam: FONT.metodo, weight: 700, color: ativo || feito ? C.sobreVivo : C.azulClaro, align: 'center', baseline: 'middle' });
    });
    ctx.restore();
  }

  function cabecalhoEtapa(ctx, t, e) {
    const a = ease.outCubic(clamp((t - e.t) / 0.3));
    const dx = (1 - a) * 80;
    txt(ctx, `ETAPA ${e.n}`, SAFE.x + 20 + dx, SAFE.y + 200, { size: 36, fam: FONT.corpo, weight: 800, color: C.azulClaro, alpha: a });
    txt(ctx, e.titulo, SAFE.x + 16 + dx, SAFE.y + 360, { size: 120, fam: FONT.metodo, weight: 700, color: C.areia, alpha: a });
    const b = appear(t, e.t + BEAT, 0.3);
    txt(ctx, e.sub, SAFE.x + 20, SAFE.y + 440, { size: 46, fam: FONT.corpo, weight: 500, color: C.areia, alpha: b * 0.9 });
  }

  const ITEM_Y0 = SAFE.y + 560, ITEM_GAP = 200;

  function cartoes(ctx, t, e) {
    e.itens.forEach((it, i) => {
      const a = clamp((t - it.t) / 0.35); if (a <= 0) return;
      const k = ease.outBack(a, 1.8);
      const x = SAFE.x + 20 + (1 - k) * 500, y = ITEM_Y0 + i * ITEM_GAP, w = SAFE.w - 60, h = 150;
      ctx.save(); ctx.globalAlpha = clamp(a * 3);
      ctx.translate(x + w / 2, y + h / 2); ctx.rotate((i - 1) * 0.025 * k); ctx.translate(-(x + w / 2), -(y + h / 2));
      rr(ctx, x, y, w, h, 24); ctx.fillStyle = C.noiteElevada; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = C.azulCircuito; ctx.stroke();
      // ícone: documento
      ctx.strokeStyle = C.azulClaro; ctx.lineWidth = 5; ctx.lineJoin = 'round';
      rr(ctx, x + 40, y + 36, 60, 78, 8); ctx.stroke();
      for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(x + 54, y + 58 + l * 18); ctx.lineTo(x + 86, y + 58 + l * 18); ctx.stroke(); }
      txt(ctx, it.text, x + 136, y + h / 2 + 2, { size: 52, fam: FONT.corpo, weight: 700, color: C.areia, baseline: 'middle' });
      ctx.restore();
    });
  }

  function chat(ctx, t, e) {
    e.itens.forEach((it, i) => {
      const a = clamp((t - it.t) / 0.3); if (a <= 0) return;
      const k = ease.outBack(a, 2);
      const voce = it.quem === 'voce';
      const size = 44;
      const tw = G.measure(ctx, it.text, size, FONT.corpo, 600);
      const w = Math.min(SAFE.w - 80, tw + 80), h = 120;
      const y = ITEM_Y0 + i * ITEM_GAP;
      const x = voce ? SAFE.x + SAFE.w - 20 - w : SAFE.x + 20;
      ctx.save(); ctx.globalAlpha = clamp(a * 3);
      const ox = voce ? x + w : x, oy = y + h;
      ctx.translate(ox, oy); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.translate(-ox, -oy);
      rr(ctx, x, y, w, h, 36); ctx.fillStyle = voce ? C.petroleo : C.noiteElevada; ctx.fill();
      if (!voce) { ctx.lineWidth = 3; ctx.strokeStyle = C.azulClaro; ctx.stroke(); }
      txt(ctx, it.text, x + 40, y + h / 2 + 2, { size, fam: FONT.corpo, weight: 600, color: voce ? C.branco : C.areia, baseline: 'middle' });
      txt(ctx, voce ? 'você' : 'IA', voce ? x + w - 10 : x + 10, y - 18, { size: 34, fam: FONT.corpo, weight: 700, color: C.azulClaro, align: voce ? 'right' : 'left' });
      ctx.restore();
    });
  }

  function checklist(ctx, t, e) {
    e.itens.forEach((it, i) => {
      const a = clamp((t - (it.t - BEAT)) / 0.3); if (a <= 0) return; // a linha aparece um tempo antes
      const y = ITEM_Y0 + i * ITEM_GAP, x = SAFE.x + 20, w = SAFE.w - 60, h = 150;
      ctx.save(); ctx.globalAlpha = a;
      rr(ctx, x, y, w, h, 24); ctx.fillStyle = C.noiteElevada; ctx.fill();
      const cx = x + 80, cy = y + h / 2;
      const ok = clamp((t - it.t) / 0.22);
      ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fillStyle = ok > 0 ? C.sucesso : C.noite; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.sucesso; ctx.stroke();
      if (ok > 0) { // o visto se desenha no tempo
        const p = [[cx - 18, cy + 2], [cx - 5, cy + 16], [cx + 20, cy - 14]];
        ctx.strokeStyle = C.noite; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
        const s = ok * 2;
        if (s < 1) ctx.lineTo(lerp(p[0][0], p[1][0], s), lerp(p[0][1], p[1][1], s));
        else { ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(lerp(p[1][0], p[2][0], s - 1), lerp(p[1][1], p[2][1], s - 1)); }
        ctx.stroke();
      }
      txt(ctx, it.text, x + 156, cy + 2, { size: 52, fam: FONT.corpo, weight: 700, color: C.areia, baseline: 'middle' });
      ctx.restore();
    });
  }

  function cenaEtapas(ctx, t) {
    const e = [...S.etapas].reverse().find((x) => t >= x.t);
    trilha(ctx, t, e.n);
    cabecalhoEtapa(ctx, t, e);
    if (e.tipo === 'cartoes') cartoes(ctx, t, e);
    else if (e.tipo === 'chat') chat(ctx, t, e);
    else checklist(ctx, t, e);
  }

  // ---------- "quem decide é você" ----------
  function cenaDecide(ctx, t) {
    const d = S.decide;
    const y = H * 0.40;
    const a1 = appear(t, d.linha1.t, 0.25), a2 = appear(t, d.linha2.t, 0.25), a3 = appear(t, d.voce.t, 0.25);
    txt(ctx, d.linha1.text, CX, y - 160, { size: 120, fam: FONT.metodo, weight: 700, color: C.areia, align: 'center', alpha: a1 });
    txt(ctx, d.linha2.text, CX, y + 20, { size: 120, fam: FONT.metodo, weight: 700, color: C.areia, align: 'center', alpha: a2 });
    if (a3 > 0) {
      const k = ease.outBack(a3, 2.2), size = 140;
      const tw = G.measure(ctx, d.voce.text, size, FONT.metodo, 700);
      ctx.save(); ctx.translate(CX, y + 190); ctx.scale(k, k); ctx.rotate(-0.03);
      rr(ctx, -tw / 2 - 30, -size * 0.62, tw + 60, size * 1.2, 8); ctx.fillStyle = C.laranjaVivo; ctx.fill();
      txt(ctx, d.voce.text, 0, -size * 0.02, { size, fam: FONT.metodo, weight: 700, color: C.sobreVivo, align: 'center', baseline: 'middle' });
      ctx.restore();
    }
  }

  // ---------- encerramento com o logo do projeto ----------
  function cenaFinal(ctx, t) {
    const f = S.final;
    const a = ease.outCubic(clamp((t - f.logo) / 0.5));
    const img = IMG.logo;
    if (img) {
      const w = SAFE.w + 40, h = w * (img.height / img.width);
      ctx.save(); ctx.globalAlpha = a;
      ctx.drawImage(img, CX - w / 2, H * 0.40 - h / 2 + 30 * (1 - a), w, h);
      ctx.restore();
    }
    const b = appear(t, f.handle.t, 0.35);
    txt(ctx, f.handle.text, CX, H * 0.40 + 360, { size: 64, fam: FONT.corpo, weight: 700, color: C.areia, align: 'center', alpha: b });
    const c = appear(t, f.nota.t, 0.4);
    if (c > 0) {
      ctx.save(); ctx.translate(CX, H * 0.40 + 460); ctx.rotate(-0.04);
      txt(ctx, f.nota.text, 0, 0, { size: 64, fam: FONT.mao, weight: 700, color: C.azulClaro, align: 'center', alpha: c });
      ctx.restore();
    }
  }

  Studio.film({
    async init() {
      await Promise.all([
        Studio.loadFont('Oswald', 'assets/Oswald-Variable.woff2', '200 700'),
        Studio.loadFont('Figtree', 'assets/Figtree-Variable.woff2', '300 900'),
        Studio.loadFont('Bricolage Grotesque', 'assets/BricolageGrotesque-Variable.woff2', '200 800'),
        Studio.loadFont('Caveat CC', 'assets/Caveat-Variable.woff2', '400 700'),
      ]);
      IMG.cerebro = feather(await Studio.loadImage('assets/cerebro-caos-metodo.png'), 0.7);
      IMG.logo = feather(await Studio.loadImage('assets/logo-do-caos-ao-metodo.png'), 0.8, [150, 110, 780, 340]);
    },
    draw(ctx, t) {
      fundo(ctx, t);
      const sc = sceneOf(t);
      if (sc === 'caos') cenaCaos(ctx, t);
      else if (sc === 'virada') cenaVirada(ctx, t);
      else if (sc === 'revelacao') cenaRevelacao(ctx, t);
      else if (sc === 'etapas') cenaEtapas(ctx, t);
      else if (sc === 'decide') cenaDecide(ctx, t);
      else cenaFinal(ctx, t);
      // flash curto em cada corte marcado (o "hit" visual)
      for (const k of ['revelacao', 'etapa1', 'etapa2', 'etapa3', 'decide', 'final']) {
        const f = 0.35 * Math.exp(-(t - ev[k]) * 14);
        if (t >= ev[k] && f > 0.01) { ctx.fillStyle = `rgba(240,221,184,${f})`; ctx.fillRect(0, 0, W, H); }
      }
    },
    post: { paper: 0, vignette: 0.25, grain: 0.02 },
    fadeOut: 1.2,
  });
})();
