---
name: motion-do-caos-ao-metodo
description: Use quando a pessoa pedir um vídeo animado, motion graphic, explainer, Reels/TikTok/Shorts animado ou "um vídeo com a minha marca" feito com código. Conduz o método Do Caos ao Método em 8 etapas: inventário de recursos, briefing curto, repertório (design system), roteiro em compassos, trilha sincronizada, cenas, revisão de diretor e entrega com versão no Git. Gera um MP4 1080p em 9:16, 16:9, 1:1 ou 4:5 com música sintetizada em código e sincronia medida.
version: 1.0.0
---

# Motion: do caos ao método

Você vai produzir um vídeo animado curto (15 a 45 s) em que cada quadro é desenhado em código e a trilha também é gerada em código. O resultado é um MP4 pronto para publicar, com a identidade visual da pessoa e com som e imagem sincronizados por medição.

A regra que sustenta tudo: **um único arquivo de roteiro (`score.js`) define cada evento no tempo**. A música e a animação leem esse mesmo arquivo, então nunca saem de sincronia.

## Antes de começar: o motor

1. Se a skill `animation-studio` estiver disponível nesta sessão, use-a como motor: carregue-a e siga as etapas abaixo usando os comandos dela (`new-project.js`, `render.js`, `song.js`).
2. Se não estiver, monte um motor mínimo, sem dependências de npm:
   - `index.html` com um `<canvas>` no tamanho do formato e uma função global `renderAt(t)` que desenha o quadro do tempo `t`;
   - um script Node que abre o Chromium headless com Playwright, chama `renderAt(i / FPS)` para cada quadro e envia os PNGs ao `ffmpeg` (`-f image2pipe -r 30 -i - -c:v libx264 -pix_fmt yuv420p`);
   - a trilha gerada em Node como WAV 48 kHz (osciladores, envelopes, ruído filtrado) a partir das mesmas listas de eventos do `score.js`;
   - o `ffmpeg` juntando vídeo e áudio em H.264 + AAC.
3. Confira os requisitos com um comando só: `node -v` (22+), `ffmpeg -version`, Chromium/Chrome. Se faltar algo, diga o que falta e pergunte antes de instalar.

## Etapa 1. Inventário: o que temos

Liste para a pessoa, em uma lista curta, os recursos de vídeo e motion disponíveis na sessão (skills, conectores, ferramentas instaladas). Uma linha por item, com a função. Sem longas explicações.

## Etapa 2. Briefing: no máximo uma rodada de perguntas

Pergunte só o que muda o resultado, de uma vez, com opções:
- **Tipo:** promo de marca, explainer, infográfico animado ou vídeo de texto/letra.
- **Formato:** 9:16 (Reels, TikTok, Shorts), 16:9 (YouTube), 1:1 ou 4:5 (feed).
- **Marca e conteúdo:** genérico com textos de exemplo, ou a marca/design system da pessoa.

Não pergunte duração, música ou cores: decida com bom senso (25 a 35 s, trilha instrumental, cores da marca) e diga o que decidiu.

## Etapa 3. Repertório: leia o design system antes de desenhar

Procure a identidade da pessoa nesta ordem: o que ela disse, um design system publicado (artifact, Figma, site), arquivos do projeto. Extraia:
- **Cores** como tokens com papel: fundo, texto, destaque de ação, cores de ilustração, cor de sucesso.
- **Fontes** (arquivos reais, `.woff2` ou `.ttf`): títulos, texto, anotação.
- **Regras de uso**: quantos destaques por tela, contraste mínimo, o que nunca fazer.
- **Ativos**: logo, ícones e imagens, copiados como arquivo. Nunca redesenhe um logo.
- **Tom de voz**: como a marca fala, frases prontas, palavras proibidas.

Copie fontes e imagens para `assets/` do projeto. Se a arte do logo tiver fundo próprio, recorte a área útil e esfumace as bordas para fundir com o fundo do vídeo.

## Etapa 4. Roteiro em compassos

Escolha o formato de história. Para explainer: **problema (caos, tom menor, esparso) → virada (riser) → revelação (corte com impacto) → 3 etapas, uma ideia por compasso → mensagem-chave → encerramento com logo e assinatura (2 s ou mais em tela cheia)**.

Pense em compassos, não em segundos. A 100 BPM, 1 tempo = 0,6 s e 1 compasso = 2,4 s. Todo corte cai no início de um compasso.

