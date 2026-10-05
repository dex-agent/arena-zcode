# arena-zcode

🌐 **English** | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md) | [中文](README.zh-CN.md)

When the model keeps giving you bad answers, make 16 versions of it fight to the death. One ZCode
skill. Free, MIT, no API key, nothing to connect - and the judges are not even the same model as
the competitors.

**Try it fast:** the [one-paste install](#install) puts it in your machine in one message, and
[docs/PROMPTS.md](docs/PROMPTS.md) is a catalogue of real, battle-tested use cases ready to copy.

You use it when you are not happy with what the model gave you. Instead of asking again and again,
`$arena-zcode` spins up sub-agents and gives every one of them the exact same task, word for word.
Each one gets a different strategy card: a way of reasoning, a workflow and a strategy, so each one
attacks the task differently. Then they pair off. Each attacks the other's solution, each defends
and revises its own, and an **external judge** scores the match on a written rubric. The loser is
out. 16 becomes 8, then 4, 2, 1.

What comes back is the one solution that survived, the attacks it beat on the way, and how many
rounds it took.

**It never touches your files.** Every sub-agent writes inside `.arena/`. The winning answer comes
back to you, and using it is your call.

## What makes this different from the arena that inspired it

- **Workers on a fast lane, judges on another.** Competitors, attackers and defenders run on a
  flash model (`arena-flash`); every judge and the final check run on an external decision model
  through the skill's own `jev-juiz` runner (TypeSafe SystemOne API): every judging call is a
  structured question against the same written rubric - equal rulers, no self-preference for the
  family of model that is competing, cents per match, zero dependence on the host's providers.
  `--judge-pro` puts judges on the session model instead.
- **No house context in the workers.** Every agent definition sets `injectAgentsMd: false`: no
  AGENTS.md, no memory, no boilerplate. The brief file is the sub-agent's entire world. That keeps
  16 competitors actually different and keeps the token bill sane.
- **Sane defaults.** 16 competitors, waves of 5. `--quick` for 8, `--full` for the full 100.
- **No silent model swaps.** If a judge lane fails, it fails loudly: the match stops and you decide.
  The original tournament design - cards, attack/defend/judge, the bracket engine, the resume-anytime
  state file - is preserved from the project that inspired this one (see Credit).

## Install

### The one-paste install (recommended)

Paste this into ZCode, in the folder where you want the repo:

```
Install the arena-zcode skill from https://github.com/<you>/arena-zcode:
1. git clone the repo into a temp folder
2. run powershell -NoProfile -ExecutionPolicy Bypass -File <repo>/skills/arena-zcode/scripts/deploy.ps1
3. confirm ~/.zcode/skills/arena-zcode/SKILL.md exists and the three arena-*.md lane files are in ~/.zcode/agents/
4. the lane files ship with placeholder model ids (YOUR-FAST-FLASH-MODEL-ID): help me set the worker lane to a fast model from my provider catalog, and remind me to start a NEW session
5. then show me three ready-to-paste use cases from docs/PROMPTS.md
```

Already cloned the repo locally? Same steps, skipping the clone:

```
Install the arena-zcode skill from this folder:
1. run powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1
2. confirm ~/.zcode/skills/arena-zcode/SKILL.md exists and the three arena-*.md lane files are in ~/.zcode/agents/
3. help me set the worker lane model id (it ships as YOUR-FAST-FLASH-MODEL-ID) to a fast model from my catalog
4. remind me the skill loads in a NEW session, then show me three use cases from docs/PROMPTS.md
```

### The manual way

Requires ZCode with the Agent tool, Python 3.8 or newer, and Node for the judge runner.
Nothing to pip or npm install. The judge lane needs a `TYPESAFE_API_KEY` environment variable
(TypeSafe SystemOne); without it, use `--judge-pro`.

```bash
git clone <this repo>
cd arena-zcode
powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1
```

The script links `skills/arena-zcode` into `~/.zcode/skills/` and copies the three agent
definitions from the skill's own `agents/` folder to `~/.zcode/agents/`. The skill folder is
self-contained - SKILL.md, the bracket engine, the rubric, the strategies, the agent lanes and
the deploy script all travel together, so copying that one folder is copying the whole skill.
Agent files do not hot-reload: start a **new ZCode session**, then use it. The `model:` lines in
the agent definitions are PLACEHOLDERS (`YOUR-FAST-FLASH-MODEL-ID`, `YOUR-PROVIDER-ID/...`):
edit them to model ids from your own ZCode provider catalog before deploying - the worker lane
wants a fast model, the dormant judge lane a model from a different family than the workers.

To uninstall: delete `~/.zcode/skills/arena-zcode` and the `arena-*.md` files in `~/.zcode/agents/`.

## Use it

```
$arena-zcode
$arena-zcode --quick write the headline for our pricing page
$arena-zcode --agents 32 fix the flaky test in tests/test_api.py
$arena-zcode --judge-pro plan my launch week, I have 6 hours a day
$arena-zcode --seed 7 same cards, same bracket as the last seeded run
```

On its own, `$arena-zcode` takes your last request as the task and the answer you did not like as
the one to beat. The model can also reach for it without the tag, when you say something like
"that's a bad answer, make them compete" - and then it asks before it spends anything.

| flag | what it does |
| --- | --- |
| `--agents N` | N competitors. Default 16. |
| `--quick` | 8 competitors. The everyday-cheap setting. |
| `--full` | 100 competitors. The full-scale tournament; expensive. |
| `--judge-pro` | judges and the final check run on the session model instead of the external judge. |
| `--seed S` | Same seed, same cards and same bracket. Default random, and recorded. |
| `--wave W` | Sub-agents per wave. Default 5. Only raise it after measuring what your host runs at once. |

## How it works

1. **Spawn.** N sub-agents, one Agent call each. Every one gets the same task text, byte for byte
   (a test checks it), plus one strategy card. There are 15 reasoning modes, 12 workflows and 12
   strategies: 2,160 different cards, dealt with no repeats.
2. **Attack.** Solutions are paired, and the pairing avoids putting two agents with the same
   reasoning mode against each other. Each side attacks the other's solution: what is wrong, what
   requirement it missed, the exact input that breaks it. Up to 7 attacks, labelled FATAL, MAJOR
   or MINOR.
3. **Defend.** Each side answers every attack it took, conceding or rebutting with evidence, then
   rewrites its solution to fix everything it conceded.
4. **Judge.** The skill's `jev-juiz` runner sends the match to an **external decision model**
   (TypeSafe SystemOne): each criterion a 0-10 choice against
   [the rubric](skills/arena-zcode/rubric.md) - correctness 30, completeness 25, robustness 20,
   specificity 15, clarity 10 - plus a fatal flag, an adjudication of every attack
   (FIXED/REBUTTED/STANDING) and a winner pick. The judge never sees the cards. `bracket.py`
   does the arithmetic: the higher total goes through, a solution with a verified fatal flaw
   cannot beat one without, and the scores beat the judge's own pick if they disagree. The
   loser is out.
5. **Repeat.** Survivors carry their revised solutions into the next round. An odd number means
   one bye, never to the same agent twice while anyone else is waiting for one.
6. **Result.** One solution left. You get it, the attacks it survived, its card and the round
   count. If you started from an answer you rejected, a final blind judge compares the winner with
   it and the skill tells you the score, even when the old answer wins.

The whole tournament lives in one JSON file, managed by `bracket.py`. The main session only runs
the loop and never reads the hundreds of solution files: every sub-agent writes its work to disk
and replies with one line. If the conversation gets compacted halfway through, `bracket.py next`
picks it up from the file.

## What it costs

The skill is free. The tokens are yours.

| agents | rounds | sub-agent calls |
| --- | --- | --- |
| 16, the default | 4 | 91 |
| 8, `--quick` | 3 | 43 |
| 32 | 5 | 187 |
| 100, `--full` | 7 | 595 |

Judges are roughly 18% of the calls when they run as agents; on the `jev-juiz` runner they are
single API requests (about 10k input tokens and well under a cent each, output is free). `python skills/arena-zcode/bracket.py plan --agents N` prints the numbers
any time.

## The tool

`bracket.py` is standard-library Python. It is the reason the orchestrator never loses track.
`python skills/arena-zcode/bracket.py --help` (and `<command> --help` for each subcommand) is the
living reference for every flag.

```bash
python skills/arena-zcode/bracket.py plan --agents 16   # rounds, calls, waves. Writes nothing
python skills/arena-zcode/bracket.py init --agents 16 --seed 7 --task-file task.md
python skills/arena-zcode/bracket.py next               # what to do now, with the exact command
python skills/arena-zcode/bracket.py status             # alive and eliminated, per round
python skills/arena-zcode/bracket.py winner             # the survivor and how it got there
```

## The judge runner

`skills/arena-zcode/scripts/jev-juiz.mjs` is the external judge: one Node call per match, cents
each, no host provider involved. `node skills/arena-zcode/scripts/jev-juiz.mjs --help` is the
living reference. The commands you will actually use:

```bash
node skills/arena-zcode/scripts/jev-juiz.mjs --check-key      # live one-question ping, before any spend
node skills/arena-zcode/scripts/jev-juiz.mjs --calibrate      # blind weak-vs-clean pair, both calls must pass
node skills/arena-zcode/scripts/jev-juiz.mjs --size-report <brief>   # payload estimate vs the cap, no API call
node skills/arena-zcode/scripts/jev-juiz.mjs <judge-brief>    # judge one match (the orchestrator does this)
```

Exit codes are a contract: `0` success; `2` usage; `3` deterministic (size gate, HTTP 4xx) - fix
the input, never retry as-is; `4` key problem (401/403) - fix the key; `5` transient (5xx, network,
timeout) - fresh retry, up to three; `6` calibration not confirmed; `7` calibration inverted - stop.
`JUDGE_CAP_OVERRIDE=<N>` raises the payload gate as a recorded decision.

The tests run a full 100-agent tournament through the command line with random winners and check
it ends with exactly one survivor, plus the dealer's guarantees and every phase with stand-in
sub-agents:

```bash
python -m unittest discover -s tests -v
```

## The fine print

- **"16 versions of the model" means 16 sub-agents of one worker model.** What makes them different
  is the card. The judge is deliberately from another lane, so the ruler is not the same hand that
  is competing.
- **A competitor is its card plus its solution file.** Sub-agents remember nothing between calls:
  round 3's attacker is a fresh sub-agent handed the same card and the latest solution.
- **"The best answer" means the one that survived every match.** What you get is the strongest
  answer this tournament found, not a proof that it is right. That is why it shows you the attacks
  it survived, and why it tells you straight when the answer you rejected scored higher.
- **Sub-agents cannot see your chat.** The skill writes a standalone task file, and that file is
  all the competitors ever know. If a requirement never made it into the file, all of them miss
  it. It is at `.arena/<run>/task.md` if you want to check.
- **It never edits your project.** Code changes come back as a diff or as full files inside the
  winning answer. Applying them is your call, and the skill asks.
- **The same seed gives the same cards and the same bracket.** Not the same answers. The model is
  not deterministic.
- **It does not fix a bad task.** Vague task in, 16 flavours of vague out.

## Files

```
skills/arena-zcode/SKILL.md            the orchestration steps, lanes and every sub-agent brief
skills/arena-zcode/bracket.py          the tournament state machine, standard library only
skills/arena-zcode/strategies.json     15 reasoning modes, 12 workflows, 12 strategies. Edit freely
skills/arena-zcode/rubric.md           the five criteria every judge scores on
skills/arena-zcode/agents/arena-flash.md      worker lane: competitors, attackers, defenders
skills/arena-zcode/agents/arena-jev-juiz.md   dormant fallback judge lane (agent-dispatched); the
                                              active judge is the jev-juiz.mjs runner above
skills/arena-zcode/agents/arena-juiz-pro.md   judge lane for --judge-pro: session model
skills/arena-zcode/scripts/jev-juiz.mjs         judge runner: external decision model, equal rulers,
                                                 five-way adjudication, self-found probe, derived
                                                 robustness, size gate, failure classification,
                                                 --check-key and --calibrate before spend
skills/arena-zcode/scripts/fixtures/             calibration pair (task, weak, clean)
skills/arena-zcode/scripts/deploy.ps1            install into ~/.zcode (skill link + agent files,
                                                 -Lane/-Model emits extra worker lanes)
tests/test_bracket.py                  the tests (ARENA_SKILL_DIR env picks the copy under test)
docs/PROMPTS.md                        real use cases, ready to paste (the catalogue)
docs/ORIGINAL-README.md                the README of the project that inspired this one
```

## Credit

The tournament design and the bracket engine were adapted from
[arena-skill](https://github.com/Jakeschincariol/arena-skill) by Jake Schincariol (MIT), which
inspired this project. The original README is preserved at [docs/ORIGINAL-README.md](docs/ORIGINAL-README.md).

## License

MIT. Take it, change it, ship it.
