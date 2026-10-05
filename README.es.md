# arena-zcode

🌐 [English](README.md) | [Português (Brasil)](README.pt-BR.md) | **Español** | [中文](README.zh-CN.md)

Cuando el modelo insiste en darte respuestas malas, haz que 16 versiones de él luchen a muerte.
Una skill de ZCode. Gratis, MIT, sin clave de API, nada que conectar - y los jueces ni siquiera
son el mismo modelo que los competidores.

**Empieza rápido:** la [instalación de un pegado](#instalación) deja todo en tu máquina con un
solo mensaje, y [docs/PROMPTS.es.md](docs/PROMPTS.es.md) es un catálogo de casos de uso reales,
listos para copiar.

## Qué hace diferente a este del arena que lo inspiró

- **Workers en un carril rápido, jueces en otro.** Competidores, atacantes y defensores corren en
  un modelo flash rápido (`arena-flash`); cada juez y la verificación final corren en un modelo de
  decisión externo, por el runner propio de la skill (`jev-juiz`, API TypeSafe SystemOne): cada
  decisión de juicio es una pregunta estructurada contra la misma regla escrita - reglas iguales,
  sin autopreferencia por la familia de modelo que compite, centavos por partido, cero dependencia
  de los proveedores del host. `--judge-pro` pone los jueces en el modelo de la sesión.
- **Cero contexto de la casa en los workers.** Cada archivo de agente declara `injectAgentsMd:
  false`: sin AGENTS.md, sin memoria, sin boilerplate. El brief es el mundo entero del sub-agente.
  Eso mantiene a los 16 competidores realmente diferentes y la cuenta de tokens bajo control.
- **Valores por defecto sensatos.** 16 competidores, olas de 5. `--quick` para 8, `--full` para
  los 100 completos.
- **Ningún cambio silencioso de modelo.** Si el carril del juez falla, falla alto: el partido se
  detiene y tú decides. El diseño original del torneo - cartas, ataque/defensa/juicio, el motor de
  llaves y el estado reanudable - viene preservado del proyecto que inspiró este (ver Créditos).

## Instalación

### La instalación de un pegado (recomendada)

Pega esto en ZCode, en la carpeta donde quieras el repo:

```
Instala la skill arena-zcode desde https://github.com/<tu>/arena-zcode:
1. haz git clone del repo en una carpeta temporal
2. ejecuta powershell -NoProfile -ExecutionPolicy Bypass -File <repo>/skills/arena-zcode/scripts/deploy.ps1
3. confirma que ~/.zcode/skills/arena-zcode/SKILL.md existe y que los tres archivos de carril arena-*.md están en ~/.zcode/agents/
4. los archivos de carril traen ids de modelo de ejemplo (YOUR-FAST-FLASH-MODEL-ID): ayúdame a configurar el carril de worker con un modelo rápido de mi catálogo de proveedores, y recuérdame abrir una sesión NUEVA
5. después muéstrame tres casos de uso listos para pegar de docs/PROMPTS.es.md
```

¿Ya clonaste el repo localmente? Los mismos pasos, sin el clone:

```
Instala la skill arena-zcode desde esta carpeta:
1. ejecuta powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1
2. confirma que ~/.zcode/skills/arena-zcode/SKILL.md existe y que los tres archivos de carril arena-*.md están en ~/.zcode/agents/
3. ayúdame a configurar el id de modelo del carril de worker (viene como YOUR-FAST-FLASH-MODEL-ID) con un modelo rápido de mi catálogo
4. recuérdame que la skill carga en una sesión NUEVA y muéstrame tres casos de uso de docs/PROMPTS.es.md
```

### El camino manual

Requiere ZCode con la herramienta Agent, Python 3.8 o más nuevo y Node para el runner de juez.
Nada que instalar con pip o npm. El carril de juez necesita la variable de entorno
`TYPESAFE_API_KEY` (TypeSafe SystemOne); sin ella, usa `--judge-pro`.

```bash
git clone <este repo>
cd arena-zcode
powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1
```

El script enlaza `skills/arena-zcode` en `~/.zcode/skills/` y copia las tres definiciones de
agente de la propia carpeta `agents/` de la skill hacia `~/.zcode/agents/`. La carpeta de la skill
es autocontenida: SKILL.md, el motor de llaves, la regla, las estrategias, los carriles de agente
y el script de deploy viajan juntos; copiar esa carpeta es copiar la skill entera. Los archivos de
agente no hacen hot-reload: abre una **sesión nueva de ZCode** antes de usar. Las líneas `model:`
de las definiciones son PLACEHOLDERS (`YOUR-FAST-FLASH-MODEL-ID`, `YOUR-PROVIDER-ID/...`):
edítalas a ids de modelos de tu propio catálogo de proveedores de ZCode antes de desplegar - el
carril de worker quiere un modelo rápido, el carril de juez dormido quiere un modelo de familia
distinta a los workers.

Para desinstalar: borra `~/.zcode/skills/arena-zcode` y los archivos `arena-*.md` en
`~/.zcode/agents/`.

## Uso

```
$arena-zcode
$arena-zcode --quick escribe el titular de nuestra página de precios
$arena-zcode --agents 32 arregla el test inestable en tests/test_api.py
$arena-zcode --judge-pro planifica mi semana de lanzamiento, tengo 6 horas al día
$arena-zcode --seed 7 mismas cartas y misma llave que la ejecución anterior con seed
```

Solo, `$arena-zcode` toma tu última petición como tarea y la respuesta que no te gustó como la
retadora. El modelo también puede activarlo sin la tag, cuando digas algo como "qué respuesta
mala, ponlos a competir" - y entonces pregunta antes de gastar nada.

| flag | qué hace |
| --- | --- |
| `--agents N` | N competidores. Por defecto 16. |
| `--quick` | 8 competidores. El barato del día a día. |
| `--full` | 100 competidores. El torneo a escala completa; caro. |
| `--judge-pro` | jueces y verificación final corren en el modelo de la sesión en vez del juez externo. |
| `--seed S` | Misma seed, mismas cartas y misma llave. Por defecto aleatoria, y registrada. |
| `--wave W` | Sub-agentes por ola. Por defecto 5. Súbelo solo tras medir cuántos ejecuta tu host a la vez. |

## Cómo funciona

1. **Spawn.** N sub-agentes, una llamada Agent cada uno. Todos reciben el mismo texto de tarea,
   byte a byte (un test lo comprueba), más una carta de estrategia. Son 15 modos de razonamiento,
   12 workflows y 12 estrategias: 2.160 cartas diferentes, repartidas sin repetición.
2. **Ataque.** Las soluciones se emparejan, y el emparejamiento evita enfrentar dos agentes con el
   mismo modo de razonamiento. Cada lado ataca la solución del otro: qué está mal, qué requisito
   faltó, la entrada exacta que la rompe. Hasta 7 ataques, etiquetados FATAL, MAJOR o MINOR.
3. **Defensa.** Cada lado responde a cada ataque recibido, concediendo o refutando con evidencia,
   y reescribe su solución corrigiendo todo lo concedido.
4. **Juicio.** El runner `jev-juiz` de la skill envía el partido a un **modelo de decisión
   externo** (TypeSafe SystemOne): cada criterio como choice 0-10 contra
   [la regla](skills/arena-zcode/rubric.md) - corrección 30, completitud 25, robustez 20,
   especificidad 15, claridad 10 - más la bandera fatal, la adjudicación de cada ataque en cinco
   niveles (FIXED / REBUTTED / STANDING_MINOR / STANDING_MAJOR / STANDING_FATAL), una sonda de
   defecto autoencontrado y la elección de ganador. El juez nunca ve las cartas. La robustez se
   deriva de esas mismas señales, así que fatal y robustez no se contradicen. `bracket.py` hace la
   aritmética: pasa el total ponderado más alto, una solución con falla fatal verificada no le
   gana a una sin ella, y las notas le ganan a la elección del juez si divergen. El perdedor sale.
5. **Repetición.** Los sobrevivientes llevan sus soluciones revisadas a la ronda siguiente. Número
   impar da un bye, nunca dos veces al mismo agente mientras otro con menos byes espera.
6. **Resultado.** Queda una solución. Recibes ella, los ataques que sobrevivió, su carta y la
   cuenta de rondas. Si partiste de una respuesta rechazada, un juez final ciego compara al
   campeón con ella e informa el marcador, incluso cuando la respuesta vieja gana.

El torneo entero vive en un JSON, gestionado por `bracket.py`. La sesión principal solo ejecuta el
loop y nunca lee los cientos de archivos de solución: cada sub-agente escribe su trabajo a disco y
responde una línea. Si la conversación se compacta a mitad, `bracket.py next` retoma del archivo.

## Cuánto cuesta

La skill es gratis. Los tokens son tuyos.

| agentes | rondas | llamadas de sub-agente |
| --- | --- | --- |
| 16, el defecto | 4 | 91 |
| 8, `--quick` | 3 | 43 |
| 32 | 5 | 187 |
| 100, `--full` | 7 | 595 |

Los jueces son cerca del 18% de las llamadas cuando corren como agentes; en el runner `jev-juiz`
son llamadas únicas de API (unos 10k tokens de entrada y bastante menos de un centavo cada una,
salida gratis).

## La herramienta

`bracket.py` es Python solo de la biblioteca estándar. Es la razón por la que el orquestador nunca
pierde el hilo. `python skills/arena-zcode/bracket.py --help` (y `<comando> --help` de cada
subcomando) es la referencia viva de cada flag.

```bash
python skills/arena-zcode/bracket.py plan --agents 16   # rondas, llamadas, olas. No escribe nada
python skills/arena-zcode/bracket.py init --agents 16 --seed 7 --task-file task.md
python skills/arena-zcode/bracket.py next               # qué hacer ahora, con el comando exacto
python skills/arena-zcode/bracket.py status             # vivos y eliminados, por ronda
python skills/arena-zcode/bracket.py winner             # el sobreviviente y cómo llegó ahí
```

## El runner de juez

`skills/arena-zcode/scripts/jev-juiz.mjs` es el juez externo: una llamada Node por partido,
centavos cada una, sin proveedor del host en el camino.
Qué es ese juez, **de dónde viene la `TYPESAFE_API_KEY`** (console.typesafe.ai/keys), cuánto cuesta y cómo funciona todo el protocolo de preguntas está en [docs/JUDGE.md](docs/JUDGE.md) - escrito para quien no tiene nada del contexto original.
`node skills/arena-zcode/scripts/jev-juiz.mjs --help` es la referencia viva. Los comandos que de
verdad vas a usar:

```bash
node skills/arena-zcode/scripts/jev-juiz.mjs --check-key      # ping vivo de una pregunta, antes de gastar
node skills/arena-zcode/scripts/jev-juiz.mjs --calibrate      # par ciego débil-vs-limpio, ambas llamadas deben pasar
node skills/arena-zcode/scripts/jev-juiz.mjs --size-report <brief>   # estimación de payload vs el techo, sin llamada
node skills/arena-zcode/scripts/jev-juiz.mjs <judge-brief>    # juzgar un partido (el orquestador hace esto)
```

Los exit codes son contrato: `0` éxito; `2` uso; `3` determinista (techo de tamaño, HTTP 4xx) -
corrige la entrada, nunca reintentes igual; `4` problema de clave (401/403) - arregla la clave;
`5` transitorio (5xx, red, timeout) - reintento fresco, hasta tres; `6` calibración no
confirmada; `7` calibración invertida - para. `JUDGE_CAP_OVERRIDE=<N>` sube el techo de payload
como decisión registrada.

## La letra pequeña

- **"16 versiones del modelo" son 16 sub-agentes de un modelo worker.** Lo que los diferencia es
  la carta. El juez es deliberadamente de otro carril, así que la regla no es la misma mano que
  compite.
- **"Un competidor es su carta más su archivo de solución."** Los sub-agentes no recuerdan nada
  entre llamadas: el atacante de la ronda 3 es un sub-agente nuevo con la misma carta y la
  solución más reciente.
- **"La mejor respuesta" es la que sobrevivió todos los partidos.** Lo que recibes es la respuesta
  más fuerte que este torneo encontró, no una prueba de que es correcta. Por eso te muestra los
  ataques que sobrevivió, y por eso te cuenta en la cara cuando la respuesta que rechazaste puntuó
  más alto.
- **Los sub-agentes no ven tu chat.** La skill escribe un archivo de tarea autosuficiente, y ese
  archivo es todo lo que los competidores conocen. Si un requisito no entró al archivo, todos lo
  extrañan. Está en `.arena/<run>/task.md` si quieres comprobarlo.
- **Nunca edita tu proyecto.** Los cambios de código vuelven como diff o archivos completos dentro
  de la respuesta ganadora. Aplicarlos es decisión tuya, y la skill pregunta.
- **Misma seed, mismas cartas y misma llave.** No las mismas respuestas. El modelo no es
  determinístico.
- **No arregla una tarea mala.** Tarea vaga entra, 16 sabores de vago salen.

## Archivos

```
skills/arena-zcode/SKILL.md            los pasos de orquestación, carriles y cada brief de sub-agente
skills/arena-zcode/bracket.py          la máquina de estados del torneo, solo biblioteca estándar
skills/arena-zcode/strategies.json     15 modos de razonamiento, 12 workflows, 12 estrategias. Edita libremente
skills/arena-zcode/rubric.md           los cinco criterios que cada juez puntúa
skills/arena-zcode/agents/arena-flash.md      carril de worker: competidores, atacantes, defensores
skills/arena-zcode/agents/arena-jev-juiz.md   carril de juez dormido (por agente); la vía activa es el runner de arriba
skills/arena-zcode/agents/arena-juiz-pro.md   carril de juez para --judge-pro: modelo de la sesión
skills/arena-zcode/scripts/jev-juiz.mjs       runner del juez: modelo de decisión externo, reglas iguales,
                                              adjudicación en 5 niveles, sonda autoencontrada, robustez
                                              derivada, techo de tamaño, clasificación de fallos,
                                              --check-key y --calibrate antes de gastar
skills/arena-zcode/scripts/fixtures/          par de calibración (tarea, débil, limpia)
skills/arena-zcode/scripts/deploy.ps1         instala en ~/.zcode (link de la skill + archivos de agente,
                                              -Lane/-Model emite carriles extra de worker)
tests/test_bracket.py                  los tests (la env ARENA_SKILL_DIR elige la copia probada)
docs/PROMPTS.md                        casos de uso reales, listos para pegar (el catálogo)
docs/ORIGINAL-README.md                el README del proyecto que inspiró este
```

Traducciones de este README: [English](README.md) | [Português (Brasil)](README.pt-BR.md) | [中文](README.zh-CN.md)

## Créditos

El diseño del torneo y el motor de llaves fueron adaptados del
[arena-skill](https://github.com/Jakeschincariol/arena-skill) de Jake Schincariol (MIT), que
inspiró este proyecto. El README original está preservado en
[docs/ORIGINAL-README.md](docs/ORIGINAL-README.md).

## Licencia

MIT. Tómalo, cámbialo, publícalo.
