# Changelog

All notable changes to arena-zcode. Dates are YYYY-MM-DD.

## 2026-10-04 - v2: the champion's roadmap

The design itself was thrown into an 8-model tournament (seed 42, blind external final: the
competing design beat ours 82.5 to 47.5), and this version implements the winner's roadmap.

- Judge v2 (`scripts/jev-juiz.mjs`): five-way attack adjudication
  (FIXED / REBUTTED / STANDING_MINOR / STANDING_MAJOR / STANDING_FATAL) with severity graded by
  the judge (the attacker's label is never arithmetic input); self-found probe (worst unraised
  flaw); robustness DERIVED from the same signals (FATAL 2 / MAJOR 4 / MINOR 7 / none 10), so
  fatal and robustness cannot contradict; robustness capped at 7 for a side that received no
  attacks.
- Before any spend: `--check-key` (live ping) and `--calibrate` (blind weak-vs-clean fixtures,
  both calls must rank clean above weak and non-fatal; INVERTED stops the run).
- Payload size gate: estimated tokens (chars / 3.5) vs a 28k cap, `--size-report` to inspect,
  `JUDGE_CAP_OVERRIDE` to raise as a recorded decision. Deterministic refusals are never retried.
- Failure classification with exit-code contract: 0 ok, 2 usage, 3 deterministic (4xx, size),
  4 key (401/403), 5 transient (5xx/network), 6 calibration not confirmed, 7 inverted.
- `--help` for the runner; `Get-Help` comment help for deploy.ps1.
- bracket.py: tiebreak guard - a side that was never attacked cannot win the standing tiebreak
  (verdict field `attacked`; older verdicts keep the previous behaviour).
- Worker agent files carry a tools allowlist (Read/Grep/Glob/Write/Edit - no Bash, no MCP, no
  web): "never touches your project" is a capability, not a promise. deploy.ps1 `-Lane/-Model`
  emits extra worker lanes with the same safe list.
- Budgets stated in every brief: solution 18,000 / attacks 9,000 / defense 6,000 characters.
- The final check is ALWAYS the external judge; `--judge-pro` is matches-only (the session model
  never judges the baseline it produced).
- rubric.md documents the five-way scale, the derivation, the cap and the no-double-dip rule.
- Tests: defaults suite green (27/27), quick is 8, waves of 5 (100 agents = 127 waves).

## 2026-10-04 - v1: the port

- Fork of the tournament design that inspired this project (see Credit in README), adapted to
  ZCode: workers as agent files with `injectAgentsMd: false`, judge as a local runner on the
  TypeSafe SystemOne decision API (structured questions only; verdict assembled
  deterministically), bracket.py state machine preserved from upstream.
- Defaults sane for everyday use: 16 competitors (4 rounds, 91 calls), `--quick` 8, `--full` 100.
- Repo structured for open source: MIT LICENSE, README, tests parametrized by `ARENA_SKILL_DIR`,
  original README preserved under docs/.
- Proven in the field: 4-agent smoke run end to end (spawn, attack, defend, judge, champion) and
  an 8-model design battle with the blind final.

## 2026-10-04 - docs: one-paste install and the use-case catalogue

- README: "The one-paste install" - a single prompt to paste into ZCode that clones, deploys,
  sets the lane model and points at the use cases (remote and already-cloned variants).
- docs/PROMPTS.md: catalogue of real, battle-tested use cases ready to copy - including the
  crown case: battling your own design against fresh ideas with a baseline file, the exact
  recipe that produced arena-zcode v2.

## 2026-10-04 - docs: README and prompt catalogue in four languages

- README.pt-BR.md, README.es.md, README.zh-CN.md: full translations with a language selector
  on every README (English stays canonical).
- docs/PROMPTS.pt-BR.md, .es.md, .zh-CN.md: the use-case catalogue translated, including the
  crown case (battling your own design with a baseline file) and localized one-paste install
  prompts inside each translated README.
