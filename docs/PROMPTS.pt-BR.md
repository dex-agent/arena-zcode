# arena-zcode: casos de uso reais, prontos pra colar

🌐 [English](PROMPTS.md) | **Português (Brasil)** | [Español](PROMPTS.es.md) | [中文](PROMPTS.zh-CN.md)

Todo caso abaixo segue o mesmo formato: quando usar, o prompt exato, o que volta e quanto custa.
Os prompts estão em português, mas os modelos entendem qualquer idioma. Faixas de custo: `--quick`
são 8 agentes (43 chamadas), o padrão é 16 (91 chamadas), `--full` são 100 (595 chamadas, pense
duas vezes). Juízes custam centavos de qualquer jeito.

## Como faço pra brigar com uma resposta ruim que já recebi?

Quando o modelo já respondeu ruim e repetir não tá levando a lugar nenhum.

```
$arena-zcode
```

Invocação pura: teu último pedido vira a tarefa e a resposta que não gostaste vira a baseline a
bater. No fim, um juiz final cego compara o campeão com a resposta antiga e conta o placar na
lata, mesmo se a antiga ganhar.

## Como conseguir uma headline, e-mail ou release note melhor?

Texto curto, aposta do dia a dia: usa a faixa barata.

```
$arena-zcode --quick escreve a headline da nossa página de preços; público é CFO, tom seco, máx 8 palavras
$arena-zcode --quick release notes pra este conjunto de mudanças, pro changelog interno, linguagem simples
$arena-zcode --quick e-mail frio pra um mantenedor propondo testar nossa ferramenta; 120 palavras máx, sem buzzwords
```

## Como consertar um bug ou teste flaky?

A arena nunca toca nos teus arquivos: as soluções voltam como diffs que tu decides aplicar.

```
$arena-zcode --agents 16 conserta o teste flaky tests/test_api.py::test_retry; falha ~1 em 5 runs no CI
$arena-zcode acha a causa raiz do memory leak em worker/pool.py e propõe o fix como diff
```

## Como escolher entre abordagens?

N opções entram, uma sobrevive - cada competidor defende uma abordagem pela própria carta.

```
$arena-zcode --agents 16 precisamos de armazenamento durável de jobs: Postgres, SQLite ou Redis pra um serviço de fila de 3 nós; escolhe um e defende contra os outros dois
$arena-zcode --quick nosso CLI usa subcomandos ou verb flags? decide e justifica
```

## Como planejar algo com restrições reais?

Planos também são respostas: ataque/defesa/julgamento funciona neles igual.

```
$arena-zcode --judge-pro plane minha semana de launch; 6 horas por dia, solo, landing page + docs + 3 demos pra sexta
$arena-zcode --quick plano de migração de Express pra Fastify com zero downtime, o serviço tem 40 endpoints
```

## Como fazer MEU PRÓPRIO design batalhar contra ideias novas? (o caso coroa)

Tu já tens um design (ou documento, ou política) e quer estressá-lo com alternativas. Este é o
movimento mais forte do catálogo - e é exatamente assim que a arena-zcode v2 foi desenhada.

1. Escreve o desafio num arquivo, autossuficiente (contexto, restrições, entregável, prioridades).
2. Escreve teu design atual num segundo arquivo, como resposta a esse desafio.
3. Aponta a arena pra eles:

```
$arena-zcode --quick --seed 42 --agents 8 arquitetura a skill de torneio descrita em .arena/task.md
```

e diz ao orquestrador (no chat) que `.arena/baseline.md` é o teu design a bater, pra ele dar init
com `--baseline-file`. Os competidores leem o desafio, estudam os arquivos que ele aponta e
desenham os deles; o juiz final cego pontua o campeão contra o teu design - e reporta mesmo quando
o teu ganha.

Um task file provado pra este formato: enuncia o desafio, lista restrições duras, ordena os
objetivos por prioridade, define o entregável (o que um engenheiro implementa sem fazer perguntas)
e aponta os arquivos pra ler. Um baseline provado: teu design escrito como esse mesmo entregável.

## Como gerar hipóteses de debugging?

Quando nem sequer sabes o que está errado ainda.

```
$arena-zcode --quick gere e ranqueie hipóteses de causa raiz pra: pico de 500s em produção todo dia às 09:00 por 11 minutos, só na rota de login; aqui estão os gráficos e os caminhos de log de deploy: ...
```

## Como nomear coisas?

Naming é esporte de torneio: curto, julgado, barato.

```
$arena-zcode --quick nomeia nossa skill opensource de torneio de agentes; precisa ler bem num comando de shell, ter domínio .com disponível e não ser marca registrada
```

## Como documentar ou explicar algo difícil?

```
$arena-zcode --quick explica nosso protocolo de consenso pra um engenheiro backend novo, 15 linhas máx, um diagrama em palavras
```

## O que cada flag faz, afinal?

```
--quick          8 competidores (43 chamadas de sub-agente)
--agents N       qualquer N de 2 a 2160 (cartas distintas)
--full           100 competidores (595 chamadas) - a resposta que importa
--judge-pro      juízes no modelo da sessão (só partidas; a final continua externa)
--seed S         mesmas cartas e mesma chave de um run anterior com seed
--wave W         sub-agentes por onda (padrão 5)
```

Referência viva: `python skills/arena-zcode/bracket.py --help` e
`node skills/arena-zcode/scripts/jev-juiz.mjs --help`.
