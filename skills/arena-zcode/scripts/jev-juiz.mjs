// jev-juiz.mjs - decisor Sistema 1 da arena-zcode (componente jev-, funcao em
// portugues, systemone: jev). Julga partida OU final da arena pela API TypeSafe
// SystemOne. Le o brief que bracket.py escreveu, inlina os materiais no state e
// transforma cada decisao em pergunta estruturada. v3 (roadmap do campeao da
// batalha de design, run-20261004-191948-s42):
//   - adjudicacao em 5 niveis: FIXED / REBUTTED / STANDING_MINOR / STANDING_MAJOR
//     / STANDING_FATAL (a severidade e do juiz; o rotulo do atacante e citacao);
//   - pergunta self-found: o pior defeito que os atacantes nao apontaram;
//   - robustness DERIVADA dos mesmos sinais (FATAL 2 / MAJOR 4 / MINOR 7 / nenhum
//     10), cap 7 quando o lado nao recebeu ataque: contradicao score-adjudicacao
//     nao pode existir por construcao; fatal = noul OU self-found FATAL OU
//     STANDING_FATAL;
//   - veredito carrega "attacked" {id: bool} para o guarda do tiebreak no motor;
//   - gate de tamanho pre-flight em tokens estimados (chars/3.5, cap 28000,
//     --judge-cap-override N) e --size-report;
//   - falhas classificadas: 401/403 = chave (exit 4); 4xx = deterministica,
//     nao retentar (exit 3); 5xx/rede/timeout = transitoria (exit 5);
//   - --check-key (ping real antes de qualquer gasto) e --calibrate (par cego
//     fraco-vs-limpo, duas chamadas: PASS / NOT CONFIRMED / INVERTED).
// O veredito JSON e montado deterministicamente das respostas: nenhuma decisao
// fora do Jev, nenhum texto inventado.
// Uso: node jev-juiz.mjs <brief> [--parse-only]
//      node jev-juiz.mjs --check-key | --calibrate | --size-report <brief>
// Le TYPESAFE_API_KEY na ordem: env do processo -> registry Windows -> .env.
// NUNCA imprime a chave. Entrada ~$0.042/M tokens; saida gratuita.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const CRITERIA = ['correctness', 'completeness', 'specificity', 'robustness', 'clarity'];
const ASKED = ['correctness', 'completeness', 'specificity', 'clarity']; // robustness is derived
const CHARS_PER_TOKEN = 3.5;
const DEFAULT_CAP = 28000; // ~12.5% under the documented ~32k state+questions budget

const EXIT = { usage: 2, deterministic: 3, key: 4, transient: 5, calibNo: 6, calibInverted: 7 };

function loadKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  if (process.platform === 'win32') {
    const hives = ['HKCU\\Environment', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'];
    for (const hive of hives) {
      try {
        const out = execFileSync('reg', ['query', hive, '/v', 'TYPESAFE_API_KEY'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const line = out.split(/\r?\n/).find((l) => l.includes('TYPESAFE_API_KEY'));
        if (line) {
          const val = line.trim().split(/\s{2,}/).slice(2).join(' ').trim();
          if (val) return val;
        }
      } catch { /* escopo sem a chave: seguir para o proximo local */ }
    }
  }
  const here = dirname(fileURLToPath(import.meta.url));
  for (const envPath of [join(process.cwd(), '.env'), join(here, '..', '.env')]) {
    try {
      for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = /^([A-Za-z_]+)=(.*)$/.exec(line.trim());
        if (m && m[1] === 'TYPESAFE_API_KEY' && m[2].trim()) return m[2].trim();
      }
    } catch { /* arquivo ausente: seguir */ }
  }
  throw new Error('TYPESAFE_API_KEY nao encontrada (env, registry ou .env).');
}

function must(condition, message) { if (!condition) throw new Error(message); }

// bracket.py writes files in text mode, which means CRLF on Windows.
const readText = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

function parseBrief(briefPath, brief) {
  const g = (re, what) => {
    const m = re.exec(brief);
    must(m, `jev-juiz: nao achei ${what} no brief ${briefPath}`);
    return m[1].trim();
  };
  const taskBlock = brief.split('=== THE TASK (identical for every competitor) ===\n')[1];
  must(taskBlock, 'jev-juiz: bloco da tarefa ausente no brief');
  const task = taskBlock.split('\n=== END OF THE TASK ===')[0].trim();
  const out = {
    match: g(/^You are the judge of match (\S+),/m, 'id da partida'),
    first: g(/^Solution (\S+)$/m, 'id da primeira solucao'),
    rubricPath: g(/^Read the rubric first: (\S+)$/m, 'caminho da rubrica'),
    outPath: g(/^Write this JSON, and nothing else, to (\S+)$/m, 'caminho do veredito').replace(/:$/, ''),
    task,
  };
  const secondMatch = /^Solution (\S+)$/gm;
  let seen = null;
  let m;
  while ((m = secondMatch.exec(brief))) { if (m[1] !== out.first) { seen = m[1]; break; } }
  must(seen, 'jev-juiz: id da segunda solucao');
  out.second = seen;
  const paths = (id) => ({
    solution: g(new RegExp(`^Solution ${id}\\n- revised solution: (\\S+)$`, 'm'), `solucao revisada de ${id}`),
    attacks: g(new RegExp(`^Solution ${id}\\n- revised solution: \\S+\\n- attacks it received: (\\S+)$`, 'm'), `ataques de ${id}`),
    defense: g(new RegExp(`^Solution ${id}\\n- revised solution: \\S+\\n- attacks it received: \\S+\\n- its defense: (\\S+)$`, 'm'), `defesa de ${id}`),
  });
  out.materials = { [out.first]: paths(out.first), [out.second]: paths(out.second) };
  return out;
}

function parseFinal(briefPath, brief) {
  const g = (re, what) => {
    const m = re.exec(brief);
    must(m, `jev-juiz: nao achei ${what} no brief final ${briefPath}`);
    return m[1].trim();
  };
  const taskBlock = brief.split('=== THE TASK ===\n')[1];
  must(taskBlock, 'jev-juiz: bloco da tarefa ausente no brief final');
  return {
    xPath: g(/^Solution X: (\S+)$/m, 'solucao X').replace(/:$/, ''),
    yPath: g(/^Solution Y: (\S+)$/m, 'solucao Y').replace(/:$/, ''),
    rubricPath: g(/^Read the rubric first: (\S+)$/m, 'caminho da rubrica'),
    outPath: g(/^Write this JSON, and nothing else, to (\S+)$/m, 'caminho do veredito').replace(/:$/, ''),
    task: taskBlock.split('\n=== END OF THE TASK ===')[0].trim(),
  };
}

function attackTitles(attacksText) {
  if (!attacksText || /^NO OUTPUT/i.test(attacksText.trim())) return [];
  const titles = [];
  for (const m of attacksText.matchAll(/^ATTACK \d+ \[(FATAL|MAJOR|MINOR)\] (.+)$/gm)) {
    titles.push(`[${m[1]}] ${m[2].trim()}`);
  }
  return titles;
}

const scoreOptions = {};
for (let s = 0; s <= 10; s++) {
  scoreOptions[`s${s}`] = s <= 2 ? `${s}: rock bottom per the rubric anchor for this criterion`
    : s === 4 ? '4: the rubric anchor with a real error/gap'
    : s === 7 ? '7: minor slips that do not change the outcome'
    : s === 10 ? '10: nothing wrong after checking, per the rubric'
    : `${s}: between the anchors, per the rubric scale`;
}

const scoreQuestion = (owner, crit) => ({
  type: 'choice',
  instructions: `Score ${owner} on ${crit}, 0-10, using the ${crit} anchors in state.rubric. Judge the work, not the writing about the work.`,
  criteria: scoreOptions,
});

const fatalQuestion = (owner) => ({
  type: 'noul',
  instructions: `Does ${owner} have a VERIFIED fatal flaw: a flaw you can point to in state that makes it wrong or unusable for the task? Only real, verified flaws count.`,
});

const selfFoundQuestion = (owner) => ({
  type: 'choice',
  instructions: `What is the WORST flaw in ${owner} that the attackers did NOT raise (including anything a revision broke)? Judge it yourself, like a hostile expert.`,
  criteria: {
    NONE: 'No material flaw found beyond what the attacks covered.',
    MINOR: 'A minor unraised flaw.',
    MAJOR: 'A real unraised gap.',
    FATAL: 'An unraised flaw that makes it wrong or unusable for the task.',
  },
});

const adjudicationQuestion = (owner, i, title) => ({
  type: 'choice',
  instructions: `Adjudicate attack ${i + 1} against ${owner} (title: ${title}). Read the revised solution and the defense in state.solutions. Grade the severity YOURSELF if it stands: the attacker's own label is a quoted claim, never input.`,
  criteria: {
    FIXED: 'The revised solution actually fixes the attack.',
    REBUTTED: 'The defense shows, with evidence, that the attack was wrong.',
    STANDING_MINOR: 'The attack still holds, with minor impact.',
    STANDING_MAJOR: 'The attack still holds, as a real gap.',
    STANDING_FATAL: 'The attack still holds and makes the solution wrong or unusable.',
  },
});

function classifyHttp(status) {
  if (status === 401 || status === 403) return EXIT.key;
  if (status >= 400 && status < 500) return EXIT.deterministic;
  return EXIT.transient;
}

async function askJev(state, questions, { allowOverCap = false } = {}) {
  const body = JSON.stringify({ state, model: MODEL, questions });
  const override = Number(process.env.JUDGE_CAP_OVERRIDE || 0);
  const cap = override > 0 ? override : DEFAULT_CAP;
  const estTokens = Math.ceil(body.length / CHARS_PER_TOKEN);
  if (!allowOverCap && estTokens > cap) {
    console.error(`SIZE GATE: payload ~${estTokens} est tokens exceeds cap ${cap} (body ${body.length} chars / ${CHARS_PER_TOKEN}). Deterministic refusal: raise budgets/judge-cap-override together or lower budgets. Nothing was sent.`);
    process.exit(EXIT.deterministic);
  }
  const key = loadKey();
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    console.error(`TRANSIENT: network/timeout (${String(err).slice(0, 160)}). Fresh retry allowed.`);
    process.exit(EXIT.transient);
  }
  const text = await res.text();
  if (res.status !== 200) {
    const code = classifyHttp(res.status);
    console.error(`${code === EXIT.key ? 'KEY PROBLEM' : code === EXIT.deterministic ? 'DETERMINISTIC' : 'TRANSIENT'}: HTTP ${res.status}: ${text.slice(0, 200)}`);
    process.exit(code);
  }
  let data;
  try { data = JSON.parse(text); } catch { console.error('DETERMINISTIC: resposta nao-JSON.'); process.exit(EXIT.deterministic); }
  return { answers: data.answers, ms: Date.now() - t0, usage: data.usage, estTokens };
}

