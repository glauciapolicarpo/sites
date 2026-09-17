# Entregavel C - Tag do GTM e tags de GA4

## 1. A tag

Tipo **HTML personalizado**, acionador **Todas as paginas**, conteudo exato em
[`tag-juliana.html`](./tag-juliana.html).

A guarda `window.__julianaCarregada` cobre o caso de a tag disparar mais de uma
vez: o widget nunca aparece duas vezes.

Para publicar uma versao nova do bundle, suba o arquivo no servidor e troque o
`?v=1` por `?v=2` na tag. O cache do widget e curto (5 minutos), entao a troca
de versao e o mecanismo de invalidacao imediata.

### Atributos aceitos pela tag

| Atributo | Padrao | Para que serve |
|---|---|---|
| `data-api` | origem do proprio script | Base das chamadas ao servico |
| `data-seletor-ambientacao` | `[data-juliana-ambientar], .juliana-ambientar, [data-ambientar]` | Quais botoes de card de produto abrem a ambientacao |
| `data-logo` | `/assets/image/logo/logo.png` | Logo no cabecalho do widget |

## 2. Verificacoes antes de publicar

- [ ] **Content-Security-Policy.** Se o site tiver CSP ativa, incluir
      `juliana.multiplosmm.com.br` em `script-src`, `connect-src` e `img-src`,
      e `fonts.googleapis.com` / `fonts.gstatic.com` em `style-src` e
      `font-src`. Sem isso o widget e bloqueado em silencio e nao aparece erro
      visivel para o usuario. Conferir com o DevTools aberto na aba Console.
- [ ] Testar no **modo de Visualizacao** do GTM, em desktop e celular, antes de
      publicar o container.
- [ ] Confirmar que o widget nao aparece duas vezes se a tag disparar mais de
      uma vez.
- [ ] Confirmar que a Juliana **nao abre sozinha** ao carregar a pagina.

## 3. Os oito eventos no dataLayer

Todos levam `session_id`.

| Evento | Parametros | Quando dispara |
|---|---|---|
| `juliana_aberta` | `origem` | O painel abre, por botao, por card de produto ou por permanencia |
| `triagem_concluida` | `ambiente`, `gosto`, `faixa` | As tres perguntas de triagem foram respondidas |
| `obra_recomendada` | `obra_id`, `posicao` | Cada cartao de obra mostrado |
| `ambientacao_iniciada` | `obra_id` | O painel de ambientacao abre |
| `ambientacao_gerada` | `obra_id`, `moldura` | O `/compose` devolveu o PNG |
| `imagem_baixada` | `obra_id` | O cliente clicou em baixar |
| `handoff_whatsapp` | `motivo`, `obra_id` | O atendimento passou para o consultor |
| `clique_produto` | `obra_id` | O cartao levou para a pagina do produto |

## 4. Tags de GA4 a criar no container

Uma tag por evento, todas do tipo **Evento do Google Analytics: GA4**, usando a
mesma tag de configuracao GA4 que o site ja tem.

Primeiro crie **um acionador por evento**, do tipo *Evento personalizado*, com o
nome do evento na coluna da esquerda da tabela acima (por exemplo, nome do
evento `juliana_aberta`).

Depois crie **uma variavel da camada de dados por parametro**, todas do tipo
*Variavel da camada de dados*, versao 2:

| Nome da variavel | Nome da variavel da camada de dados |
|---|---|
| `dlv_session_id` | `session_id` |
| `dlv_obra_id` | `obra_id` |
| `dlv_posicao` | `posicao` |
| `dlv_moldura` | `moldura` |
| `dlv_motivo` | `motivo` |
| `dlv_origem` | `origem` |
| `dlv_ambiente` | `ambiente` |
| `dlv_gosto` | `gosto` |
| `dlv_faixa` | `faixa` |

Por fim, as tags:

| Tag | Nome do evento GA4 | Parametros do evento | Acionador |
|---|---|---|---|
| GA4 - Juliana aberta | `juliana_aberta` | `session_id`={{dlv_session_id}}, `origem`={{dlv_origem}} | Evento personalizado `juliana_aberta` |
| GA4 - Triagem concluida | `triagem_concluida` | `session_id`, `ambiente`={{dlv_ambiente}}, `gosto`={{dlv_gosto}}, `faixa`={{dlv_faixa}} | Evento personalizado `triagem_concluida` |
| GA4 - Obra recomendada | `obra_recomendada` | `session_id`, `obra_id`={{dlv_obra_id}}, `posicao`={{dlv_posicao}} | Evento personalizado `obra_recomendada` |
| GA4 - Ambientacao iniciada | `ambientacao_iniciada` | `session_id`, `obra_id` | Evento personalizado `ambientacao_iniciada` |
| GA4 - Ambientacao gerada | `ambientacao_gerada` | `session_id`, `obra_id`, `moldura`={{dlv_moldura}} | Evento personalizado `ambientacao_gerada` |
| GA4 - Imagem baixada | `imagem_baixada` | `session_id`, `obra_id` | Evento personalizado `imagem_baixada` |
| GA4 - Handoff WhatsApp | `handoff_whatsapp` | `session_id`, `motivo`={{dlv_motivo}}, `obra_id` | Evento personalizado `handoff_whatsapp` |
| GA4 - Clique produto | `clique_produto` | `session_id`, `obra_id` | Evento personalizado `clique_produto` |

No GA4, registre `session_id`, `obra_id`, `moldura`, `motivo`, `origem`,
`ambiente`, `gosto` e `faixa` como **dimensoes personalizadas de escopo de
evento**, senao os parametros chegam mas nao aparecem nos relatorios.

## 5. Ordem esperada no Visualizador

No teste de homologacao os eventos aparecem nesta ordem:

```
juliana_aberta -> triagem_concluida -> obra_recomendada (x3)
-> ambientacao_iniciada -> ambientacao_gerada -> imagem_baixada
-> handoff_whatsapp
```

`clique_produto` aparece quando o cartao e clicado, em qualquer ponto.
