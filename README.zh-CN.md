# arena-zcode

🌐 [English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md) | **中文**

当模型总是给你糟糕的回答时,让它的 16 个版本决一死战。这是一个 ZCode 技能。免费、MIT
协议、无需 API 密钥、无需任何连接:而且裁判甚至和参赛者不是同一个模型。

**快速上手:**[一条消息安装](#安装)即可装好,而 [docs/PROMPTS.zh-CN.md](docs/PROMPTS.zh-CN.md)
是一份真实战例目录,拿来即用。

## 它与启发它的 arena 项目有何不同

- **选手跑快速通道,裁判跑另一条。** 参赛者、攻击者和防守者运行在快速 flash 模型上
  (`arena-flash`);每场比赛的裁判和最终核验运行在外部决策模型上,通过技能自带的
  `jev-juiz` 运行器(TypeSafe SystemOne API):每个裁决决定都是针对同一份书面评分标准的
  结构化问题。尺子相同、不偏袒参赛模型家族、每场比赛只花几分钱、完全不依赖宿主的模型
  提供商。`--judge-pro` 可切换为用会话模型当裁判。
- **选手零内置上下文。** 每个 agent 定义文件都声明 `injectAgentsMd: false`:不加载
  AGENTS.md、不加载记忆、不加载样板。任务书就是子代理的全部世界。这让 16 个选手真正
  各不相同,也让 token 账单可控。
- **合理的默认值。** 16 名选手,每波 5 个。`--quick` 用 8 个,`--full` 用完整的 100 个。
- **绝不静默换模型。** 裁判通道失败就大声失败:比赛停下,由你决定。原始锦标赛设计(策
  略卡、攻击/防守/裁决、对阵引擎、可恢复的状态文件)完整保留自启发本项目的作品(见致谢)。

## 安装

### 一条消息安装(推荐)

把下面这段粘贴到 ZCode,在你希望存放仓库的文件夹里:

```
从 https://github.com/<你>/arena-zcode 安装 arena-zcode 技能:
1. 把仓库 git clone 到一个临时文件夹
2. 运行 powershell -NoProfile -ExecutionPolicy Bypass -File <repo>/skills/arena-zcode/scripts/deploy.ps1
3. 确认 ~/.zcode/skills/arena-zcode/SKILL.md 存在,并且三个 arena-*.md 通道文件已在 ~/.zcode/agents/ 里
4. 通道文件里的模型 id 是占位符(YOUR-FAST-FLASH-MODEL-ID):帮我把我目录里的快速模型填进 worker 通道,并提醒我需要开一个新会话
5. 然后从 docs/PROMPTS.zh-CN.md 里给我看三个可直接粘贴的用例
```

已经把仓库克隆到本地?同样的步骤,跳过 clone:

```
从当前文件夹安装 arena-zcode 技能:
1. 运行 powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1
2. 确认 ~/.zcode/skills/arena-zcode/SKILL.md 存在,并且三个 arena-*.md 通道文件已在 ~/.zcode/agents/ 里
3. 帮我把 worker 通道的模型 id(占位符 YOUR-FAST-FLASH-MODEL-ID)换成我目录里的快速模型
4. 提醒我技能要开新会话才生效,然后从 docs/PROMPTS.zh-CN.md 给我看三个用例
```

### 手动方式

需要带 Agent 工具的 ZCode、Python 3.8 或更高、以及运行裁判所需的 Node。无需 pip 或 npm
安装任何东西。裁判通道需要环境变量 `TYPESAFE_API_KEY`(TypeSafe SystemOne);没有它就用
`--judge-pro`。

```bash
git clone <本仓库>
cd arena-zcode
powershell -NoProfile -ExecutionPolicy Bypass -File skills/arena-zcode/scripts/deploy.ps1
```

脚本把 `skills/arena-zcode` 链接到 `~/.zcode/skills/`,并把技能自带 `agents/` 文件夹里的三
个 agent 定义复制到 `~/.zcode/agents/`。技能文件夹是自包含的:SKILL.md、对阵引擎、评分标
准、策略库、agent 通道和部署脚本都在一起,复制这个文件夹就等于复制整个技能。agent 定义
文件不会热更新:使用前请开启**新的 ZCode 会话**。定义里的 `model:` 行是占位符
(`YOUR-FAST-FLASH-MODEL-ID`、`YOUR-PROVIDER-ID/...`):部署前请改成你自己 ZCode 提供商目录
里的模型 id。worker 通道要快速模型,休眠的裁判通道要用与选手不同家族的模型。

卸载:删除 `~/.zcode/skills/arena-zcode` 和 `~/.zcode/agents/` 里的 `arena-*.md`。

## 使用

```
$arena-zcode
$arena-zcode --quick 为我们的定价页写标题
$arena-zcode --agents 32 修复 tests/test_api.py 里不稳定的测试
$arena-zcode --judge-pro 规划我的发布周,每天只有 6 小时
$arena-zcode --seed 7 与上次带 seed 的运行使用相同的牌和相同的对阵
```

单独输入 `$arena-zcode` 时:你最近的一次请求成为任务,你不满意的那个回答成为要击败的
基线。当你说"这答案太差了,让他们竞争"之类的话时,模型也可以不经标签直接触发它:而且
它会先问一句再花钱。

| 标志 | 作用 |
| --- | --- |
| `--agents N` | N 名选手。默认 16。 |
| `--quick` | 8 名选手。日常廉价档。 |
| `--full` | 100 名选手。完整规模的锦标赛;昂贵。 |
| `--judge-pro` | 裁判和最终核验改用会话模型而不是外部裁判。 |
| `--seed S` | 相同 seed 得到相同的牌和相同的对阵。默认随机,并被记录。 |
| `--wave W` | 每波子代理数。默认 5。只有在实测过宿主并发能力后才调高。 |

## 工作原理

1. **生成。** N 个子代理,每人一次 Agent 调用。每个人收到的任务文本逐字节相同(有测试
   验证),外加一张策略卡。共 15 种推理模式、12 种工作流、12 种策略:2160 张不同的卡,
   发牌不重复。
2. **攻击。** 解答两两配对,配对避免让两个相同推理模式的代理相遇。每一方攻击对方的解
   答:哪里错了、漏了哪条需求、能击垮它的具体输入。最多 7 条攻击,标记为 FATAL、MAJOR
   或 MINOR。
3. **防守。** 每一方逐条回应所受攻击,有证据地认输或反驳,然后重写解答,修正所有认输
   之处。
4. **裁决。** 技能的 `jev-juiz` 运行器把比赛发给**外部决策模型**(TypeSafe
   SystemOne):每个标准按[评分标准](skills/arena-zcode/rubric.md)打 0-10 分的选择题
   (正确性 30、完整性 25、稳健性 20、具体性 15、清晰度 10),外加致命标记、每条攻击的
   五档裁定(FIXED / REBUTTED / STANDING_MINOR / STANDING_MAJOR / STANDING_FATAL)、一
   个自查探针(攻击者没发现的最严重缺陷)和胜者选择。裁判永远看不到策略卡。稳健性由同
   一组信号推导而来,因此致命标记与稳健性不可能自相矛盾。`bracket.py` 负责算术:加权总
   分高者晋级,被证实的致命缺陷不能赢过无致命者,若裁判的选择与其 own 分数不一致则以分
   数为准。败者出局。
5. **循环。** 幸存者带着修改后的解答进入下一轮。奇数人时给一个轮空,同一个人在还有轮空
   更少的人等待时不会轮空两次。
6. **结果。** 只剩一个解答。你会得到它、它顶住的攻击、它的策略卡和轮数。如果你是从一
   个被否决的回答出发的,最终盲评裁判会把冠军与那个旧回答对比并如实报告比分,哪怕旧的
   赢了。

整个锦标赛状态在一个 JSON 文件里,由 `bracket.py` 管理。主会话只负责跑循环,从不阅读数
百个解答文件:每个子代理把工作写到磁盘并只回复一行。如果对话中途被压缩,`bracket.py
next` 会从文件恢复。

## 成本

技能免费。token 是你的。

| 选手数 | 轮数 | 子代理调用次数 |
| --- | --- | --- |
| 16(默认) | 4 | 91 |
| 8(`--quick`) | 3 | 43 |
| 32 | 5 | 187 |
| 100(`--full`) | 7 | 595 |

裁判以代理方式运行时约占调用的 18%;在 `jev-juiz` 运行器上每场只是一次 API 调用(约
1 万输入 token,每场远低于一美分,输出免费)。

## 工具

`bracket.py` 是纯标准库 Python。它是编排者从不迷路的原因。
`python skills/arena-zcode/bracket.py --help`(以及每个子命令的 `--help`)是所有标志的活
文档。

```bash
python skills/arena-zcode/bracket.py plan --agents 16   # 轮数、调用数、波数。不写任何东西
python skills/arena-zcode/bracket.py init --agents 16 --seed 7 --task-file task.md
python skills/arena-zcode/bracket.py next               # 现在该做什么,附确切命令
python skills/arena-zcode/bracket.py status             # 每轮的存活与淘汰
python skills/arena-zcode/bracket.py winner             # 幸存者及其一路战绩
```

## 裁判运行器

`skills/arena-zcode/scripts/jev-juiz.mjs` 是外部裁判:每场比赛一次 Node 调用,每次几分
钱,不经过宿主提供商。`node skills/arena-zcode/scripts/jev-juiz.mjs --help` 是活文档。你真
正常用的命令:

```bash
node skills/arena-zcode/scripts/jev-juiz.mjs --check-key      # 花钱前先做一次单问题活性探测
node skills/arena-zcode/scripts/jev-juiz.mjs --calibrate      # 盲测弱对强样本,两次都必须通过
node skills/arena-zcode/scripts/jev-juiz.mjs --size-report <brief>   # 估算载荷是否超限,不调用 API
node skills/arena-zcode/scripts/jev-juiz.mjs <judge-brief>    # 裁决一场比赛(编排者做的事)
```

退出码是契约:`0` 成功;`2` 用法错误;`3` 确定性失败(大小闸门、HTTP 4xx):修正输入,
切勿原样重试;`4` 密钥问题(401/403):修好密钥;`5` 瞬时失败(5xx、网络、超时):可全新
重试,最多三次;`6` 校准未确认;`7` 校准倒挂:停止。`JUDGE_CAP_OVERRIDE=<N>` 可作为显式
决定提高载荷闸门。

## 须知

- **"16 个版本的模型"是同一个 worker 模型的 16 个子代理。** 让它们不同的是策略卡。裁判
  刻意来自另一条通道,所以量尺不是参赛的那只手。
- **"一名选手等于它的策略卡加它的解答文件。"** 子代理在调用之间没有记忆:第 3 轮的攻击
  者是一个拿着相同策略卡和最新解答的全新子代理。
- **"最佳答案"指熬过所有比赛的那个。** 你得到的是本次锦标赛找到的最强答案,不是正确性
  证明。所以它会展示冠军顶住了哪些攻击,也会在你否决的旧回答得分更高时如实相告。
- **子代理看不到你的聊天。** 技能会写一份自包含的任务文件,选手知道的只有它。如果某条
  需求没写进文件,所有人都会漏掉。它就在 `.arena/<run>/task.md`,可以检查。
- **绝不改动你的项目。** 代码改动以 diff 或完整文件的形式出现在获胜答案里。是否应用由
  你决定,技能会先问你。
- **相同 seed 得到相同的牌和相同的对阵。** 但不是相同的答案。模型不是确定性的。
- **它治不好糟糕的任务。** 含糊的任务进去,出来 16 种含糊。

## 文件

```
skills/arena-zcode/SKILL.md            编排步骤、通道与每份子代理任务书
skills/arena-zcode/bracket.py          锦标赛状态机,纯标准库
skills/arena-zcode/strategies.json     15 种推理模式、12 种工作流、12 种策略。可自由编辑
skills/arena-zcode/rubric.md           裁判打分的五项标准
skills/arena-zcode/agents/arena-flash.md      worker 通道:参赛者、攻击者、防守者
skills/arena-zcode/agents/arena-jev-juiz.md   休眠的裁判通道(代理方式);现役裁判是上面的运行器
skills/arena-zcode/agents/arena-juiz-pro.md   --judge-pro 的裁判通道:会话模型
skills/arena-zcode/scripts/jev-juiz.mjs       裁判运行器:外部决策模型、同尺、五档裁定、
                                              自查探针、推导式稳健性、大小闸门、失败分类、
                                              花钱前的 --check-key 与 --calibrate
skills/arena-zcode/scripts/fixtures/          校准样本(任务、弱、强)
skills/arena-zcode/scripts/deploy.ps1         安装到 ~/.zcode(技能链接 + agent 文件,
                                              -Lane/-Model 可生成额外的 worker 通道)
tests/test_bracket.py                  测试(ARENA_SKILL_DIR 环境变量选择被测副本)
docs/PROMPTS.md                        真实用例目录,拿来即用
docs/ORIGINAL-README.md                启发本项目的那个项目的 README
```

本 README 的其他语言:[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

## 致谢

锦标赛设计与对阵引擎改编自 Jake Schincariol 的
[arena-skill](https://github.com/Jakeschincariol/arena-skill)(MIT),本项目正是受其启发。
原 README 保存在 [docs/ORIGINAL-README.md](docs/ORIGINAL-README.md)。

## 许可证

MIT。拿去、修改、发布。