const total = (s) => (s.correctness * 30 + s.completeness * 25 + s.specificity * 15 + s.robustness * 20 + s.clarity * 10) / 10;

// worst standing severity -> rubric robustness anchor
function deriveRobustness({ standingFatal, standingMajor, standingMinor, selfFound }) {
  if (standingFatal) return 2;
  if (standingMajor) return 4;
  if (standingMinor || selfFound === 'MAJOR') return 7;
  return 10;
}

const argv = process.argv.slice(2);

const HELP = `jev-juiz.mjs - arena-zcode judge runner (TypeSafe SystemOne, systemone: jev)

Usage:
  node jev-juiz.mjs <judge-brief.md>              judge one match (writes the verdict, prints one line)
  node jev-juiz.mjs <final-brief.md>              judge the blind final check (champion vs baseline)
  node jev-juiz.mjs <brief> --parse-only          parse the brief and print what was extracted; no API, no write
  node jev-juiz.mjs <brief> --size-report         print the estimated payload size vs the cap; no API, no write
  node jev-juiz.mjs --check-key                   one-question live ping of the key/API before any spend
  node jev-juiz.mjs --calibrate                   two blind calls on the fixtures (weak vs clean); both must pass
  node jev-juiz.mjs --help | -h                   this help

Environment:
  TYPESAFE_API_KEY   env -> Windows registry (HKCU/HKLM) -> .env (never printed)
  JUDGE_CAP_OVERRIDE N   raise the payload size gate to N estimated tokens (recorded decision)

Exit codes:
  0  success (match judged, final judged, key ok, calibration pass)
  2  usage error
  3  deterministic failure: size-gate refusal or HTTP 4xx (except 401/403) - do NOT retry as-is
  4  key problem: HTTP 401/403 - fix the key, do not retry
  5  transient failure: HTTP 5xx, network, timeout - fresh retry allowed (up to three)
  6  calibration NOT CONFIRMED (one of the two calls failed) - rerun once or record skipping
  7  calibration INVERTED (weak ranked above clean twice) - stop, do not spend`;

const modeHelp = argv.includes('--help') || argv.includes('-h');
if (modeHelp) { console.log(HELP); process.exitCode = 0; }
const modeKey = !modeHelp && argv.includes('--check-key');
const modeCal = !modeHelp && argv.includes('--calibrate');

