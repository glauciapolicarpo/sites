// O ROTEIRO — fonte única de verdade para a música E para a imagem.
// Explainer 9:16 "Do caos ao método com IA" no Design System Claude Criativo.
// Mude um tempo aqui e o som e a animação se movem juntos.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const STYLE = 'flat';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 100, offset: 0.4 }); // 100 BPM: 1 tempo = 0,6s, 1 compasso = 2,4s
  const { T, BEAT } = clock;
  const DURATION = T(13) + 0.4; // ~31,6s

  // ---------- paleta (tokens do Design System Claude Criativo) ----------
  const C = {
    noite: '#061D29', noiteElevada: '#0D2E3E', noiteProfunda: '#031219',
    areia: '#F0DDB8', laranjaVivo: '#FF5B1F', sobreVivo: '#14262D', laranjaCaos: '#F04828',
    azulCircuito: '#316675', azulClaro: '#5AA0B5', petroleo: '#235463', branco: '#FFFFFF',
    sucesso: '#4FC3A1', destaque: '#FF8A57',
  };
  const FONT = { metodo: 'Oswald', corpo: 'Figtree', display: 'Bricolage Grotesque', mao: 'Caveat CC' };

  // ---------- seções ----------
  const S = {
    caos: [0, T(2)],
    virada: [T(2), T(3)],
    revelacao: [T(3), T(4)],
    etapa1: [T(4), T(6)],
    etapa2: [T(6), T(8)],
    etapa3: [T(8), T(10)],
    decide: [T(10), T(11)],
    final: [T(11), DURATION],
  };

  // ---------- harmonia: lá menor no caos, dó maior no método ----------
  const { chords, chordAt } = makeChords(clock, {
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    E: { notes: ['G#3', 'B3', 'E4'], bass: 'E1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
    Cmaj9: { notes: ['E3', 'G3', 'B3', 'D4'], bass: 'C2' },
  }, [
    [0, 0, 4, 'Am'], [1, 0, 4, 'F'], [2, 0, 3.5, 'E'],
    [3, 0, 4, 'C'], [4, 0, 4, 'G'], [5, 0, 4, 'Am'], [6, 0, 4, 'F'],
    [7, 0, 4, 'C'], [8, 0, 4, 'G'], [9, 0, 4, 'Am'], [10, 0, 4, 'F'],
    [11, 0, 4, 'Cmaj9'], [12, 0, 4, 'Cmaj9'],
  ]);

  const ev = {
    virada: T(2), // o rabisco começa a se desembaraçar
    revelacao: T(3), // o método aparece: cérebro + título
    etapa1: T(4), etapa2: T(6), etapa3: T(8),
    decide: T(10),
    final: T(11),
  };

  // ---------- o caos: cada nota da caixinha de música faz o rabisco crescer ----------
  const CAOS = [
    [['E5', 0, 1], ['C5', 1, 1], ['A4', 2, 2], ['B4', 4, 1], ['C5', 5, 1], ['E5', 6, 2]],
    [['F5', 0, 1], ['E5', 1, 1], ['C5', 2, 2], ['A4', 4, 1], ['C5', 5, 1], ['D5', 6, 2]],
  ];
  const caosNotes = [...placeBar(clock, CAOS[0], 0), ...placeBar(clock, CAOS[1], 1)];
  const rng = U.mulberry32(42);
  // o emaranhado: uma curva contínua de laçadas; cada nota acrescenta um trecho
  const SCRIB_PER_NOTE = 14;
  const scribble = [];
  {
    let x = W / 2, y = H * 0.52, a = 0;
    const total = caosNotes.length * SCRIB_PER_NOTE + 1;
    for (let i = 0; i < total; i++) {
      a += (rng() - 0.5) * 1.6 + 0.55;
      const r = 40 + rng() * 50;
      x += Math.cos(a) * r; y += Math.sin(a) * r;
      // mantém o rabisco numa nuvem em volta do centro
      x += (W / 2 - x) * 0.07; y += (H * 0.52 - y) * 0.07;
      scribble.push([x, y]);
    }
  }
  const palavras = [
    { t: T(0, 1), text: 'ideia solta', x: SAFE.x + 30, y: H * 0.36, rot: -0.08 },
    { t: T(0, 3), text: 'prompt vago', x: SAFE.x + SAFE.w - 330, y: H * 0.42, rot: 0.06 },
    { t: T(1, 1), text: 'resposta genérica', x: SAFE.x + 40, y: H * 0.66, rot: 0.05 },
    { t: T(1, 3), text: 'e agora?', x: SAFE.x + SAFE.w - 260, y: H * 0.71, rot: -0.07 },
  ];

  // ---------- as três etapas ----------
  const etapas = [
    {
      n: 1, t: ev.etapa1, titulo: 'DÊ REPERTÓRIO', sub: 'Contexto antes do pedido.', tipo: 'cartoes',
      itens: [
        { t: T(4, 2), text: 'Suas referências' },
        { t: T(5, 0), text: 'Exemplos do que gosta' },
        { t: T(5, 2), text: 'Para quem é' },
      ],
    },
    {
      n: 2, t: ev.etapa2, titulo: 'PENSE JUNTO', sub: 'A IA é parceira, não oráculo.', tipo: 'chat',
      itens: [
        { t: T(6, 2), quem: 'voce', text: 'Me ajuda a planejar a aula?' },
        { t: T(7, 0), quem: 'ia', text: 'Claro. Para quem é a aula?' },
        { t: T(7, 2), quem: 'voce', text: 'Para quem está começando.' },
      ],
    },
    {
      n: 3, t: ev.etapa3, titulo: 'REVISE SEMPRE', sub: 'O olhar final é seu.', tipo: 'checklist',
      itens: [
        { t: T(8, 2), text: 'Está no seu tom?' },
        { t: T(9, 0), text: 'Os fatos conferem?' },
        { t: T(9, 2), text: 'Você assinaria?' },
      ],
    },
  ];
  // altura de cada item: nota da marimba que "toca" o item (sobe a cada um)
  const itemNotes = { 1: ['C5', 'E5', 'G5'], 2: ['E5', 'C5', 'G5'], 3: ['G5', 'B5', 'D6'] };
  etapas.forEach((e) => e.itens.forEach((it, i) => { it.midi = m(itemNotes[e.n][i]); }));

  const decide = { linha1: { t: T(10, 0), text: 'A IA ACELERA.' }, linha2: { t: T(10, 2), text: 'QUEM DECIDE' }, voce: { t: T(10, 3), text: 'É VOCÊ.' } };
  const final = { logo: T(11, 0), handle: { t: T(11, 2), text: '@claudecriativo' }, nota: { t: T(12, 0), text: 'pense junto, revise sempre' } };

  // tema que a caixinha toca no final
  const finalBells = placeBar(clock, [['G5', 0, 2], ['E5', 2, 2], ['D5', 4, 2], ['C5', 6, 2]], 11, 12).concat([{ t: T(12), dur: 2.4, midi: m('E6') }]);

  const markers = {
    revelacao: { t: ev.revelacao, sync: 'av' },
    etapa1: { t: ev.etapa1, sync: 'av' },
    etapa2: { t: ev.etapa2, sync: 'av' },
    etapa3: { t: ev.etapa3, sync: 'av' },
    decide: { t: ev.decide, sync: 'av' },
    final: { t: ev.final, sync: 'av' },
  };

  const subtitles = [
    { t: T(0, 0), end: T(2), text: 'Muita ideia, pouco método.' },
    { t: T(2), end: T(3), text: 'E se tivesse um método?' },
    { t: T(3), end: T(4), text: 'Do caos ao método com IA.' },
    ...etapas.map((e) => ({ t: e.t, end: e.t + 2 * clock.BAR, text: `Etapa ${e.n}: ${e.titulo.toLowerCase()}. ${e.sub}` })),
    { t: T(10), end: T(11), text: 'A IA acelera. Quem decide é você.' },
    { t: T(11), end: DURATION, text: '@claudecriativo' },
  ];

  const SCORE = { FPS, FORMAT, STYLE, W, H, SAFE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, C, FONT, caosNotes, scribble, SCRIB_PER_NOTE, palavras, etapas, decide, final, finalBells, markers, subtitles };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
