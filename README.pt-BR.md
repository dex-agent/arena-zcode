# arena-zcode

🌐 [English](README.md) | **Português (Brasil)** | [Español](README.es.md) | [中文](README.zh-CN.md)

Quando o modelo insiste em te dar respostas ruins, faça 16 versões dele brigarem até a morte.
Uma skill do ZCode. Grátis, MIT, sem chave de API, nada pra conectar - e os juízes nem são o
mesmo modelo que os competidores.

**Comece rápido:** a [instalação de uma colagem](#instalação) coloca tudo na tua máquina com uma
mensagem, e o [docs/PROMPTS.pt-BR.md](docs/PROMPTS.pt-BR.md) é um catálogo de casos de uso reais,
prontos pra copiar.

## O que torna este diferente da arena que o inspirou

- **Workers numa lane rápida, juízes em outra.** Competidores, atacantes e defensores rodam num
  modelo flash rápido (`arena-flash`); cada juiz e a verificação final rodam num modelo de decisão
  externo, pelo runner próprio da skill (`jev-juiz`, API TypeSafe SystemOne): cada decisão de
  julgamento é uma pergunta estruturada contra a mesma régua escrita - réguas iguais, sem
  autopreferência pela família de modelo que está competindo, centavos por partida, zero
  dependência dos provedores do host. `--judge-pro` coloca os juízes no modelo da sessão.
- **Zero contexto de casa nos workers.** Todo agent-file declara `injectAgentsMd: false`: sem
  AGENTS.md, sem memória, sem boilerplate. O brief é o mundo inteiro do sub-agente. Isso mantém
  os 16 competidores realmente diferentes e a conta de tokens sob controle.
- **Defaults sensatos.** 16 competidores, ondas de 5. `--quick` para 8, `--full` para os 100
  completos.
- **Nenhuma troca silenciosa de modelo.** Se a lane do juiz falha, falha alto: a partida para e
  tu decides. O design original do torneio - cartas, ataque/defesa/julgamento, o motor de chave e
  o estado retomável - vem preservado do projeto que inspirou este (veja Créditos).

## Instalação

### A instalação de uma colagem (recomendada)

Cola isto no ZCode, na pasta onde queres o repo:

```
Instale a skill arena-zcode a partir de https://github.com/<voce>/arena-zcode:
1. faça git clone do repo numa pasta temporária
2. rode powershell -NoProfile -ExecutionPolicy Bypass -File <repo>/skills/arena-zcode/scripts/deploy.ps1
3. confirme que ~/.zcode/skills/arena-zcode/SKILL.md existe e que os três arquivos de lane arena-*.md estão em ~/.zcode/agents/
4. os arquivos de lane vêm com ids de modelo placeholders (YOUR-FAST-FLASH-MODEL-ID): me ajude a configurar a lane de worker com um modelo rápido do meu catálogo de provedores, e me lembre de abrir uma NOVA sessão
5. depois mostre três casos de uso prontos pra colar do docs/PROMPTS.pt-BR.md
```

Já clonou o repo localmente? Os mesmos passos, sem o clone:

```
Instale a skill arena-zcode desta pasta:
1. rode powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1
2. confirme que ~/.zcode/skills/arena-zcode/SKILL.md existe e que os três arquivos de lane arena-*.md estão em ~/.zcode/agents/
3. me ajude a configurar o id de modelo da lane de worker (vem como YOUR-FAST-FLASH-MODEL-ID) com um modelo rápido do meu catálogo
4. me lembre que a skill carrega numa NOVA sessão e mostre três casos de uso do docs/PROMPTS.pt-BR.md
```

### O caminho manual

Exige ZCode com a ferramenta Agent, Python 3.8 ou mais novo e Node para o runner de juiz.
Nada pra instalar com pip ou npm. A lane de juiz precisa da variável de ambiente `TYPESAFE_API_KEY`
(TypeSafe SystemOne); sem ela, use `--judge-pro`.

```bash
git clone <este repo>
cd arena-zcode
powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1
```

O script cria o link de `skills/arena-zcode` em `~/.zcode/skills/` e copia as três definições de
agente da própria pasta `agents/` da skill para `~/.zcode/agents/`. A pasta da skill é
autocontida: SKILL.md, o motor de chave, a régua, as estratégias, as lanes de agente e o script
de deploy viajam juntos; copiar essa pasta é copiar a skill inteira. Arquivos de agente não fazem
hot-reload: abra uma **sessão nova do ZCode** antes de usar. As linhas `model:` das definições são
PLACEHOLDERS (`YOUR-FAST-FLASH-MODEL-ID`, `YOUR-PROVIDER-ID/...`): edite para ids de modelos do
teu próprio catálogo de provedores do ZCode antes de deployar - a lane de worker quer um modelo
rápido, a lane de juiz dormente quer um modelo de família diferente dos workers.

Para desinstalar: apague `~/.zcode/skills/arena-zcode` e os arquivos `arena-*.md` em
`~/.zcode/agents/`.

## Use

```
$arena-zcode
$arena-zcode --quick escreve a headline da nossa página de preços
$arena-zcode --agents 32 conserta o teste flaky em tests/test_api.py
$arena-zcode --judge-pro plane minha semana de launch, tenho 6 horas por dia
$arena-zcode --seed 7 mesmas cartas e a mesma chave do run anterior com seed
```

Sozinho, `$arena-zcode` pega teu último pedido como tarefa e a resposta que não gostaste como a
desafiante. O modelo também pode acioná-la sem a tag, quando disseres algo como "que resposta
ruim, põe eles pra competir" - e aí ele pergunta antes de gastar qualquer coisa.

| flag | o que faz |
| --- | --- |
| `--agents N` | N competidores. Padrão 16. |
| `--quick` | 8 competidores. O barato do dia a dia. |
| `--full` | 100 competidores. O torneio em escala completa; caro. |
| `--judge-pro` | juízes e verificação final rodam no modelo da sessão em vez do juiz externo. |
| `--seed S` | Mesma seed, mesmas cartas e a mesma chave. Padrão aleatório, e registrado. |
| `--wave W` | Sub-agentes por onda. Padrão 5. Só suba depois de medir o que teu host roda ao mesmo tempo. |

## Como funciona

1. **Spawn.** N sub-agentes, uma chamada Agent cada. Todos recebem o mesmo texto de tarefa, byte
   a byte (um teste confere), mais uma carta de estratégia. São 15 modos de raciocínio, 12
   workflows e 12 estratégias: 2.160 cartas diferentes, distribuídas sem repetição.
2. **Ataque.** As soluções são pareadas, e o pareamento evita colocar dois agentes com o mesmo
   modo de raciocínio um contra o outro. Cada lado ataca a solução do outro: o que está errado,
   qual requisito faltou, a entrada exata que quebra. Até 7 ataques, rotulados FATAL, MAJOR ou
   MINOR.
3. **Defesa.** Cada lado responde a cada ataque recebido, concedendo ou rebatendo com evidência,
   e reescreve a solução corrigindo tudo o que concedeu.
4. **Julgamento.** O runner `jev-juiz` da skill envia a partida para um **modelo de decisão
   externo** (TypeSafe SystemOne): cada critério como choice 0-10 contra
   [a régua](skills/arena-zcode/rubric.md) - correção 30, completude 25, robustez 20,
   especificidade 15, clareza 10 - mais a flag fatal, a adjudicação de cada ataque em cinco
   níveis (FIXED / REBUTTED / STANDING_MINOR / STANDING_MAJOR / STANDING_FATAL), uma sonda de
   defeito autoencontrado e a escolha de vencedor. O juiz nunca vê as cartas. A robustez é
   derivada dos mesmos sinais, então fatal e robustez não se contradizem. O `bracket.py` faz a
   aritmética: passa o total ponderado mais alto, solução com falha fatal verificada não bate
   solução sem ela, e as notas vencem a escolha do juiz se divergirem. O perdedor sai.
5. **Repetição.** Os sobreviventes carregam as soluções revisadas para a rodada seguinte. Número
   ímpar dá um bye, nunca duas vezes pro mesmo agente enquanto outro com menos byes espera.
6. **Resultado.** Sobrou uma solução. Tu recebes ela, os ataques que sobreviveu, a carta dela e a
   contagem de rodadas. Se partiste de uma resposta rejeitada, um juiz final cego compara o
   campeão com ela e informa o placar, mesmo quando a resposta velha ganha.

O torneio inteiro vive num JSON, gerenciado pelo `bracket.py`. A sessão principal só roda o loop e
nunca lê as centenas de arquivos de solução: cada sub-agente escreve o trabalho em disco e responde
uma linha. Se a conversa for compactada no meio, `bracket.py next` retoma do arquivo.

## Quanto custa

A skill é grátis. Os tokens são teus.

| agentes | rodadas | chamadas de sub-agente |
| --- | --- | --- |
| 16, o padrão | 4 | 91 |
| 8, `--quick` | 3 | 43 |
| 32 | 5 | 187 |
| 100, `--full` | 7 | 595 |

Juízes são cerca de 18% das chamadas quando rodam como agentes; no runner `jev-juiz` são chamadas
únicas de API (cerca de 10k tokens de entrada e bem menos de um centavo cada, saída grátis).

## A ferramenta

`bracket.py` é Python só da biblioteca padrão. É a razão pela qual o orquestrador nunca perde o
fio. `python skills/arena-zcode/bracket.py --help` (e `<comando> --help` de cada subcomando) é a
referência viva de toda flag.

```bash
python skills/arena-zcode/bracket.py plan --agents 16   # rodadas, chamadas, ondas. Não escreve nada
python skills/arena-zcode/bracket.py init --agents 16 --seed 7 --task-file task.md
python skills/arena-zcode/bracket.py next               # o que fazer agora, com o comando exato
python skills/arena-zcode/bracket.py status             # vivos e eliminados, por rodada
python skills/arena-zcode/bracket.py winner             # o sobrevivente e como chegou lá
```

## O runner de juiz

`skills/arena-zcode/scripts/jev-juiz.mjs` é o juiz externo: uma chamada Node por partida,
centavos cada, sem provedor do host no caminho.
O que é esse juiz, **de onde vem a `TYPESAFE_API_KEY`** (console.typesafe.ai/keys), quanto custa e como funciona o protocolo de perguntas inteiro está em [docs/JUDGE.md](docs/JUDGE.md) - escrito pra quem não tem nenhum do contexto original.
`node skills/arena-zcode/scripts/jev-juiz.mjs --help` é a referência viva. Os comandos que tu
vais usar de verdade:

```bash
node skills/arena-zcode/scripts/jev-juiz.mjs --check-key      # ping vivo de uma pergunta, antes de qualquer gasto
node skills/arena-zcode/scripts/jev-juiz.mjs --calibrate      # par cego fraco-vs-limpo, as duas chamadas precisam passar
node skills/arena-zcode/scripts/jev-juiz.mjs --size-report <brief>   # estimativa de payload vs o teto, sem chamada
node skills/arena-zcode/scripts/jev-juiz.mjs <judge-brief>    # julgar uma partida (o orquestrador faz isto)
```

Exit codes são contrato: `0` sucesso; `2` uso; `3` determinístico (teto de tamanho, HTTP 4xx) -
corrija a entrada, nunca retente igual; `4` problema de chave (401/403) - conserte a chave; `5`
transitório (5xx, rede, timeout) - retry fresco, até três; `6` calibração não confirmada; `7`
calibração invertida - pare. `JUDGE_CAP_OVERRIDE=<N>` levanta o teto de payload como decisão
registrada.

## As letrinhas miúdas

- **"16 versões do modelo" são 16 sub-agentes de um modelo worker.** O que os diferencia é a
  carta. O juiz é deliberadamente de outra lane, então a régua não é a mesma mão que compete.
- **"Um competidor é a carta dele mais o arquivo de solução."** Sub-agentes não lembram nada
  entre chamadas: o atacante da rodada 3 é um sub-agente novo com a mesma carta e a solução mais
  recente.
- **"A melhor resposta" é a que sobreviveu a todas as partidas.** O que tu recebes é a resposta
  mais forte que este torneio achou, não uma prova de que está certa. Por isso ele te mostra os
  ataques que ela sobreviveu, e por isso ele conta na tua cara quando a resposta que rejeitaste
  pontuou mais alto.
- **Sub-agentes não veem teu chat.** A skill escreve um arquivo de tarefa autossuficiente, e esse
  arquivo é tudo o que os competidores conhecem. Se um requisito não entrou no arquivo, todos
  erram. Ele fica em `.arena/<run>/task.md` se quiseres conferir.
- **Nunca edita teu projeto.** Mudanças de código voltam como diff ou arquivos completos dentro
  da resposta vencedora. Aplicar é decisão tua, e a skill pergunta.
- **Mesma seed, mesmas cartas e a mesma chave.** Não as mesmas respostas. O modelo não é
  determinístico.
- **Não conserta tarefa ruim.** Tarefa vaga entra, 16 sabores de vago saem.

## Arquivos

```
skills/arena-zcode/SKILL.md            os passos de orquestração, lanes e cada brief de sub-agente
skills/arena-zcode/bracket.py          a máquina de estados do torneio, só biblioteca padrão
skills/arena-zcode/strategies.json     15 modos de raciocínio, 12 workflows, 12 estratégias. Edite à vontade
skills/arena-zcode/rubric.md           os cinco critérios que todo juiz pontua
skills/arena-zcode/agents/arena-flash.md      lane de worker: competidores, atacantes, defensores
skills/arena-zcode/agents/arena-jev-juiz.md   lane de juiz dormente (por agente); a via ativa é o runner acima
skills/arena-zcode/agents/arena-juiz-pro.md   lane de juiz para --judge-pro: modelo da sessão
skills/arena-zcode/scripts/jev-juiz.mjs       runner do juiz: modelo de decisão externo, réguas iguais,
                                              adjudicação em 5 níveis, sonda autoencontrada, robustez
                                              derivada, teto de tamanho, classificação de falha,
                                              --check-key e --calibrate antes de gastar
skills/arena-zcode/scripts/fixtures/          par de calibração (tarefa, fraca, limpa)
skills/arena-zcode/scripts/deploy.ps1         instala em ~/.zcode (link da skill + arquivos de agente,
                                              -Lane/-Model emite lanes extras de worker)
tests/test_bracket.py                  os testes (a env ARENA_SKILL_DIR escolhe a cópia testada)
docs/PROMPTS.md                        casos de uso reais, prontos pra colar (o catálogo)
docs/ORIGINAL-README.md                o README do projeto que inspirou este
```

Traduções deste README: [English](README.md) | [Español](README.es.md) | [中文](README.zh-CN.md)

## Créditos

O design do torneio e o motor de chave foram adaptados do
[arena-skill](https://github.com/Jakeschincariol/arena-skill) de Jake Schincariol (MIT), que
inspirou este projeto. O README original está preservado em
[docs/ORIGINAL-README.md](docs/ORIGINAL-README.md).

## Licença

MIT. Pega, muda, publica.