Monte a tabela antes de escrever código e mostre-a à pessoa:

| compassos | imagem | som que a imagem "toca" |
|---|---|---|
| 0–1 | problema: título de impacto + um elemento que cresce | uma nota por crescimento |
| 2 | virada: o elemento se organiza | riser e um oitavo de silêncio |
| 3 | revelação: marca/ícone + título | crash, bumbo e acorde |
| 4–9 | 3 etapas, 2 compassos cada, 3 itens por etapa | um som próprio por tipo de item |
| 10 | mensagem-chave, uma palavra destacada | acorde no destaque |
| 11–12 | logo, @perfil, frase final | sinos e acorde longo |

Escolha de 3 a 5 **gatilhos de sincronia**: momentos em que a imagem visivelmente faz a música (cada nota desenha um traço, cada cartão toca uma marimba, cada visto toca um sino).

## Etapa 5. `score.js`: a fonte única de verdade

Exporte: `FPS`, `FORMAT`, `DURATION`, o relógio (`T(compasso, tempo)`), as seções, a harmonia (um acorde por compasso), a paleta e as fontes da marca, **todas as listas de eventos com seus tempos** (notas, palavras, itens de cada etapa), os `markers` dos cortes com `sync: 'av'` e as legendas.

Regras:
- Nenhum tempo é escrito à mão em outro arquivo. Imagem e som leem o score.
- Aleatoriedade só com gerador com semente (`mulberry32(42)`), nunca `Math.random()`.
- Textos curtos: títulos com até 14 caracteres por linha no 9:16 a 120 px.

## Etapa 6. A trilha (`song.js`)

- Caos: caixinha de música em tom menor, sem bateria; um efeito leve por nota.
- Virada: riser de ruído filtrado e um oitavo de silêncio de verdade antes da revelação.
- Revelação em diante: tom maior, bumbo, palmas, chimbal, baixo e pads; crash em cada corte marcado.
- Itens: uma "voz" por tipo (cartão = marimba, chat = pluck × sino, checklist = sino subindo).
- Final: sinos e um acorde maj9 longo; fade de 1,2 s.

Meça, porque você não pode ouvir: níveis por seção e por stem; corrija o equilíbrio na tabela de ganhos; masterize em **-14 LUFS** (YouTube, Instagram) com pico verdadeiro de -1,5 dBTP.

## Etapa 7. As cenas (`film.js`)

- Cada cena é uma função pura de `t`. Nada de estado entre quadros.
- Layout pela área segura do formato. No 9:16, os apps cobrem ~11% em cima, ~22% embaixo e ~140 px à direita: centralize no meio da área segura, não da tela.
- Carregue as fontes da marca no `init` (`FontFace`) e use os nomes delas em todo texto.
- Uma cor de ação (o destaque da marca) por tela. Texto sobre a cor de ação usa a cor de texto definida pela marca para ela.
- Entradas com `outBack`/`outCubic` de 0,25 a 0,35 s; um flash curto em cada corte marcado.

## Etapa 8. Revisão de diretor e entrega

1. Renderize uma folha de contato (12 quadros do filme) e quadros nos momentos-chave. Leia cada imagem e procure: texto sobreposto (acento de título tocando o rótulo acima), elementos pequenos demais, fundo de imagem destoando, mais de um destaque por tela, texto fora da área segura.
2. Corrija e renderize os mesmos tempos de novo.
3. Renderize o vídeo completo em segundo plano, junte com o áudio e **verifique a sincronia em cada marker** (som ±20 ms, imagem ±1 quadro). Um ✗ se corrige no `score.js`, nunca empurrando um lado à mão.
4. Entregue: caminho do MP4, duração, resolução, tamanho, os gatilhos de sincronia em uma frase, e o aviso de que o áudio foi conferido por medição, não por escuta.
5. Versione: `.gitignore` com `out/*` e exceção para o MP4 final; commit e push quando a pessoa pedir.

## Erros que esta skill evita

- Pedir "faz um vídeo" sem repertório e receber algo genérico: a etapa 3 vem antes de qualquer desenho.
- Som e imagem fora de sincronia: tudo sai do score.
- Fonte trocada em silêncio por uma genérica: carregue os arquivos reais e confira nos quadros.
- Logo com "caixa" de fundo aparente: recorte e esfumace.
- Texto embaixo dos botões do Reels: área segura.
- Promessa que a marca não faz: use só fatos e frases que a pessoa confirma.
