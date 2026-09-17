# Juliana

Consultora de arte por IA da **Multiplos Mayer Mizrahi**. Atende o visitante do
site, recomenda obras reais do catalogo e mostra a peca na parede do cliente em
escala real, a partir de uma foto enviada no proprio chat.

O gargalo do site nao e audiencia, e acompanhamento na decisao. A Juliana
existe para preencher isso.

---

## Os tres entregaveis

```
A - Servico      juliana.multiplosmm.com.br   (este repositorio, src/ + prompts/)
B - Widget       widget.js em Shadow DOM      (widget/)
C - Tag do GTM   carregador de 3 linhas       (gtm/)
```

Nada de segredo sai do servidor. A tag do GTM carrega um script que puxa o
bundle do nosso dominio: o bundle nunca e colado dentro da tag, para nao
perder versionamento, cache e controle de tamanho.

---

## Subir em dez minutos

```bash
cp .env.example .env     # preencher FEED_URL, ANTHROPIC_API_KEY, WHATSAPP_NUMERO
npm install
npm run build:widget     # gera widget/dist/widget.js
npm run ingest           # baixa e indexa o catalogo
npm run dev              # http://localhost:8787/health
```

Sem `FEED_URL`, a ingestao le `data/feed.xml`, que e o caminho para quando a
cliente entrega o arquivo exportado em vez da URL.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servico com recarga automatica |
| `npm start` | Servico em producao |
| `npm run ingest` | Baixa o feed, enriquece e regrava o catalogo |
| `npm run build:widget` | Empacota o widget e falha se passar de 100 KB comprimido |
| `npm test` | Testes de matematica, ingestao e rotas |
| `npm run typecheck` | TypeScript em modo estrito |
| `npm run limpeza` | Apaga composicoes com mais de 30 dias |

---

## Entregavel A - Servico

Node 20, TypeScript, Fastify e SQLite em arquivo. O catalogo tem 927 itens: nao
justifica banco gerenciado.

### Ingestao

`npm run ingest`, e cron diario as 4h.

**Paginacao.** Uma requisicao isolada ao feed devolve cerca de 150 itens e o
catalogo tem 927. A ingestao tenta `?page=N`, depois `?offset=N&limit=L`, e
fica com a estrategia que trouxer mais itens, parando quando a resposta repete
ou vem vazia. **Abaixo de 800 itens ela falha de forma visivel e preserva o
banco anterior**, em vez de indexar meio catalogo em silencio.

Enriquecimentos:

1. **Dimensoes** de `g:product_detail`, do titulo ou da descricao, por regex que
   cobre `50 x 70 cm`, `50x70cm`, `50 por 70`, `1,20 x 0,80 m` e `500x700mm`. O
   que nao encontrar vai para `data/sem_dimensao.csv`. Por cima disso vale
   `data/dimensoes-override.csv` (`id,largura_cm,altura_cm`), que a cliente
   preenche a mao para as obras principais.
2. **Recorte da imagem** por diferenca de cor com o fundo, gravando PNG com
   transparencia em `data/obras/`. Qualquer arquivo dessa pasta pode ser trocado
   a mao por um recorte melhor: a ingestao respeita o que estiver la e so
   regenera o que ela mesma criou.
3. **Cores dominantes**, tres por obra.
4. **Tags esteticas** por regras de palavra-chave em
   [`src/ingest/regras-tags.ts`](src/ingest/regras-tags.ts), que a cliente pode
   editar sem tocar no resto do codigo.

Ao final sai um relatorio com total de obras, quantas com dimensao e quantas
com imagem recortada com sucesso.

### Endpoints

| Rota | Para que |
|---|---|
| `POST /search` | Filtro em SQL mais ranqueamento FTS5. Regra dura: so devolve `disponivel = 1` |
| `POST /chat` | Proxy da API do modelo, com tool use. A chave fica no servidor |
| `POST /compose` | Gera o PNG ambientado, lado maior em 2000 px, com marca d'agua |
| `GET /health` | Versao, ultima ingestao e total indexado. Responde **503** abaixo do minimo |

**Sem pipeline de embeddings no MVP.** Com menos de mil itens, FTS5 mais tags
entrega qualidade suficiente. O ranqueamento fica atras da interface
`Ranqueador` ([`src/busca/ranqueador.ts`](src/busca/ranqueador.ts)), entao a
troca futura nao encosta em `/search` nem no `/chat`.

O texto de voz da Juliana e da cliente e vive em
[`prompts/juliana.md`](prompts/juliana.md), lido do disco a cada mensagem: ela
ajusta e salva, sem deploy. As regras duras (nunca inventar obra, nunca
negociar preco, sempre buscar antes de recomendar) ficam no codigo e valem por
cima do arquivo.

### Seguranca

- CORS restrito a `multiplosmm.com.br` e `www.multiplosmm.com.br`.
- Rate limit de 30 mensagens por sessao e 60 requisicoes por IP por hora.
- Teto de 8 MB na foto, com **validacao do tipo real do arquivo pelo conteudo**,
  nao pela extensao nem pelo rotulo do `data:` URL.
- Nenhuma chave, token ou credencial no bundle do widget.
- A foto do cliente so chega ao servidor no `/compose`, e so quando ele toca em
  salvar. Isso esta escrito na interface, no rodape do painel de ambientacao.

---

## Entregavel B - Widget

Bundle unico em JavaScript puro, sem framework. **11,9 KB comprimido**, contra
o teto de 100 KB; o build falha se passar.

