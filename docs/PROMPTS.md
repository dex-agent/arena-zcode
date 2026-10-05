# arena-zcode: real use cases, ready to paste

🌐 **English** | [Português (Brasil)](PROMPTS.pt-BR.md) | [Español](PROMPTS.es.md) | [中文](PROMPTS.zh-CN.md)

Every case below follows the same shape: when to use it, the exact prompt, what you get back, and
what it costs. Prompts are in English but the models handle any language: write yours. Cost tiers:
`--quick` is 8 agents (43 calls), the default is 16 (91 calls), `--full` is 100 (595 calls, think
twice). Judges are cents either way.

## How do I make it fight a bad answer I already got?

When the model already answered badly and retries are going nowhere.

```
$arena-zcode
```

Bare invocation: your last request becomes the task and the answer you did not like becomes the
baseline to beat. At the end, a blind final judge compares the champion with that old answer and
tells you the score straight - even if the old answer wins.

## How do I get a better headline, email or release note?

Short copy, everyday stakes: use the cheap tier.

```
$arena-zcode --quick write the headline for our pricing page; audience is a CFO, tone dry, max 8 words
$arena-zcode --quick release notes for this change set, for our internal changelog, plain language
$arena-zcode --quick cold email to a maintainer asking to try our tool; 120 words max, no buzzwords
```

## How do I fix a bug or a flaky test?

The arena never touches your files: solutions come back as diffs you choose to apply.

```
$arena-zcode --agents 16 fix the flaky test tests/test_api.py::test_retry; it fails ~1 in 5 runs on CI
$arena-zcode find the root cause of the memory leak in worker/pool.py and propose the fix as a diff
```

## How do I choose between approaches?

N options in, one survivor out - each competitor argues one approach through its own strategy card.

```
$arena-zcode --agents 16 we need durable job storage: Postgres, SQLite or Redis for a 3-node queue service; pick one and defend it against the other two
$arena-zcode --quick should our CLI use subcommands or verb flags? decide and justify
```

## How do I plan something with real constraints?

Plans are answers too - attack/defend/judge works on them exactly the same.

```
$arena-zcode --judge-pro plan my launch week; 6 hours a day, solo, landing page + docs + 3 demos due Friday
$arena-zcode --quick migration plan from Express to Fastify with zero downtime, service is 40 endpoints
```

## How do I battle MY OWN design against fresh ideas? (the crown case)

You already have a design (or a doc, or a policy) and want it stress-tested by alternatives. This
is the strongest move in the catalogue - and it is exactly how arena-zcode v2 was designed.

1. Write the challenge to a file, self-contained (context, constraints, deliverable, priorities).
2. Write your current design to a second file, as an answer to that challenge.
3. Point the arena at them:

```
$arena-zcode --quick --seed 42 --agents 8 architect the tournament skill described in .arena/task.md
```

and tell the orchestrator (in chat) that `.arena/baseline.md` is your design to beat, so it inits
with `--baseline-file`. Competitors read the challenge, study any files it points to, and design
their own; the blind final judge then scores the champion against your design - and reports it
even when your design wins.

A proven task file for this shape: state the challenge, list hard constraints, order the goals by
priority, define the deliverable (what an engineer can implement without asking questions), and
point at the files to read. A proven baseline: your design written as that same deliverable.

## How do I generate debugging hypotheses?

When you do not even know what is wrong yet.

```
$arena-zcode --quick generate and rank root-cause hypotheses for: production 500s spike every day at 09:00 for 11 minutes, only on the login route; here are the graphs and the deploy log paths: ...
```

## How do I name things?

Naming is a tournament sport: short, judged, cheap.

```
$arena-zcode --quick name our open-source tournament-of-agents skill; must read well in a shell command, .com-domainable, not trademarked
```

## How do I document or explain something hard?

```
$arena-zcode --quick explain our consensus protocol to a new backend engineer, 15 lines max, one diagram in words
```

## What do all the flags do, again?

```
--quick          8 competitors (43 sub-agent calls)
--agents N       any N from 2 to 2160 (distinct strategy cards)
--full           100 competitors (595 calls) - the answer that matters
--judge-pro      judges run on the session model (matches only; the final stays external)
--seed S         same cards and same bracket as a previous seeded run
--wave W         sub-agents per wave (default 5)
```

Living reference: `python skills/arena-zcode/bracket.py --help` and
`node skills/arena-zcode/scripts/jev-juiz.mjs --help`.
