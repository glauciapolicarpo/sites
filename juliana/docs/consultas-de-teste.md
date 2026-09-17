# Etapa 2 - Dez consultas de teste em portugues

Homologacao da busca. Rode com o servico no ar e o catalogo ja indexado:

```bash
curl -s localhost:8787/search -H 'content-type: application/json' \
  -d '{"texto":"algo geometrico e colorido para a sala","preco_max":10000,"limite":3}' | jq
```

Em todas as consultas, duas regras valem sempre e nao dependem do texto:

- nenhuma obra com `disponivel = false` pode aparecer;
- `largura_max_cm` nunca devolve obra sem medida cadastrada, porque prometer
  que ela cabe seria chute.

| # | Consulta | Corpo | O que precisa acontecer |
|---|---|---|---|
| 1 | Geometrico e colorido, com teto de preco | `{"texto":"algo geometrico e colorido para a sala","preco_max":10000,"limite":3}` | Tres obras, todas abaixo de R$ 10.000, priorizando as com tag `geometrico` e `cor_forte` |
| 2 | Preto e branco | `{"texto":"quero uma obra em preto e branco, discreta","limite":3}` | Obras com tag `preto_e_branco`; nada de cor forte no topo |
| 3 | Por artista | `{"artista":"Ana","limite":5}` | So obras cujo campo artista contem "Ana" |
| 4 | Por tecnica | `{"tecnica":"serigrafia","limite":5}` | So serigrafias |
| 5 | Faixa de preco fechada | `{"preco_min":3000,"preco_max":6000,"limite":5}` | Todos os precos dentro da faixa |
| 6 | Espaco estreito | `{"texto":"parede estreita do corredor","largura_max_cm":45,"limite":3}` | So obras com `largura_cm` preenchida e menor ou igual a 45 |
| 7 | Acento e sem acento | `{"texto":"geométrico"}` e `{"texto":"geometrico"}` | Os dois devolvem o mesmo conjunto: o tokenizador normaliza acento |
| 8 | Termo que nao existe no catalogo | `{"texto":"escultura em bronze de cavalo empinado","limite":3}` | `total` pode vir alto, mas nada irrelevante no topo. A Juliana precisa dizer que nao tem, e a regra que garante isso e a instrucao do prompt somada a este resultado |
| 9 | Sem texto nenhum | `{"limite":5}` | Ordem estavel: obras com medida e recorte primeiro, depois por preco |
| 10 | Frase inteira de cliente | `{"texto":"quero algo geometrico e colorido para a sala, ate 10 mil","limite":3}` | As palavras vazias ("quero", "para", "ate") sao descartadas e o resultado bate com a consulta 1 |

## Conferencia manual obrigatoria

Para cada obra devolvida na consulta 1, abrir `url` no site e conferir que
**tecnica, tiragem e preco batem** com o que a busca devolveu. Esse e o item 4
do criterio de aceite e e o unico jeito de pegar divergencia entre o feed e a
pagina do produto.
