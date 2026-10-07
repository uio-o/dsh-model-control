# dsh-model-control

DeepSeek Harness（DSH）的**统一模型控件**插件：把「模型选择器」和「模型管理 + 思考档位」
合到一个座位、一个设置页里。

整合了两个插件的能力（fork 自 [dsh-model-picker](https://github.com/ttmouse/dsh-model-picker)，MIT）：

- **模型选择器**（输入栏座位）：搜索、收藏、供应商折叠、上下文胶囊、档位控件
- **模型管理**：内置渠道接管、自建渠道增删改、模型能力（图片输入 / 上下文 / 最大输出）
- **思考档位**：65 条知识库建议、每模型默认档、档位设置页

## 安装

在 profile 的 `package.json` 加一行依赖：

```json
{
  "dependencies": {
    "dsh-model-control": "https://github.com/uio-o/dsh-model-control/archive/refs/heads/main.tar.gz"
  }
}
```

再把 `dsh-model-control` 加进同一文件的 `dsh.profile.bundles`：

```json
{
  "dsh": { "profile": { "bundles": ["dsh-model-control"] } }
}
```

然后**重启应用**（bundles 是启动时读入的）。

开发时也可以本地 link：`"dsh-model-control": "link:D:/path/to/model-control"`。

## ⚠️ 与旧插件冲突，装前必读

本插件**整合并取代**下面两个，**不要同时启用**——它们会抢同一个「选择器座位」
（单座位 slot，一个占上另一个就失效，表现为选择器消失或报重复 id）：

- [`dsh-model-picker`](https://github.com/ttmouse/dsh-model-picker)
- `dsh-better-reasoning-effort`

迁移做法：把它们从 `dsh.profile.bundles` 里**移除**（依赖声明可以留着），只保留
`dsh-model-control`。

## 接管官方「模型」页

插件自带 bundle 层补丁，安装后会**隐藏官方「模型」设置页**，由本插件的「模型管理」接管，
避免两个入口做同一件事。

这个接管是**可逆**的：禁用/卸载本插件时那行补丁随之消失，官方页立刻回来；也可以在插件页里
关掉「接管官方「模型」页」开关（写进 profile 层，需重启生效）临时切回官方页。

## 要求

- DSH NEXT / DeepSeek Harness，Node ≥ 22
- 客户端半是 web 平台插件（`dsh.client.platform: "web"`）

## 测试

```bash
node scripts/check-client.mjs       # 客户端解析 + 静态防线（setter / i18n）
node scripts/test-host.mjs          # 宿主 17 条路由
node scripts/test-engines.mjs       # 档位建议引擎
node scripts/test-store.mjs         # 持久化
node scripts/test-selection.mjs     # 模型选择写入
node scripts/test-declaration.mjs   # 档位声明计划
node scripts/test-profile-patch.mjs # 接管开关的 patch 层编辑
```

## 功能

### 继承自 dsh-model-picker（选择器底座）

- 双区触发按钮：左区选模型、右区选思考档位（**唯一的对话内档位入口**）
- 顶部搜索框，供应商与模型两栏同时过滤
- 供应商折叠（`(modlens vision)` 能力后缀路由折叠进基供应商，只影响展示）
- 收藏组置顶（按 `provider/model` 路由收藏，localStorage 持久化）
- 供应商字符徽标 + 固定底色
- 上下文长度胶囊与原生/桥接视觉图标

### 新增：档位建议引擎

- 内置知识库（DeepSeek / Claude / GPT / GLM / Kimi / Qwen / Gemini / MiMo 等 16 族），最长边界命中匹配
- 未命中时按厂商家族 / 协议推断，置信度三档（高=知识库、中=厂商推断、低=通用）
- 档位弹窗显示推荐默认档（带置信度圆点）与推荐标记

### 新增：每模型默认档

- 档位弹窗底部「设为默认档 / 清除默认档」
- 经宿主回环路由 `POST /api/model-control/defaults` 持久化（宿主侧 sidecar 存储）
- 存储键 `provider/model`，与收藏同构

### 新增：模型选择（拉取 API 模型 → 勾选加入）

这是「哪些模型存在于本软件」的唯一机制，**不是**停用清单：

1. `GET /api/model-control/providers` —— 列出已配置渠道及其**已加入**的模型
2. `GET /api/model-control/available?provider=<id>` —— 调用官方
   `llm.discoverModels('llm-pi-ai', …)` **拉取该渠道实际提供的模型**（密钥经
   `credentials.resolve(apiKeyEnv)` 解析）
3. `POST /api/model-control/selection` —— 把勾选结果写回
   `providers.<id>.models[]`（`settings.mutate` 路径写入 + revision 冲突重试一次）

**未勾选的模型不进配置，因此不存在于任何入口**——输入栏选择器、`/model` 弹窗、
以及其它读模型的插件都看不到它。已勾选且原本存在的条目**逐字节保留**（手写的
`reasoningEfforts`、`input`、重试覆盖等都不会被覆盖）。

设置页入口：**设置 → 模型管理**（`settings.section`，`id: model-control`，order 12）。
官方「模型」页由本插件的 bundle 补丁禁用，因此安装后是**本页接管**（见下）。

### 接管官方「模型」页（含回退开关）

**关键实现事实（实测得出，与直觉相反）**：用官方单元格 id `models` 注册**不能**替换官方页——
该注册被当成重复 id 拒绝，`settings.section` 里**一个占用者都不会出现**，页面直接消失。
（我一度就是这么写的，页面因此「既没接管、也没出现」。）

真正可行的是**在层叠栈里禁用官方那一行**，也就是市场插件的标准做法：

- 本插件的 `cordis.patch.yml`（bundle 层）里写 `- id: ui-settings-models` + `disabled: true`
- 于是**安装即接管**；而这一行属于本插件的 bundle 层，**禁用/卸载本插件时它随之消失，
  官方模型页立刻回来**——接管不可能造成「两个页面都没了」的死局
- 客户端半始终用自己的 id `model-control` 注册：直接 `ctx.slots.inject('settings.section', …)`，
  **同步**注册（官方 `dsh-client-ui-settings-models` 就是这个写法）。异步注册（等 fetch 再注册）
  同样不会落地
- 页面顶部「接管官方「模型」页」开关：关闭时把 `disabled: false` 写进 **profile 层**
  （在 bundle 层之后应用，故能覆盖），官方页回来；开启时删掉这一行，回到 bundle 默认
- profile 层是**启动时读入**的，所以开关**需要重启应用才生效**，页面提示里写明了
- 写入前做结构校验（仍是数组、条目数变化 ≤1、无制表符），失败就拒写；原文件备份到
  `<profile>/cordis.patch.yml.model-control.bak`

### 新增：渠道管理（对齐官方页的基础能力）

**先说一条上游硬约束**（这是"添加渠道报错"的根因）：pi-ai 里
`entries.length === 0` 会直接 `invalid(provider, "resolves no models; the installed catalog
does not describe this route, so its models must be listed in configuration")`。
`entries` 是你配的 models；为空则回退到**内置 catalog**，而 catalog 不认识你的自定义路由，
于是也为空 → **整份配置被拒绝**。结论：**自定义渠道必须在创建时就带至少一个模型**，
"先建空壳渠道、之后再拉模型"这条路走不通。

所以创建是**向导式**的，创建放最后一步：

1. **测试连接**（`POST /probe`，草稿态，不写任何东西）——用你填的地址/协议/密钥实际调一次
   `discoverModels`，能通就报"返回了 N 个模型"；端点能连但不返回模型也是**明确的答案**，
   与"连不上"区分开
2. **拉取模型**（`POST /available {draft}`，草稿态，不写任何东西）——为**还不存在**的渠道
   拿候选列表
3. **勾选**要加入的模型
4. **创建**（`POST /provider {action:'add', models:[...]}`）——把渠道与它的模型**一次写入**。
   空列表会被宿主拒绝并回 `code: 'MODELS_REQUIRED'`，对应文案说明原因，而不是等 pi-ai
   在加载时抛一句让人看不懂的 schema 错误

其余渠道能力：

- **编辑渠道**：显示名、接口地址、协议、密钥环境变量名 → `{action:'update'}`
  （只改列出的字段，密钥引用与模型列表一字不动）
- **删除渠道**：`{action:'remove'}`（同时清掉它的隐藏标记）
- **隐藏 / 显示渠道**：`POST /hidden`，纯展示层（见「已知限制」）
- **内置渠道**：走 `llm.listProviders()` 列出（来源不是 pi-ai 文档），标注「内置渠道」。
  它的「设置」编辑的是**该渠道自己的配置项**（不是 pi-ai 文档的一行），当前开放
  配置命名空间 / 接口地址 / 思考档位 / 思考开关 / 密钥（仅当该渠道有密钥字段时）；
  密钥仍只经凭据服务存放，配置里只写变量名
- 密钥可以直接填**明文**：配置层照样只保存变量名（与官方页同一套凭据存储），
  明文从输入框经 `credentials.set` 落到本机凭据区

### 新增：模型档位页

- 渠道卡片上「档位设置」→ `GET /effort?provider=<id>`
- 每个模型并排显示 **当前声明** 与 **知识库建议**（含命中来源）
- 勾选档位后「保存」→ `POST /declare` 携带显式 `ladder`
  （写入前经 `declaration.js` 按 pi-ai 硬规则校验：空表拒绝、只有 `off` 拒绝、
  非 `off` 档必须有非空线上取值）
- 「无档位」按钮写入字面量 `false`（adapter 用于关闭档位控件）
- 写完后输入栏的档位控件才会出现——这一步就是让第三方模型有档位可选的**唯一**途径

### 界面：两层弹窗（仿 Cherry Studio V2）

原来是一列卡片往下堆，每张卡平铺 5~6 个按钮（拉取 / 建议档位 / 隐藏 / 编辑 / 档位设置 / 删除），
这就是"按键过多"的来源。**两栏主从试过一版，被否掉了**：设置窗自身很窄，左栏一挤就只剩
200px 装不下渠道名，右侧一展开编辑器又把整页撑得很高，左右高度差显得割裂。最终改成弹窗分层：

- **设置页本身只放渠道列表**——一行一个渠道（显示名 + 自定义/内置徽标 + 命名空间/模型数 +
  「编辑」按钮），像 Cherry Studio 的模型服务页，不再挤两栏。
- **第一层弹窗**（点「编辑」）：这个渠道的配置与模型。
  - **进来就列出这个渠道已有的模型**，每个一行（显示名 + 真实 id/上下文/🖼 + 右侧「设置」）。
    这一份是从**本机读**的（自建渠道读 `llm-pi-ai` 文档，内置渠道读适配器列表），
    **不发网络请求**——看一眼模型列表不该依赖端点是否在线。
  - 「拉取可用模型」是**你主动点**才发生的动作；拉取结果只出现在下方的**候选面板**里
    （虚线框，可随时收掉），勾选后「保存选择」才写进渠道。候选面板**不会顶掉**已有列表。
  - 渠道配置表单（接口地址、协议、密钥、密钥变量名；内置渠道则是命名空间 / 地址 /
    思考档位 / 思考开关 / 密钥）与底部次要操作（应用建议档位、隐藏/显示、删除、关闭）。
- **第二层弹窗**（模型行右侧「设置」）：**只针对那一个模型**——思考强度（五个档位 + 自适应）
  与能力（文本输入 / 图片输入·识图 / 上下文窗口 / 最大输出）。叠在第一层之上，自带遮罩。
- 两层都支持：点遮罩关闭、右上角 × 关闭、**Esc 先关上层再关下层**。

> 早期版本每次打开弹窗都会自动重拉一次模型，而且列表位置显示的是"拉取结果"而不是
> "渠道实际持有的模型"，所以看起来中间是空的、必须点一下才有东西。现在这两件事分开了：
> **列表＝渠道持有的**，**拉取＝往候选面板里添**。

**弹窗实现说明**：插件沙箱只给到 `ctx / React / host / styles / console`（没有 `react-dom`），
所以用不了 `createPortal`；改用 `position:fixed` 覆盖视口，配合两层 `z-index`（40 / 60）堆叠。
`document.addEventListener` 可用，Esc 就挂在它上面。

**功能一项没少**：重构后逐个核对了原有能力（拉取、同步模型、批量建议、单渠道建议、渠道配置、
官方渠道设置、隐藏、删除、新增、刷新、诊断、全选/全不选/保存选择、接管开关、档位保存、
能力保存）全部仍在可达位置。布局依据见
`../model-control-versions/Cherry-Studio-V2-界面调研.md`。

### 新增：模型能力（图片输入 / 上下文窗口 / 最大输出）

**先说清上游边界**，这决定了能放什么、不能放什么。pi-ai 的**聊天模型条目**字段是封闭的一小组
（`dsh-llm-pi-ai` 的 `modelFields`）：

```js
{ name, contextWindow, maxTokens, input, reasoningEfforts, compat }
```

对照实际需求：

| 需求 | 上游实际情况 | 本页处理 |
|---|---|---|
| (a) 图片输入 | ✅ `input: ['text','image']`（`MODALITIES` 只有这两个） | 可勾选 |
| (c) 识图 | 与 (a) **是同一个字段**，不是两件事 | 同上，不重复提供 |
| (b) 工具调用 | ❌ 模型条目**没有**这个字段。pi-ai 所支持的协议都假定工具可用；`supportsToolSearch`、`requiresToolResultName` 这些是**协议级 compat 旋钮**，不是"该模型支不支持" | 不做开关，界面注明原因 |
| (d) 生成图 | ❌ 聊天模型**没有** `output` 字段。文生图在 pi-ai 里是**另一套注册表**（`ImagesModelsImpl` / `IMAGE_MODELS`，`api: "openrouter-images"`，其条目才带 `output: ["image"]`），`dsh-llm-pi-ai` 从不喂它 | 不做开关，界面注明原因 |

所以这里提供的是**真实存在**的那部分：图片输入 + 上下文窗口 + 最大输出。硬规则：

- `input` 只接受 `text` / `image`；**空数组被拒绝**——pi-ai 把空列表当"未声明"，
  会用 catalog 的答案覆盖，恰好与"刚取消勾选"相反
- 保存时 `text` 自动保留，理由同上
- 数字必须是正整数，否则拒绝且**一个字节都不写**
- **只改点名的字段**，同一条目上的 `name` / `compat` / `reasoningEfforts` / `cost` 原样保留（测试逐条钉住）
- 自建渠道写 `llm-pi-ai` 文档；官方渠道自动改走它**自己的** settings ns

### 新增：厂家分组（纯 UI 层）

- 模型菜单顶部「按提供商分组 / 按厂家分组」切换
- 厂家视图把同一提供商下的模型按家族重排（Claude / GPT / GLM / DeepSeek / Kimi / Qwen / Gemini / MiMo…，未匹配进「其他」）
- **只改展示**：每行仍提交原始 `provider/model` 路由，底层不拆 provider、不改路由
- 分组规则默认内置 12 条前缀规则，可经 `/api/model-control/grouping` 自定义

## 与被整合插件的关系

| 原插件 | 本插件的处理 |
|---|---|
| dsh-model-picker | fork 其选择器底座；安装本插件后可禁用原插件（同一座位槽） |
| dsh-better-reasoning-effort | 移植其知识库思路与「每模型默认档」；**不移植**其 Composer 滑块（避免双入口）；设置页能力声明编辑留待后续版本 |

## 安装（干净环境验证用）

```sh
dsh plugin --profile <profile> add link:D:/onedrive/codex/DSH设计与功能查询/model-control
```

或打包后从目录安装。安装前**禁用 dsh-model-picker 与 dsh-better-reasoning-effort**（避免座位与档位入口冲突）。

### 验证清单

1. 重启后输入框出现双区触发按钮
2. 左区弹窗：搜索、收藏、供应商折叠正常
3. 顶部出现「按提供商分组 / 按厂家分组」切换，厂家视图分组正确、选中仍路由到原 provider
4. 右区弹窗：档位列表 + 推荐标记（推荐档带「推荐」字样）
5. 「设为默认档」后重启，默认档标记仍在（已落盘到 `storages/model-control/state.json`）
6. 控制台无插件报错

## 实测记录（2026-10-05，development profile）

在干净 profile（仅 base / web-app / free-search / openviking）上安装并实测：

| 项目 | 结果 |
|---|---|
| 安装（`link:` 本地目录） | `application: applied`，无警告 |
| 宿主 Config 条目 | `include:dsh-model-control` 存在 |
| 客户端座位 | `conversation.input.model` 由 `dsh-model-control` 以 priority -20 **活跃接管** |
| `GET /models` | 200，返回 11 个模型（3 个 provider），带 `vendor` / `suggestedDefault` |
| `GET /advise` | 200；`deepseek-flash` → 知识库命中、high 置信、默认 high |
| `GET /grouping` | 200，12 条默认规则 |
| `POST /defaults` → `GET /defaults` | 写入、回读一致；清空后归零 |
| `POST /grouping` → 自定义/重置 | 自定义 2 条生效，重置回 12 条 |

## 实测记录（2026-10-06 凌晨，development profile 加深验证）

在真实实例上用桌面自动化逐个点选验证（此前只有隔离测试）：

| 项目 | 结果 |
|---|---|
| 档位声明自动补写 | 载入时写入 **8 个模型**，日志 `autofill done: {"total":8,"declared":8,"failed":0}`；第二次载入 `declared:0`（幂等） |
| 写入内容合法性 | `cordis.patch.yml` 里 8 处 `reasoningEfforts`，逐条与知识库判定一致（claude-opus-5/sonnet-5 → `anthropic-claude-5` 五档；deepseek-flash → `off/low/high/max`；glm-5.3-flashx → `low/high/max`；`gpt-6.1-sol` → `openai-gpt-6-astra`；`stealth/space-bunny-alpha` → 通用回退 `off/low/medium/high`） |
| 输入栏档位控件 | 右下角出现「推理层级: Low」，第三方模型可选档位（用户确认） |
| 设置页接管 | 左侧导航的官方「模型」消失，出现「模型管理」；`settings.section` 占用者中 `models` 消失、`model-control(12)` 出现 |
| 渠道管理 | 两个自建渠道卡片渲染齐全：拉取可用模型 / 应用建议档位 / 隐藏 / 编辑 / 档位设置 / 删除；**编辑表单**（显示名/接口地址/协议/密钥环境变量名 + 保存/取消）与**隐藏**（徽标变「已隐藏」、卡片变暗）均已点验 |
| 内置渠道 | `deepseek-official`、`deepseek-account` 列出并标注「内置渠道」，各显示已加入的 2 个模型 |
| 档位设置页 | 每模型并排「当前声明」与「建议（含来源 `anthropic-claude-5`）」，档位勾选框 + 「无档位」/「保存」 |

### 已修复的真实缺陷

1. **重载后路由重复**：原先路由注册没有挂 disposer，禁用插件不会释放 `/api/model-control/*`，
   重新启用时报 `webserver: duplicate exact route`，导致插件激活失败。
   现在每条路由都经 `ctx.effect()` 注册，禁用即释放。`scripts/test-host.mjs` 用「禁用→重新启用」
   循环把这个回归钉住了。
2. **默认档重启丢失**：原先只有进程内存。现在落盘到
   `<DSH_HOME>/storages/model-control/state.json`（原子写入 tmp+rename，损坏文件安全降级为空状态）。
3. **自己造成的编码事故（2026-10-07 晚，已修复）**：改 `test-host.mjs` 时用 PowerShell 做了一次
   `Get-Content -Raw` → `Set-Content -Encoding UTF8` 往返，中文先按 ANSI 读入、再按 UTF-8 写出，
   **全文非 ASCII 被压成 mojibake**（`自建网关` → `鑷缓缃戝叧`；测试里的 `第二个网关`、`改名了`
   连结尾引号一起被吃掉，直接语法错误）。已按码点逐处还原，`node --check` 与全量测试均通过。
   **教训**：本项目源码含中文，**不要用 PowerShell 读写源文件**，用 `edit`/`read` 工具。

## 实测记录（2026-10-07，development profile —— 内置渠道接管排障）

**崩溃根因（用户报告「对于两个官方的渠道，好像没有办法完整接管」）**：内置渠道编辑器里
`entryKey` 从未用 `useState` 声明，点「设置」渲染即抛 `entryKey is not defined`，
又被 `SafeSection` 错误边界兜住，结果是**整个设置页变成一行报错**——看起来就是「点开就坏」。
补上声明后编辑器正常打开。为防止同类问题复发，`scripts/check-client.mjs` 加了静态防线：
每个裸 `setXxx(` 调用必须解析到一个 `useState` 配对或 `const/function setXxx` 声明
（当前 34 个 setter 全部解析通过）；另有 i18n 防线：每个 `t()/tf()` 引用的 key 必须在
`zh` 与 `en` 都存在（当前 111 个 key 双语齐全）——否则缺 key 只会渲染成空白，不报错。

**本轮在真实界面点验到的部分**：

| 项目 | 结果 |
|---|---|
| 内置渠道编辑器打开 | 两个内置渠道（`deepseek-official` / `deepseek-account`）点「设置」均正常打开，不再崩 |
| 配置命名空间自动探测 | 卡片显示 `配置命名空间: llm-deepseek` / `llm-deepseek-account`，probe 返回 `{hasMethod:true,count:45}` |
| 字段预填 | 接口地址读到 `https://api.deepseek.com/anthropic`，档位/开关默认「（不修改）」 |
| 保存按钮可达 | 原先按钮在表单底部、被设置弹窗裁切（要滚动才点得到），已改为**放在表单顶部**，一打开就在视野内 |
| 保存写入落盘 | 走界面把档位存成 `high` 后，`<profile>/cordis.patch.yml` 的 `llm-deepseek` 段出现 `reasoningEffort: high`，且重新打开编辑器回读显示 `high`（写入→回读闭环成立）；界面提示「已保存内置渠道配置」 |
| 账号渠道密钥字段 | `deepseek-account` 没有 `apiKeyEnv`，编辑器不再给密钥框，改为提示「该渠道用登录授权…」 |

**仍未经界面端到端验证（代码与单测覆盖，GUI 侧未点通）**：档位的「（清除，恢复默认）」。
它写的是 `unset` 语义，`scripts/test-host.mjs` 已断言清除后 `reasoningEffort`/`thinking`
键被移除、其余字段不受影响；但原生 `<select>` 的下拉交互 + 弹窗裁切让自动化点选
没能稳定复现，留给你手动点一次确认。同一原因，宿主侧新加的 `entry write` 诊断日志
未能在日志文件里观测到（`console.log` 级别的 `host loaded` 能观测到，说明是模块缓存而非级别问题）。

**本轮暴露的宿主重载事实（重要，和此前 README 的结论不同）**：`禁用→启用` 插件
**不一定**让宿主半代码生效——本次连续两次 `禁用→启用` 后，新加的日志代码并未出现在
日志里，直到重启应用后才拿到新模块。因此**改完宿主代码后，重启应用才是可靠生效路径**；
客户端半仍是 `禁用→启用` + 刷新页面。

## 已知限制

- 档位建议与**档位声明写入**：知识库 65 条全量已内置，`POST /declare` 可写、`POST /undeclare` 可按备份精确还原；插件载入时还会**自动补写**未声明的模型（可在 sidecar 关掉）。已声明过的模型默认不动，加 `force` 才刷新。
- **改代码后怎么生效**（实测结论，和直觉不同）：
  - **客户端半改动**：`禁用→启用` 插件（重建客户端包）→ 刷新页面。只刷新页面**不够**，跑的还是上次重载时构建的包。
  - **宿主半改动**：`禁用→启用` 插件**可能会**重新导入模块（`host loaded` 每次都打），
    但 2026-10-07 实测发现这**不可靠**——模块可能命中 ESM 缓存，跑的还是旧代码
    （现象：新加的日志代码在日志文件里始终不出现）。**可靠路径是重启应用**。
    验证是否真生效，别只看 `host loaded`，要看只有新代码才会产生的可观测行为。
- 接管开关改的是 profile 层，而 profile 层在**应用启动时**读入，所以开关**需要重启应用**才在导航里生效。
- 内置渠道（`deepseek-official` 等）由其它插件注册，不在 `llm-pi-ai` 文档里。它的**自身配置**
  现在可编辑（命名空间 / 接口地址 / 思考档位 / 思考开关 / 密钥，写的是它自己的 settings 项），
  但**模型列表仍不可编辑**：内置渠道的模型来自 pi-ai 连接目录
  （`connection.models` → `catalogModelInfo`，即 `@soya-ai/pi-ai` 的模型知识），
  不在 pi-ai 文档中，所以「拉取可用模型 / 勾选加入 / 应用建议档位」这些能力只对**自建渠道**开放。
- 「隐藏渠道」是**展示层**：隐藏后本插件画的模型列表（输入栏选择器、厂家分组、收藏镜像）不再出现该渠道，但渠道配置、密钥、模型一字未动；`/model` 弹窗属于官方 UI，不受影响。要做到宿主级全局隐藏，需要包装 `llm.listProviders/listModels`，属后续版本。
- 页面观感已用桌面自动化点验到「功能可达、内容正确」这一层；视觉细节（间距、配色、暗色主题）仍建议你自己看一眼。
- 撤销备份（`declarations`）只记录**本插件写之前该字段的值**。这次 8 条声明写的都是原本不存在的字段，所以撤销等于删除；若你手改过 `cordis.patch.yml` 里的声明，撤销不会回滚你的手改。

## 结构

```
lib/host.js        宿主半：17 条回环路由，全部经 ctx.effect 可释放
lib/client.js      浏览器半：选择器座位（fork 自 picker）+ 模型管理页 + 档位/能力编辑
lib/efforts.js     纯函数：档位建议引擎（65 条知识库 + 厂商/协议推断）
lib/declaration.js 纯函数：声明写入计划（校验 pi-ai 的硬规则、备份、撤销）
lib/knowledge.js   生成物：65 条知识库（scripts/generate-knowledge.mjs 提取，含 MIT 署名）
lib/grouping.js    纯函数：厂家分组（宿主侧同款规则）
lib/selection.js   纯函数：选择集（逐字节保留已有条目 + 追加 + 移除）
lib/store.js       纯函数：sidecar 读写（原子写、损坏降级、BOM 容错、$DSH_HOME 解析）
lib/profile-patch.js 纯函数：profile 补丁文本编辑（按 id 定位整行、加/删 disabled、结构校验）
cordis.patch.yml   本插件的 bundle 层：插入自身 + 禁用官方 `ui-settings-models`（接管）
scripts/generate-knowledge.mjs  从上游提取知识库并校准打印
scripts/test-host.mjs          宿主端到端（14 路由 + 选择 + 声明 + 渠道 + 隐藏 + 接管 + 档位 + 自动补写 + 重载循环）
scripts/test-declaration.mjs   声明校验规则与写入/撤销计划
scripts/test-profile-patch.mjs profile 补丁编辑规则与结构守卫
scripts/test-selection.mjs     选择集合并语义
scripts/test-store.mjs         sidecar 读写、降级与 BOM 容错
scripts/test-engines.mjs       建议引擎与分组断言
scripts/check-client.mjs       浏览器半语法与注册形态
```

## 许可

MIT。包含自 dsh-model-picker（MIT，© ttmouse）派生的代码；知识库自
dsh-better-reasoning-effort（MIT，© HaoyueQin）提取 65 条全量表。
