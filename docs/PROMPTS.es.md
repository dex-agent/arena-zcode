# arena-zcode: casos de uso reales, listos para pegar

🌐 [English](PROMPTS.md) | [Português (Brasil)](PROMPTS.pt-BR.md) | **Español** | [中文](PROMPTS.zh-CN.md)

Cada caso sigue la misma forma: cuándo usarlo, el prompt exacto, qué recibes de vuelta y cuánto
cuesta. Los prompts están en español, pero los modelos entienden cualquier idioma. Franjas de
costo: `--quick` son 8 agentes (43 llamadas), el defecto es 16 (91 llamadas), `--full` son 100
(595 llamadas, piénsalo dos veces). Los jueces cuestan centavos de todos modos.

## ¿Cómo hago pelear una respuesta mala que ya recibí?

Cuando el modelo ya respondió mal y repetir no lleva a nada.

```
$arena-zcode
```

Invocación limpia: tu última petición se vuelve la tarea y la respuesta que no te gustó se vuelve
la línea base a vencer. Al final, un juez final ciego compara al campeón con esa respuesta vieja y
te da el marcador sin adornos, aunque la vieja gane.

## ¿Cómo consigo un titular, email o release note mejor?

Texto corto, apuesta cotidiana: usa la franja barata.

```
$arena-zcode --quick escribe el titular de nuestra página de precios; el público es un CFO, tono seco, máx 8 palabras
$arena-zcode --quick release notes para este conjunto de cambios, para el changelog interno, lenguaje llano
$arena-zcode --quick email frío a un mantenedor proponiéndole probar nuestra herramienta; 120 palabras máx, sin buzzwords
```

## ¿Cómo arreglo un bug o un test inestable?

El arena nunca toca tus archivos: las soluciones vuelven como diffs que tú decides aplicar.

```
$arena-zcode --agents 16 arregla el test inestable tests/test_api.py::test_retry; falla ~1 de cada 5 runs en CI
$arena-zcode encuentra la causa raíz del memory leak en worker/pool.py y propone el fix como diff
```

## ¿Cómo elijo entre enfoques?

N opciones entran, una sobrevive: cada competidor defiende un enfoque con su propia carta.

```
$arena-zcode --agents 16 necesitamos almacenamiento duradero de jobs: Postgres, SQLite o Redis para un servicio de cola de 3 nodos; elige uno y defiéndelo contra los otros dos
$arena-zcode --quick ¿nuestro CLI usa subcomandos o verb flags? decide y justifica
```

## ¿Cómo planifico algo con restricciones reales?

Los planes también son respuestas: ataque/defensa/juicio funciona igual en ellos.

```
$arena-zcode --judge-pro planifica mi semana de lanzamiento; 6 horas al día, en solitario, landing page + docs + 3 demos para el viernes
$arena-zcode --quick plan de migración de Express a Fastify con cero downtime, el servicio tiene 40 endpoints
```

## ¿Cómo hago pelear MI PROPIO diseño contra ideas nuevas? (el caso corona)

Ya tienes un diseño (o documento, o política) y quieres estresarlo con alternativas. Es la jugada
más fuerte del catálogo - y es exactamente así se diseñó arena-zcode v2.

1. Escribe el desafío en un archivo, autosuficiente (contexto, restricciones, entregable,
   prioridades).
2. Escribe tu diseño actual en un segundo archivo, como respuesta a ese desafío.
3. Apunta el arena a ellos:

```
$arena-zcode --quick --seed 42 --agents 8 diseña la skill de torneo descrita en .arena/task.md
```

y dile al orquestador (en el chat) que `.arena/baseline.md` es tu diseño a vencer, para que haga
init con `--baseline-file`. Los competidores leen el desafío, estudian los archivos que este
señala y diseñan los suyos; el juez final ciego puntúa al campeón contra tu diseño - e informa
incluso cuando el tuyo gana.

Un task file probado para este formato: enuncia el desafío, lista restricciones duras, ordena los
objetivos por prioridad, define el entregable (lo que un ingeniero implementa sin hacer preguntas)
y señala los archivos a leer. Un baseline probado: tu diseño escrito como ese mismo entregable.

## ¿Cómo genero hipótesis de debugging?

Cuando ni siquiera sabes qué está mal todavía.

```
$arena-zcode --quick genera y rankea hipótesis de causa raíz para: pico de 500s en producción todos los días a las 09:00 durante 11 minutos, solo en la ruta de login; aquí están los gráficos y las rutas de los logs de deploy: ...
```

## ¿Cómo nombro cosas?

Nombrar es un deporte de torneo: corto, juzgado, barato.

```
$arena-zcode --quick nombra nuestra skill open-source de torneo de agentes; debe leerse bien en un comando de shell, tener dominio .com disponible y no ser marca registrada
```

## ¿Cómo documento o explico algo difícil?

```
$arena-zcode --quick explica nuestro protocolo de consenso a un ingeniero backend nuevo, 15 líneas máx, un diagrama en palabras
```

## ¿Qué hace cada flag, otra vez?

```
--quick          8 competidores (43 llamadas de sub-agente)
--agents N       cualquier N de 2 a 2160 (cartas distintas)
--full           100 competidores (595 llamadas) - la respuesta que importa
--judge-pro      jueces en el modelo de la sesión (solo partidos; la final sigue siendo externa)
--seed S         mismas cartas y misma llave que una ejecución anterior con seed
--wave W         sub-agentes por ola (defecto 5)
```

Referencia viva: `python skills/arena-zcode/bracket.py --help` y
`node skills/arena-zcode/scripts/jev-juiz.mjs --help`.