async function checkKey() {
  const { answers, ms } = await askJev(
    { probe: 'connectivity check, single trivial question', one: 'true' },
    { ok: { type: 'noul', instructions: 'Is the statement in state.one true?' } },
  );
  console.log(`KEY OK (${ms}ms, answer ${answers.ok?.noul})`);
}

async function calibrate() {
  const here = dirname(fileURLToPath(import.meta.url));
  const task = readText(join(here, 'fixtures', 'calib-task.md'));
  const weak = readText(join(here, 'fixtures', 'calib-weak.md'));
  const clean = readText(join(here, 'fixtures', 'calib-clean.md'));
  const rubric = readText(join(here, '..', 'rubric.md'));
  const results = [];
  for (let call = 1; call <= 2; call++) {
    const swap = call === 2;
    const a = swap ? clean : weak;   // A/B order flips between the two calls
    const b = swap ? weak : clean;
    const state = {
      task, rubric,
      judge_rules: ['Blind calibration pair: one solution is deliberately wrong, one is correct. Judge only what is in state.'],
      solution_A: a, solution_B: b,
    };
    const questions = {
      score_A_correctness: scoreQuestion('solution A', 'correctness'),
      score_B_correctness: scoreQuestion('solution B', 'correctness'),
      fatal_A: fatalQuestion('solution A'),
      fatal_B: fatalQuestion('solution B'),
    };
    const { answers } = await askJev(state, questions, { allowOverCap: true });
    const ca = Number(String(answers.score_A_correctness?.choice || 's0').slice(1));
    const cb = Number(String(answers.score_B_correctness?.choice || 's0').slice(1));
    const fa = (answers.fatal_A?.noul ?? 0) >= 0.5;
    const fb = (answers.fatal_B?.noul ?? 0) >= 0.5;
    // swap=false: A=weak, B=clean -> clean is cb. swap=true: A=clean, B=weak -> clean is ca.
    const cleanScore = swap ? ca : cb;
    const weakScore = swap ? cb : ca;
    const cleanFatal = swap ? fa : fb;
    results.push({ call, position_of_clean: swap ? 'A' : 'B', cleanScore, weakScore, cleanFatal });
  }
  const passes = results.filter((r) => r.cleanScore > r.weakScore && !r.cleanFatal);
  const inverted = results.every((r) => r.weakScore > r.cleanScore);
  console.log('CALIBRATION ' + JSON.stringify(results));
  if (inverted) { console.error('CALIBRATION INVERTED: weak ranked above clean in both calls. Stop; do not spend.'); process.exitCode = EXIT.calibInverted; return; }
  if (passes.length < 2) { console.error('CALIBRATION NOT CONFIRMED: rerun once with a fresh pair, or run with --skip recorded, or stop.'); process.exitCode = EXIT.calibNo; return; }
  console.log('CALIBRATION PASS');
}

if (modeKey) { await checkKey(); process.exitCode = 0; }
else if (modeCal) { await calibrate(); }

