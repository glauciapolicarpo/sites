// A TRILHA — renderiza cada som a partir do score em out/music.wav.
//   node song.js   (STEMS=1 grava out/stem-*.wav; LUFS=-14 masteriza para essa loudness)
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock } = sc;
const { mtof } = require('./engine/music');

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), brass = bus(), fx = bus();
const verb = bus(), dly = bus();

// ---------- bateria: do método (compasso 3) até o "você" (compasso 10) ----------
const K = I.kick({ punch: 1 }), SN = I.snare(), CL = I.clap(), HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14), CR = I.crash(18);
const kicks = [];
clock.eachStep(3, 10, 16, (t, b, s) => {
  if (s % 8 === 0 || (s === 10 && b % 2 === 1)) { drums.addMono(K, t, 0.9); kicks.push(t); }
  if (s % 8 === 4) { drums.addMono(CL, t, 0.5); drums.addMono(SN, t, 0.2); verb.addMono(CL, t, 0.25); }
  if (s % 2 === 0) drums.addMono(HC[(s / 2) % 2], t, s % 4 === 0 ? 0.1 : 0.2, -0.25);
  if (s === 14) drums.addMono(HO, t, 0.1, 0.3);
});
// cada corte marcado ganha um crash + bumbo: o "hit" sonoro
for (const k of ['revelacao', 'etapa1', 'etapa2', 'etapa3', 'decide', 'final']) {
  drums.addMono(CR, ev[k], k === 'revelacao' || k === 'final' ? 0.4 : 0.25, 0.15);
  if (k === 'decide' || k === 'final') { drums.addMono(K, ev[k], 0.9); kicks.push(ev[k]); }
}
// virada de caixa no fim do compasso 9, entrando no "você"
for (let i = 0; i < 4; i++) drums.addMono(SN, T(9, 2) + i * BEAT / 2, 0.15 + i * 0.04, 0.05);

// ---------- baixo ----------
clock.eachStep(3, 10, 8, (t, b, s) => {
  const c = sc.chordAt(t); if (!c) return;
  const R = c.bass + 12;
  if (s === 0 || s === 3 || s === 4 || s === 6) bass.addMono(I.bass(s === 6 ? R + 7 : R, BEAT / 2 * (s === 0 ? 1.6 : 0.8)), t, 0.55);
});
bass.addMono(I.bass(m('F2'), clock.BAR * 0.9, { sub: 1 }), ev.decide, 0.45);
bass.addMono(I.bass(m('C2'), 3.5, { bright: 0.3, sub: 1 }), ev.final, 0.5);

// ---------- pads (o acorde E do caos para um oitavo antes do método: respiro) ----------
for (const c of sc.chords) {
  const dark = c.t0 < ev.revelacao;
  const opts = dark ? { cutoff: 700, attack: 0.6, release: 0.6 } : c.t0 >= ev.final ? { cutoff: 1800, attack: 0.3, release: 1.6 } : { cutoff: 1500, attack: 0.08, release: 0.6 };
  for (const n of c.notes) { const { L, R } = I.padNote(n, c.t1 - c.t0, opts); pad.addStereo(L, R, c.t0, dark ? 0.07 : 0.06); }
}

// ---------- teclas: a caixinha do caos (cada nota = um laço do rabisco) ----------
for (const n of sc.caosNotes) {
  const mb = I.musicBox(n.midi);
  keys.addMono(mb, n.t, 0.2, (n.midi % 5 - 2) * 0.15); verb.addMono(mb, n.t, 0.2); dly.addMono(mb, n.t, 0.08);
  fx.addMono(I.scribble(0.18, Math.round(n.t * 31)), n.t, 0.08);
}
// itens das etapas: cartões = marimba, chat = pluck (você) vs sino (IA), checklist = sino subindo
for (const e of sc.etapas) for (const it of e.itens) {
  if (e.tipo === 'cartoes') { const x = I.marimba(it.midi); keys.addMono(x, it.t, 0.5, 0.2); verb.addMono(x, it.t, 0.15); fx.addMono(I.paperFwip(1, Math.round(it.t * 10)), it.t - 0.05, 0.18, 0.3); }
  else if (e.tipo === 'chat') {
    if (it.quem === 'voce') { const x = I.pluck(it.midi, { decay: 0.35 }); keys.addMono(x, it.t, 0.45, 0.3); dly.addMono(x, it.t, 0.1); }
    else { const x = I.ting(it.midi); keys.addMono(x, it.t, 0.4, -0.3); verb.addMono(x, it.t, 0.2); }
    fx.addMono(I.pop(1.2), it.t, 0.25);
  } else { const x = I.bell(mtof(it.midi), 0.9); keys.addMono(x, it.t, 0.35, -0.1); verb.addMono(x, it.t, 0.25); fx.addMono(I.woodTick(1.4), it.t, 0.3); }
}
// sinos do final
for (const n of sc.finalBells) { const mb = I.musicBox(n.midi); keys.addMono(mb, n.t, 0.22); verb.addMono(mb, n.t, 0.25); dly.addMono(mb, n.t, 0.1); }

// ---------- metais: acorde na revelação e no "você" ----------
const stab = (notes, t, dur, g) => { for (const n of notes) { const a = I.brassNote(m(n), dur, { stab: 1 }); brass.addStereo(a.L, a.R, t, g); verb.addStereo(a.L, a.R, t, g * 0.4); } };
stab(['C4', 'E4', 'G4', 'C5'], ev.revelacao, 0.9, 0.18);
stab(['A3', 'C4', 'F4', 'A4'], sc.decide.voce.t, 0.7, 0.2);

// ---------- efeitos ligados a eventos do score ----------
for (const p of sc.palavras) fx.addMono(I.paperFwip(0.9, Math.round(p.t * 10)), p.t - 0.03, 0.2, p.x < sc.W / 2 ? -0.3 : 0.3);
fx.addMono(I.noiseSweep(T(3) - T(2) - BEAT / 2, 300, 7000, { q: 0.9, shape: (x) => x * x, pink: true }), T(2), 0.35); // riser da virada
fx.addMono(I.subBoom(1.8), ev.revelacao, 0.6);
fx.addMono(I.noiseSweep(0.3, 4000, 600, { pink: true }), ev.final - 0.3, 0.25);
for (const e of sc.etapas) fx.addMono(I.noiseSweep(0.25, 5000, 900, { pink: true }), e.t - 0.2, 0.2);

// ---------- mix ----------
MIX.sidechain([pad, bass], kicks.filter((t) => t >= ev.revelacao && t < ev.final), { depth: 0.5 });
const stems = {
  drums, bass, pad, keys, brass, fx,
  verb: reverb(verb, { room: 0.8, damp: 0.35 }),
  dly: pingpong(dly, BEAT * 0.75, 0.35, 3500),
};
const GAIN = { drums: 0.45, bass: 0.7, pad: 2.4, keys: 1.0, brass: 1.6, fx: 0.8, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 22);
MIX.gate(mix, T(2, 3.5), ev.revelacao); // um oitavo de silêncio antes do método
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : null });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS at drive ${M.drive.toFixed(2)}` : ''})`);
