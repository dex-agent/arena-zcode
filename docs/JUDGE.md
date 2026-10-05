# The external judge: what it is, where the key comes from, how it works

The judge lane of arena-zcode does not use your ZCode models. Every match is judged by one call
to `scripts/jev-juiz.mjs`, which talks to TypeSafe's SystemOne API with a decision model ("Jev").
This page is for someone who has none of the original development context: it explains what that
service is, how to get a key, and exactly how the runner turns a tournament match into structured
questions.

## What is SystemOne and why an external judge?

SystemOne is a decision API: you send a `state` (any JSON the decision needs) plus a set of typed
questions, and it returns typed answers. It does not generate free text, does not write code and
does not choose next actions - it answers questions about what is in front of it. That is exactly
the shape of judging: score this, is that flaw fatal, did this fix land, who won.

Two properties make it the right ruler for a tournament:

1. **Equal rulers.** The rubric is written, frozen and sent with every call; every match is judged
   by the same protocol against the same anchors.
2. **Independence.** The judge is not one of the model families that competed, so it has no
   self-preference for the style it saw in its own training. A tournament where the judge is the
   same model as the competitors measures conformity; this one measures the work.

## Getting a key (2 minutes)

1. Create an API key at [console.typesafe.ai/keys](https://console.typesafe.ai/keys).
2. Put it in the environment as `TYPESAFE_API_KEY`. The runner reads it in this order: process
   environment, Windows registry (user, then machine), a `.env` file in the working directory, a
   `.env` file next to the script. The key is never printed.
3. Verify before spending:

```bash
node skills/arena-zcode/scripts/jev-juiz.mjs --check-key
```

Reference documentation: [docs.typesafe.ai/api](https://docs.typesafe.ai/api). There is also a
playground at [console.typesafe.ai/playground](https://console.typesafe.ai/playground) if you want
to see question types by hand.

## What it costs

The published price at development time was USD 0.042 per 1M input tokens and USD 0.00 for
output: the model reads and decides, it does not write. A typical arena match sends roughly 10k
input tokens (task + rubric + two solutions + attacks + defenses), so a match costs a fraction of
a cent, and a 16-agent tournament (15 matches + calibration + final) stays well under a dime.
Every verdict line prints the measured input tokens so you never have to trust this paragraph.

## No key? The arena still runs

- `--judge-pro`: match judging runs on your session model via the `arena-juiz-pro` agent lane.
  The blind final check always stays on the external judge when a baseline exists (the session
  model must never grade the answer it produced), so without a key the final comparison is
  skipped or run with `--judge-pro` as an explicit, recorded exception.
- The dormant `agents/arena-jev-juiz.md` lane exists for hosts that prefer agent-dispatched
  judging on a SystemOne model configured as a provider.

## How the runner asks (the whole protocol)

One HTTP POST per match to the SystemOne endpoint with `{ state, model, questions }`:

- **state**: the task text, the frozen rubric text, the judging rules, and for each side the
  revised solution, the attacks it received and the defense it wrote. Nothing else - never the
  strategy cards.
- **questions**: one batch of typed questions. SystemOne has three question types; the runner
  uses two of them:
  - `choice`: the answer is one of the named options. Used for the four scored criteria
    (correctness, completeness, specificity, clarity) as 0-10 options whose descriptions restate
    the rubric anchors; for the self-found probe (NONE / MINOR / MAJOR / FATAL - the worst flaw
    the attackers did not raise); for each attack's adjudication on a five-way scale (FIXED /
    REBUTTED / STANDING_MINOR / STANDING_MAJOR / STANDING_FATAL - severity graded by the judge,
    the attacker's own label never enters the arithmetic); and for the winner.
  - `noul`: a yes-probability from 0 to 1. Used once per side for the fatal flag ("does this
    solution have a VERIFIED fatal flaw?"), thresholded at 0.5.

The verdict JSON is assembled deterministically from the answers - the runner writes no judgement
of its own, and no prose is generated anywhere. Robustness is not asked as a score at all: it is
derived from the same signals (a standing FATAL maps to 2, MAJOR to 4, MINOR to 7, none to 10,
capped at 7 for a side that received no attacks), which is why the fatal flag and the robustness
score can never contradict each other. `bracket.py collect` then applies the rubric arithmetic -
and if the judge's winner pick disagrees with the judge's own scores, the scores win and the
disagreement is recorded.

## Before the first spend, and when things fail

```bash
node skills/arena-zcode/scripts/jev-juiz.mjs --check-key     # live one-question ping
node skills/arena-zcode/scripts/jev-juiz.mjs --calibrate     # blind weak-vs-clean fixtures, twice
```

Calibration sends a deliberately wrong solution and a correct one, blind, in both orders; both
calls must rank the correct one higher and non-fatal. INVERTED (wrong one wins twice) means stop.
The runner also enforces a payload size gate (roughly 28k estimated tokens; `--size-report`
inspects it) and classifies failures by exit code - see `--help`. Nothing is ever retried
blindly and no model is ever swapped silently.

## Porting note

The endpoint (`https://api.typesafe.ai/v1/systemone`) and the model id (`jev-latest`) are two
constants at the top of `scripts/jev-juiz.mjs`. If you run a different SystemOne deployment or
model version, edit the constants: the protocol is the same.