if (!modeHelp && !modeKey && !modeCal) {
const briefPath = argv.find((a) => !a.startsWith('--'));
must(briefPath, 'uso: node jev-juiz.mjs <brief> [--parse-only] | --check-key | --calibrate | --size-report <brief>');
const parseOnly = argv.includes('--parse-only');
const sizeOnly = argv.includes('--size-report');
const brief = readText(briefPath);
const isFinal = /^You are the final check in an arena\./.test(brief);

if (isFinal) {
  const b = parseFinal(briefPath, brief);
  if (parseOnly) { console.log(JSON.stringify({ mode: 'final', ...b }, null, 1)); process.exit(0); }
  const rubric = readText(b.rubricPath);
  const state = {
    task: b.task,
    rubric,
    judge_rules: [
      'Judge the work against the task and the rubric only.',
      'Attack both yourself like a hostile expert would; for robustness, judge how each holds up against those attacks.',
      'Length and confidence earn nothing.',
    ],
    solution_X: readText(b.xPath),
    solution_Y: readText(b.yPath),
  };
  const questions = {};
  for (const side of ['X', 'Y']) {
    for (const crit of CRITERIA) questions[`score_${side}_${crit}`] = scoreQuestion(`solution ${side}`, crit);
    questions[`fatal_${side}`] = fatalQuestion(`solution ${side}`);
  }
  questions.winner = {
    type: 'choice',
    instructions: 'Which solution wins? Higher weighted total per the rubric weights (correctness 30, completeness 25, robustness 20, specificity 15, clarity 10); a fatal solution cannot beat one that is not fatal.',
    criteria: {
      X: 'Solution X has the higher weighted total per the rubric, after the fatal rule.',
      Y: 'Solution Y has the higher weighted total per the rubric, after the fatal rule.',
    },
  };
  if (sizeOnly) {
    const body = JSON.stringify({ state, model: MODEL, questions });
    console.log(JSON.stringify({ mode: 'final', body_chars: body.length, est_tokens: Math.ceil(body.length / CHARS_PER_TOKEN), cap: DEFAULT_CAP }));
    process.exit(0);
  }
  const { answers, ms, usage, estTokens } = await askJev(state, questions);
  const scores = {};
  for (const side of ['X', 'Y']) {
    const s = {};
    for (const crit of CRITERIA) {
      const pick = answers[`score_${side}_${crit}`]?.choice;
      must(pick && /^s(10|[0-9])$/.test(pick), `jev-juiz: score ausente/invalido ${side}.${crit}`);
      s[crit] = Number(pick.slice(1));
    }
    s.fatal = (answers[`fatal_${side}`]?.noul ?? 0) >= 0.5;
    scores[side] = s;
  }
  const winnerPick = answers.winner?.choice;
  must(winnerPick === 'X' || winnerPick === 'Y', 'jev-juiz: winner ausente/invalido no final');
  const loser = winnerPick === 'X' ? 'Y' : 'X';
  const fixed = CRITERIA.filter((c) => scores[winnerPick][c] > scores[loser][c]).map((c) => `${c}: ${scores[winnerPick][c]} vs ${scores[loser][c]}`);
  if (scores[loser].fatal && !scores[winnerPick].fatal) fixed.push('loser carries a verified fatal flaw');
  const verdict = {
    scores, winner: winnerPick,
    reason: `External final judge (jev-juiz, SystemOne): ${winnerPick} over ${loser}; fatal X=${scores.X.fatal}, Y=${scores.Y.fatal}; totals X=${total(scores.X).toFixed(1)}, Y=${total(scores.Y).toFixed(1)}.`,
    fixed,
  };
  writeFileSync(b.outPath, JSON.stringify(verdict, null, 2) + '\n', 'utf8');
  console.log(`FINAL (jev pick) ${winnerPick} | totals X=${total(scores.X).toFixed(1)} Y=${total(scores.Y).toFixed(1)} | ${ms}ms, in=${usage?.input_tokens ?? '?'} tok, payload~${estTokens} est tok`);
  process.exitCode = 0;
}

const b = parseBrief(briefPath, brief);
if (parseOnly) { console.log(JSON.stringify({ mode: 'match', ...b }, null, 1)); process.exit(0); }
const rubric = readText(b.rubricPath);
const sol = {};
for (const id of [b.first, b.second]) {
  const mat = b.materials[id];
  const attacksText = readText(mat.attacks);
  sol[id] = {
    revised: readText(mat.solution),
    attacks_text: attacksText,
    defense: readText(mat.defense),
    attack_titles: attackTitles(attacksText),
    attacked: sol_attacked(attacksText),
  };
}
function sol_attacked(attacksText) {
  return !(!attacksText || /^NO OUTPUT/i.test(attacksText.trim()));
}

const state = {
  task: b.task,
  rubric,
  judge_rules: [
    'Judge the work against the task and the rubric only; strategy cards are unknown.',
    'For every attack, check the revised solution yourself and grade the severity if it stands: the attacker label is a quoted claim, never input.',
    'A defense that says fixed is not proof: verify in the revised text.',
    'Length and confidence earn nothing.',
  ],
  solutions: { [b.first]: sol[b.first], [b.second]: sol[b.second] },
};

const questions = {};
for (const id of [b.first, b.second]) {
  for (const crit of ASKED) questions[`score_${id}_${crit}`] = scoreQuestion(`solution ${id}`, crit);
  questions[`fatal_${id}`] = fatalQuestion(`solution ${id}`);
  questions[`selffound_${id}`] = selfFoundQuestion(`solution ${id}`);
  sol[id].attack_titles.forEach((title, i) => {
    questions[`adj_${id}_${i}`] = adjudicationQuestion(`solution ${id}`, i, title);
  });
}
questions.winner = {
  type: 'choice',
  instructions: 'Which solution wins this match? Higher weighted total per the rubric weights (correctness 30, completeness 25, robustness 20, specificity 15, clarity 10); a fatal solution cannot beat one that is not fatal; on a tie, fewer standing attacks wins.',
  criteria: {
    [b.first]: `Solution ${b.first} has the higher weighted total per the rubric (after the fatal and tie rules).`,
    [b.second]: `Solution ${b.second} has the higher weighted total per the rubric (after the fatal and tie rules).`,
  },
};

if (sizeOnly) {
  const body = JSON.stringify({ state, model: MODEL, questions });
  console.log(JSON.stringify({ mode: 'match', body_chars: body.length, est_tokens: Math.ceil(body.length / CHARS_PER_TOKEN), cap: DEFAULT_CAP, questions: Object.keys(questions).length }));
  process.exit(0);
}

const { answers, ms, usage, estTokens } = await askJev(state, questions);
const scores = {};
const standing = {};
const attackedOut = {};
for (const id of [b.first, b.second]) {
  const s = {};
  for (const crit of ASKED) {
    const pick = answers[`score_${id}_${crit}`]?.choice;
    must(pick && /^s(10|[0-9])$/.test(pick), `jev-juiz: resposta de score ausente/invalida para ${id}.${crit}`);
    s[crit] = Number(pick.slice(1));
  }
  const selfFound = answers[`selffound_${id}`]?.choice;
  must(selfFound && ['NONE', 'MINOR', 'MAJOR', 'FATAL'].includes(selfFound), `jev-juiz: self-found ausente/invalido para ${id}`);
  const st = [];
  let stFatal = false, stMajor = false, stMinor = false;
  sol[id].attack_titles.forEach((title, i) => {
    const adj = answers[`adj_${id}_${i}`]?.choice;
    must(adj && ['FIXED', 'REBUTTED', 'STANDING_MINOR', 'STANDING_MAJOR', 'STANDING_FATAL'].includes(adj), `jev-juiz: adjudicacao ausente/invalida ataque ${i + 1} de ${id}`);
    if (adj === 'STANDING_FATAL') { stFatal = true; st.push(`[FATAL] ${title}`); }
    else if (adj === 'STANDING_MAJOR') { stMajor = true; st.push(`[MAJOR] ${title}`); }
    else if (adj === 'STANDING_MINOR') { stMinor = true; st.push(`[MINOR] ${title}`); }
  });
  let robust = deriveRobustness({ standingFatal: stFatal, standingMajor: stMajor, standingMinor: stMinor, selfFound });
  if (!sol[id].attacked) robust = Math.min(robust, 7);   // no adversarial test happened: cap the criterion, never the total
  s.robustness = robust;
  s.fatal = ((answers[`fatal_${id}`]?.noul ?? 0) >= 0.5) || selfFound === 'FATAL' || stFatal;
  scores[id] = s;
  standing[id] = st;
  attackedOut[id] = sol[id].attacked;
}
const winnerPick = answers.winner?.choice;
must(winnerPick === b.first || winnerPick === b.second, 'jev-juiz: winner ausente/invalido');
const loser = winnerPick === b.first ? b.second : b.first;
const survived = sol[winnerPick].attack_titles
  .filter((title, i) => !String(answers[`adj_${winnerPick}_${i}`]?.choice || '').startsWith('STANDING'))
  .map((title) => title);

const verdict = {
  match: b.match,
  scores,
  winner: winnerPick,
  reason: `External judge (jev-juiz, SystemOne): ${winnerPick} over ${loser}; fatal ${b.first}=${scores[b.first].fatal}, ${b.second}=${scores[b.second].fatal}; standing ${b.first}=${standing[b.first].length}, ${b.second}=${standing[b.second].length}; robustness derived (worst standing/self-found: FATAL 2 / MAJOR 4 / MINOR 7 / none 10${attackedOut[b.first] && attackedOut[b.second] ? '' : '; capped at 7 for the side with no attacks'}).`,
  survived,
  standing,
  attacked: attackedOut,
};
writeFileSync(b.outPath, JSON.stringify(verdict, null, 2) + '\n', 'utf8');
console.log(`WINNER (jev pick) ${winnerPick} | totals ${b.first}=${total(scores[b.first]).toFixed(1)} ${b.second}=${total(scores[b.second]).toFixed(1)} | ${ms}ms, in=${usage?.input_tokens ?? '?'} tok, payload~${estTokens} est tok (bracket.py collect applies the rubric arithmetic)`);
process.exitCode = 0;
}
// hard process.exit() is avoided at the end of every success path: on Windows it
// races a libuv async handle (execFileSync for the key) and corrupts the exit code.