**Shadow DOM fechado, obrigatorio.** O site roda Semantic UI 2.2.12, que aplica
estilo global agressivo em `button`, `input` e `div`. Todo o widget, CSS
incluso, vive dentro do shadow root: nada de la entra e nada daqui vaza.

**Tipografia.** O site declara Century Gothic, que e fonte de sistema sem
licenca web. Quem nao tem instalada cai hoje numa sans generica; por isso o
widget carrega **Jost** do Google Fonts, geometrica de base Futura, com desenho
equivalente. Precos e medidas com `font-variant-numeric: tabular-nums`.

**Avatar.** Circulo preto com a inicial J. Nao ha foto de pessoa nem retrato
gerado por IA, e o subtitulo "assistente virtual · Multiplos MM" fica sempre
visivel no cabecalho.

**Abertura.** O widget **nao abre sozinho ao carregar a pagina**. Abre so em
dois casos: clique no botao de ambientacao de um card de produto, ou 40 s na
mesma pagina de produto com rolagem ate o fim. O estado fica em
`sessionStorage`, para nao reabrir a cada navegacao.

### Ambientacao

E o modulo que diferencia o produto.

1. Foto por `<input type="file" accept="image/*">`, que abre a camera no
   celular. A foto nao sai do navegador nesta etapa.
2. Largura aproximada da parede em cm, padrao 320. **E essa referencia que
   produz a escala real.** Sem ela a ambientacao vira decoracao e nao resolve a
   duvida de tamanho, que e a que trava a compra.
3. Quatro cantos da area de parede, que definem o plano e permitem perspectiva.
4. `pixels_por_cm = largura_do_plano_em_px / parede_cm`.
5. Arraste para posicionar, com teclado tambem. O centro comeca a 145 cm do
   chao, padrao museologico.
6. Sete molduras com espessuras reais, em
   [`src/compartilhado/molduras.ts`](src/compartilhado/molduras.ts).
7. Sombra projetada proporcional a espessura, opacidade 0,3. Sem sombra a obra
   parece adesivo.

**Perspectiva entregue, nao adiada.** Com os quatro cantos, a homografia e
calculada e aplicada; em canvas 2D isso e feito subdividindo a imagem numa
malha de triangulos com transformacao afim exata por triangulo
([`widget/src/canvas-warp.js`](widget/src/canvas-warp.js)). E o que faz a
imagem parecer real em parede fotografada de angulo, que e a maioria.

**Uma unica fonte para a matematica.** `src/compartilhado/geometria.ts` e
importado tanto pelo widget quanto pelo `/compose`. O PNG salvo nao pode
divergir do que o cliente viu na tela, e a unica forma confiavel de garantir
isso e nao ter duas implementacoes.

### Acessibilidade

Foco visivel em todos os controles, `aria-live` na area de mensagens, foco
preso no painel enquanto aberto, Esc fecha, rotulo em todo campo, navegacao por
teclado no fluxo de conversa e na ambientacao.

---

## Entregavel C - Tag do GTM

Conteudo exato da tag, verificacoes antes de publicar e as **tags de GA4 uma por
evento**, com acionadores, variaveis e parametros mapeados: [`gtm/README.md`](gtm/README.md).

---

## Colocar no ar

```bash
sudo cp deploy/juliana.service /etc/systemd/system/
sudo cp deploy/juliana.cron    /etc/cron.d/juliana
sudo cp deploy/nginx-juliana.conf /etc/nginx/sites-available/juliana.multiplosmm.com.br
sudo certbot --nginx -d juliana.multiplosmm.com.br
sudo systemctl enable --now juliana
```

Arquivos comentados em [`deploy/`](deploy/). O registro A do subdominio precisa
existir antes do certbot.

---

## Perguntas da secao 10

As quatro dependem do cliente. O codigo nao ficou bloqueado por elas: cada uma
tem um padrao seguro e um ponto unico de ajuste.

| Pergunta | Situacao | Onde se ajusta |
|---|---|---|
| Quanto de disco livre tem o VPS? | **Em aberto.** Estimativa: 927 recortes PNG a ~400 KB dao cerca de **400 MB**; cada composicao de 2000 px pesa ~2 MB e e apagada aos 30 dias. Reservar **2 GB** cobre com folga | `COMPOSE_VALIDADE_DIAS`, e `npm run limpeza` no cron |
| O site tem CSP ativa? | **Em aberto.** Se tiver, o widget e bloqueado em silencio sem a liberacao | Checklist em `gtm/README.md`, item 2 |
| O feed aceita paginacao documentada? | **Em aberto.** A ingestao tenta `page` e `offset` sozinha e falha visivelmente abaixo de 800 itens; com o parametro documentado, e so fixar | `FEED_MODO_PAGINACAO`, `FEED_PARAM_PAGINA` |
| Quem mantem o GTM e quem aprova? | **Em aberto.** Nao bloqueia: os entregaveis A e B independem do container | — |

---

## O que nao foi feito, de proposito

- A obra mostrada e sempre a **foto real da peca**. Nenhum modelo generativo
  encosta na imagem da obra: galeria de edicao assinada nao pode exibir
  aproximacao.
- Nenhuma chave no front nem dentro da tag do GTM.
- O bundle nao vai dentro do GTM, so o carregador.
- A Juliana nao fala de obra que nao veio da busca.
- A foto do cliente nao sobe sem acao explicita dele.
- Sem widget fora de Shadow DOM, sem framework no widget, sem abertura
  automatica ao carregar a pagina.
- Sem painel administrativo, login ou banco de usuarios neste MVP.
