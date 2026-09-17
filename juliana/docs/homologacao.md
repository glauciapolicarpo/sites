# Secao 7 - Checklist de homologacao

Teste manual de ponta a ponta. Precisa passar inteiro. Marque um a um.

| # | Passo | Como conferir | OK |
|---|---|---|---|
| 1 | Abro uma pagina de produto, espero 40 s com rolagem ate o fim; o botao aparece e o widget abre | O widget **nao** pode abrir sozinho ao carregar. O botao "Falar com a Juliana" fica no canto inferior direito desde o inicio; a abertura automatica so acontece depois dos 40 s **e** da rolagem ate o fim | ☐ |
| 2 | O widget nao herdou estilo do Semantic UI | Fonte Jost/Century Gothic, botoes pretos de canto 4 px, campo com fundo `#F7F7F6`. Inspecionar: todo o widget esta dentro de um `#shadow-root (closed)` | ☐ |
| 3 | Digo "quero algo geometrico e colorido para a sala, ate 10 mil" | A resposta chega em ate poucos segundos | ☐ |
| 4 | Ela recomenda tres obras reais, disponiveis, abaixo de R$ 10.000 | Abrir cada cartao e conferir **tecnica, tiragem e preco** contra a pagina do produto | ☐ |
| 5 | Pergunto por uma obra que nao existe | Ela diz que nao tem, sem inventar. Nao pode citar nenhum titulo que nao esteja no catalogo | ☐ |
| 6 | Peco para ver a segunda obra na minha parede | O painel de ambientacao abre com a obra certa | ☐ |
| 7 | Envio foto pelo celular, informo 320 cm, marco os quatro cantos | No iPhone o `input` abre a camera. A foto **nao** sobe para o servidor neste momento | ☐ |
| 8 | A obra aparece em escala plausivel; troco de canaleta para classica e a espessura muda visivelmente | Canaleta tem 2 cm por lado, classica 7 cm: a diferenca e de 10 cm na largura total | ☐ |
| 9 | Confiro a conta | Obra de 50 x 70 cm em parede de 300 cm ocupa **um sexto** da largura da imagem. Com moldura classica, a peca mede **64 x 84 cm** | ☐ |
| 10 | Clico em salvar e recebo um PNG de boa resolucao com a marca d'agua | Lado maior de 2000 px, rodape com "Simulacao. Multiplos Mayer Mizrahi." | ☐ |
| 11 | Peco desconto | Ela nao negocia e oferece o consultor humano; o botao do WhatsApp aparece | ☐ |
| 12 | Os oito eventos aparecem no Visualizador do GTM, na ordem | Ver a tabela de ordem esperada em `gtm/README.md` | ☐ |
| 13 | `/health` responde com a data da ultima ingestao e mais de 800 obras | `curl https://juliana.multiplosmm.com.br/health` deve devolver **200** e `ok: true` | ☐ |

## Itens 9 e 13 tem verificacao automatizada

A conta do item 9 e o comportamento do item 13 estao cobertos por teste:

```bash
npm test
```

- `src/compartilhado/geometria.test.ts` fixa a matematica de escala: um sexto
  da largura e a peca de 64 x 84 cm.
- `src/servico.test.ts` gera um PNG de verdade pelo `/compose` e confere a
  fracao da parede, a medida com moldura, os 2000 px e que a obra foi mesmo
  desenhada na foto.

Isso nao substitui o teste manual: o que a automacao nao cobre e como a coisa
**parece** na foto do cliente, que e o ponto do produto.

## Antes de chamar a homologacao

- [ ] `npm run ingest` trouxe mais de 800 obras e o relatorio de cobertura foi lido
- [ ] `data/sem_dimensao.csv` foi entregue a cliente
- [ ] `prompts/juliana.md` esta com o texto definitivo e as regras comerciais preenchidas
- [ ] `WHATSAPP_NUMERO` configurado
- [ ] CSP do site liberada para o subdominio, se houver CSP
- [ ] Container do GTM testado no modo de Visualizacao, em desktop e celular
