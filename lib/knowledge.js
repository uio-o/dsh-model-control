// GENERATED FILE — do not edit by hand.
//
// Run `node scripts/generate-knowledge.mjs` to regenerate.
//
// Source: dsh-better-reasoning-effort (MIT, © HaoyueQin) — its `KNOWLEDGE_BASE`
// array, extracted verbatim so this plugin carries the full 65-entry table
// without depending on that package at runtime. Field names are upstream's:
//
//   patterns      id fragments matched on a boundary; longest hit wins
//   efforts       harness level -> the value sent on the wire, or `false`
//                 when the model exposes no reasoning control at all
//   defaultEffort the vendor's own default level, when it has one
//   compat        adapter compatibility flags written alongside a declaration
//   input         input modalities the model accepts
//   contextWindow / maxTokens   reference capacity (shown read-only)
//   note          the upstream editorial note, in Chinese
//
// Everything below this banner is upstream data; the surrounding logic lives in
// efforts.js.

export const KNOWLEDGE_BASE = [
  {
    "id": "deepseek-v4-vision",
    "patterns": [
      "deepseek-v4-flash-vision",
      "deepseek-v4-vision"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "high": "high",
      "max": "max"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "deepseek",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1048576,
    "maxTokens": 384000,
    "note": "DeepSeek 视觉实验版 id（deepseek-v4-flash-vision-exp）。官方目录已标注该模型退役，名字仍被接受、由现行 deepseek-flash 提供服务——图片输入现已由 deepseek-flash 原生提供。"
  },
  {
    "id": "deepseek-v4-1-flash",
    "patterns": [
      "deepseek-v4.1-flash",
      "deepseek-flash"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "high": "high",
      "max": "max"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "deepseek",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1048576,
    "maxTokens": 384000,
    "note": "DeepSeek-V4.1-Flash（2026-09-10 发布的现行官方模型，官方 id 为 deepseek-flash；25 万并发、**原生图片输入**）。V4.1 的各写法（deepseek-flash、deepseek-v4.1-flash、deepseek-v4-1-flash，以及带日期后缀的第三方变体）都归此条——纯文本的 deepseek-v4 主干不再吞掉它们。官方枚举同 V4 系：Off（thinking:\"disabled\"）/ Low / High / Max，默认 High；容量 1,048,576 上下文 / 最大输出 384K。"
  },
  {
    "id": "deepseek-v4",
    "patterns": [
      "deepseek-v4"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "high": "high",
      "max": "max"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "deepseek",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "contextWindow": 1048576,
    "maxTokens": 384000,
    "note": "DeepSeek 官方枚举 Low / High / Max（默认 High；minimal、medium、xhigh 兼容映射，ultra→max），Off 即 thinking:\"disabled\"（Responses API 下 off 以 reasoning.effort:\"none\" 表示）。本条目是 V4 家族的**纯文本**成员：deepseek-v4-pro（= DeepSeek-V4-Pro-0813，官方不支持图片）与已退役模型的兼容别名 deepseek-v4-flash（deepseek-v4-flash-vision-exp 另有视觉条目）。**收图的 V4.1-Flash（官方 id deepseek-flash）另有专门条目**，其 input 含 image。容量：1,048,576 上下文 / 最大输出 384K（393,216；默认非思考 8K、思考 64K、effort=max 时 128K）。"
  },
  {
    "id": "deepseek-v3",
    "patterns": [
      "deepseek-v3",
      "deepseek-chat"
    ],
    "efforts": {
      "off": "none",
      "high": "high",
      "max": "max"
    },
    "compat": {
      "thinkingFormat": "deepseek",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "contextWindow": 163840,
    "maxTokens": 65536,
    "note": "DeepSeek V3 档位：Off / High / Max。官方已停售 V3 代（定价页仅剩 V4 三型），容量取目录现役值。"
  },
  {
    "id": "deepseek-r1",
    "patterns": [
      "deepseek-r1",
      "deepseek-reasoner"
    ],
    "efforts": {
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "deepseek",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "contextWindow": 163840,
    "maxTokens": 32768,
    "note": "DeepSeek-R1 为推理模型，仅提供 High。官方已下架 R1 代，容量取目录 r1-0528 值。"
  },
  {
    "id": "openai-gpt-5-2",
    "patterns": [
      "gpt-5.2"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh"
    },
    "defaultEffort": "off",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 400000,
    "maxTokens": 128000,
    "note": "GPT-5.2 档位：None / Low / Medium / High / XHigh（默认 None）。官方另支持 PDF 输入（核心词表暂不含）。gpt-5.2-pro 官方页未单列档位行，按本条目同档处理；gpt-5.2-codex 见单独条目。"
  },
  {
    "id": "openai-gpt-5-2-codex",
    "patterns": [
      "gpt-5.2-codex"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh"
    },
    "defaultEffort": "medium",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 400000,
    "maxTokens": 128000,
    "note": "GPT-5.2-Codex 档位：Low / Medium / High / XHigh（无 None 档，勿勾 Off），带图输入、400K。"
  },
  {
    "id": "openai-gpt-5-6",
    "patterns": [
      "gpt-5.6"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh",
      "max": "max"
    },
    "defaultEffort": "medium",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1050000,
    "maxTokens": 128000,
    "note": "GPT-5.6（别名即 sol）档位：None / Low / Medium(默认) / High / XHigh / Max；sol/luna/terra 同档，带图输入。"
  },
  {
    "id": "openai-gpt-5-5",
    "patterns": [
      "gpt-5.5"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh"
    },
    "defaultEffort": "medium",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1050000,
    "maxTokens": 128000,
    "note": "GPT-5.5 档位：None / Low / Medium(默认) / High / XHigh，带图输入。pro 变体仅 Medium / High(默认) / XHigh 且仅 Responses API。"
  },
  {
    "id": "openai-gpt-5-4",
    "patterns": [
      "gpt-5.4"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh"
    },
    "defaultEffort": "off",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1050000,
    "maxTokens": 128000,
    "note": "GPT-5.4 档位：None(默认) / Low / Medium / High / XHigh，带图输入。pro 变体仅 Medium/High/XHigh；mini/nano 为 400K 上下文。"
  },
  {
    "id": "openai-gpt-5-3",
    "patterns": [
      "gpt-5.3"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh"
    },
    "defaultEffort": "medium",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 400000,
    "maxTokens": 128000,
    "note": "GPT-5.3-Codex 档位：Low / Medium / High / XHigh（无 None 档），带图输入、400K；gpt-5.3-chat 为非推理聊天模型（见 chat 条目）。"
  },
  {
    "id": "openai-gpt-5-1",
    "patterns": [
      "gpt-5.1"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "defaultEffort": "off",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 400000,
    "maxTokens": 128000,
    "note": "GPT-5.1 档位：None / Low / Medium / High（默认 None）。"
  },
  {
    "id": "openai-gpt-5-1-codex",
    "patterns": [
      "gpt-5.1-codex"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 400000,
    "maxTokens": 128000,
    "note": "GPT-5.1-Codex 系列：官方模型页未单列 effort 值域，按同代保守档 Low / Medium / High（无 None；xhigh 未证实）。如端点支持 xhigh/none 可手调。"
  },
  {
    "id": "openai-gpt-5",
    "patterns": [
      "gpt-5"
    ],
    "efforts": {
      "minimal": "minimal",
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "defaultEffort": "medium",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 400000,
    "maxTokens": 128000,
    "note": "GPT-5 初代档位：Minimal / Low / Medium / High，无关闭档。"
  },
  {
    "id": "openai-chat",
    "patterns": [
      "gpt-5.1-chat-latest",
      "gpt-5.2-chat-latest",
      "gpt-5.3-chat-latest",
      "gpt-5-chat-latest",
      "gpt-chat-latest",
      "gpt-5-chat",
      "gpt-5.1-chat",
      "gpt-5.2-chat",
      "gpt-5.3-chat"
    ],
    "efforts": false,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 128000,
    "maxTokens": 16384,
    "note": "-chat 系列（官方 id 为 gpt-5.x-chat-latest）为非推理聊天模型，不支持 effort 参数（勿勾思考档）；官方支持图片输入，128K / 16,384 输出。gpt-5-chat-latest 已于 2026-07-23 下架、gpt-chat-latest 已无官方页面（保留模式供网关）。"
  },
  {
    "id": "openai-o",
    "patterns": [
      "o1",
      "o3",
      "o4"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "defaultEffort": "medium",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 200000,
    "maxTokens": 100000,
    "note": "OpenAI o 系档位：Low / Medium / High。官方已于 2026-06 公告退役（o1/o1-pro/o3-mini/o4-mini 2026-10-23 移除、o3/o3-pro 2026-12-11），网关残留仍可命中；多数 o 系端点收图（o3-mini 例外）。"
  },
  {
    "id": "openai-gpt-oss",
    "patterns": [
      "gpt-oss"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "defaultEffort": "low",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "contextWindow": 131072,
    "maxTokens": 131072,
    "note": "GPT-OSS 开源权重（Ollama/vLLM 常见）：reasoning effort Low / Medium / High，纯文本，131K 上下文 / 131K 输出。2026-09 复核：官方模型页现在写 Chat Completions = Not supported、无图片输入（默认 Low 来自官方 CLI，不是 API 页），因此这里不再声明 Off。"
  },
  {
    "id": "openai-gpt-6-astra",
    "patterns": [
      "gpt-6-astra",
      "gpt-6"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh",
      "max": "max"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1050000,
    "maxTokens": 128000,
    "note": "GPT-6 Astra 档位：Low / Medium / High / XHigh / Max——**没有 None 档**（官方原文：设为 none 返回 HTTP 400），因此本条目不声明 Off。带图输入，1,050,000 上下文 / 128,000 输出；AI 官方默认档位未公布，故不填。工具调用需走 Responses API。"
  },
  {
    "id": "openai-gpt-5-6-cyber",
    "patterns": [
      "gpt-5.6-cyber"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 400000,
    "maxTokens": 128000,
    "note": "GPT-5.6-Cyber：官方模型页未单列 effort 值域（不等于不支持），故按同代保守档 Low / Medium / High / XHigh；该型号仅 Responses API，带图输入、400K 上下文。官方支持的其他档位可手调后应用。"
  },
  {
    "id": "openai-gpt-4o",
    "patterns": [
      "gpt-4o"
    ],
    "efforts": false,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 128000,
    "maxTokens": 16384,
    "note": "GPT-4o 代际：非推理模型，不支持 effort 参数（勿勾思考档）；图片输入全系标配，128K / 16,384 输出。"
  },
  {
    "id": "openai-gpt-4-1",
    "patterns": [
      "gpt-4.1"
    ],
    "efforts": false,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1047576,
    "maxTokens": 32768,
    "note": "GPT-4.1 全系（含 mini/nano）：非推理模型，不支持 effort 参数；官方 1,047,576 上下文 / 32,768 输出，全系带图输入。"
  },
  {
    "id": "openai-gpt-4-turbo-preview",
    "patterns": [
      "gpt-4-turbo-preview"
    ],
    "efforts": false,
    "input": [
      "text"
    ],
    "contextWindow": 128000,
    "maxTokens": 4096,
    "note": "GPT-4 Turbo Preview：非推理模型，纯文本输入（正式 turbo 快照支持图片，见下条），128K。"
  },
  {
    "id": "openai-gpt-4-turbo",
    "patterns": [
      "gpt-4-turbo"
    ],
    "efforts": false,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 128000,
    "maxTokens": 4096,
    "note": "GPT-4 Turbo：非推理模型，官方支持图片输入，128K / 4,096 输出。"
  },
  {
    "id": "openai-gpt",
    "patterns": [
      "gpt-4",
      "gpt-3.5"
    ],
    "efforts": false,
    "input": [
      "text"
    ],
    "note": "GPT-4/3.5 代际：非推理模型，不支持 effort 参数（勿勾思考档）。gpt-4-turbo/4.1 起支持图片，见单独条目；新代请用 GPT-5 系（见 openai-chat/gpt-5.x 条目）。"
  },
  {
    "id": "anthropic-claude-5",
    "patterns": [
      "claude-fable-5",
      "claude-mythos-5",
      "claude-opus-5",
      "claude-sonnet-5"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh",
      "max": "max"
    },
    "defaultEffort": "high",
    "compat": {
      "supportsReasoningEffort": true
    },
    "anthropicAdaptive": true,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1000000,
    "maxTokens": 128000,
    "note": "Claude 5 代（Fable 5 / Mythos 5 / Opus 5 / Sonnet 5）档位：Low / Medium / High(默认) / XHigh / Max；Fable 5.1 与 Mythos 5.1 见单独条目，Mythos Preview 仅至 Max。1M 上下文 / 128K 输出（Batch 300K）。官方支持 PDF 输入。注意：Anthropic 官方 OpenAI 兼容层会忽略 effort 参数，声明在第三方网关映射时生效。"
  },
  {
    "id": "anthropic-claude-5-1",
    "patterns": [
      "claude-fable-5-1",
      "claude-mythos-5-1"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh",
      "max": "max"
    },
    "defaultEffort": "high",
    "compat": {
      "supportsReasoningEffort": true
    },
    "anthropicAdaptive": true,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1000000,
    "maxTokens": 128000,
    "note": "Claude Fable 5.1 / Mythos 5.1：官方档位 Low / Medium / High(默认) / XHigh / Max，自适应思考常开（不接受 enabled/disabled）。1M 上下文 / 128K 输出；这两型也是官方唯一允许会话中途改档的（需 beta header，本插件不涉及）。"
  },
  {
    "id": "anthropic-claude-mythos-preview",
    "patterns": [
      "claude-mythos-preview"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "max": "max"
    },
    "defaultEffort": "high",
    "compat": {
      "supportsReasoningEffort": true
    },
    "anthropicAdaptive": true,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1000000,
    "maxTokens": 128000,
    "note": "Claude Mythos Preview：官方档位 Low / Medium / High / Max（无 XHigh），1M 上下文。"
  },
  {
    "id": "anthropic-claude-opus-4-high",
    "patterns": [
      "claude-opus-4-8",
      "claude-opus-4-7"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh",
      "max": "max"
    },
    "defaultEffort": "high",
    "compat": {
      "supportsReasoningEffort": true
    },
    "anthropicAdaptive": true,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1000000,
    "maxTokens": 128000,
    "note": "Claude Opus 4.7/4.8 档位：Low / Medium / High(默认) / XHigh / Max；xhigh 为官方推荐的编码起步档。1M 上下文。"
  },
  {
    "id": "anthropic-claude-4-6",
    "patterns": [
      "claude-opus-4-6",
      "claude-sonnet-4-6"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "max": "max"
    },
    "defaultEffort": "high",
    "compat": {
      "supportsReasoningEffort": true
    },
    "anthropicAdaptive": true,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1000000,
    "maxTokens": 128000,
    "note": "Claude 4.6 代档位：Low / Medium / High / Max（无 XHigh——官方明言「支持 max 的部分型号不支持 xhigh」）。1M 上下文。"
  },
  {
    "id": "anthropic-claude-opus-4-5",
    "patterns": [
      "claude-opus-4-5"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 200000,
    "maxTokens": 64000,
    "note": "Claude Opus 4.5：官方 effort 支持列表（20251101 快照），档位 Low / Medium / High（无 XHigh/Max），可与 budget_tokens 并用；200K / 64K。"
  },
  {
    "id": "anthropic-claude",
    "patterns": [
      "claude"
    ],
    "efforts": false,
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 200000,
    "maxTokens": 64000,
    "note": "Claude 3.x 与 Sonnet 4.5 / Haiku 4.5：官方 effort 参数不支持（仅 Fable/Mythos 5、Opus 5/4.6-4.8、Sonnet 5/4.6、Opus 4.5 支持），思考由 thinking.type 控制——勿勾思考档。参考容量 200K / 64K（Haiku 3.5 为纯文本，按需取消图片）。"
  },
  {
    "id": "google-gemini",
    "patterns": [
      "gemini"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1048576,
    "maxTokens": 65536,
    "note": "Gemini 通用安全档：Low / Medium / High（官方 OpenAI 兼容映射表另收 minimal：2.5 系映射为 1,024 预算、3.1 Flash-Lite/3 Flash 原生 minimal、3.1 Pro 落 low）。none 仅能关 2.5 非 Pro；2.5 Pro 与 3 代不可关；各型默认不一（flash-lite 默认关）。官方另收音频/视频/PDF。"
  },
  {
    "id": "xai-grok-4-7",
    "patterns": [
      "grok-4.7"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 500000,
    "note": "Grok 4.7（上游快照 grok-4.7-20260916）：档位 Low / Medium / High / XHigh——**取自公开目录**（OpenRouter 的 supported_parameters、models.dev 对 docs.x.ai 的转述），本次 xAI 官方文档站不可达、未能一手证实；默认档位与\"能否关闭思考\"同样未证实，故不声明 Off，也不写默认档。带图输入（目录记 text+image+file，PDF 存疑），500K 上下文；最大输出各目录给出 450K 与 500K 两种值，按\"分歧即不写\"处理。2026-08 那次\"grok-4.7 不存在（官方 404）\"的结论已随发布作废。"
  },
  {
    "id": "xai-grok-high",
    "patterns": [
      "grok-4.6"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 500000,
    "note": "Grok 4.6 档位：Low / Medium / High(默认) / XHigh，思考不可关闭；带图输入、500K 上下文。Grok 4.7 见上一条（此前记为\"不存在\"，已随发布作废）。"
  },
  {
    "id": "xai-grok-4-5",
    "patterns": [
      "grok-4.5"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 500000,
    "note": "Grok 4.5 档位：Low / Medium / High(默认)，思考不可关闭；带图输入。传入 xhigh 会被官方静默按 High 处理。"
  },
  {
    "id": "xai-grok-4-3",
    "patterns": [
      "grok-4.3"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh"
    },
    "defaultEffort": "low",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1000000,
    "note": "Grok 4.3：官方四级 reasoning effort（None / Low / Medium / High），1M 上下文、带图输入；grok-4-fast 等旧 slug 2026-05-15 起自动重定向到本型号。"
  },
  {
    "id": "xai-grok",
    "patterns": [
      "grok"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "note": "Grok 通用档位：Low / Medium / High。初代 grok-4、grok-4.20 与 grok-build-0.1 不接受该参数（grok-4 系与 grok-3 已于 2026-05-15 退役并重定向至 4.3）；grok-4.20-multi-agent 的四档控制的是 agent 数量而非思考深度。新旧代际请优先选 4.5/4.6/4.3；多模态变体按需勾选图片。"
  },
  {
    "id": "mistral-magistral",
    "patterns": [
      "magistral"
    ],
    "efforts": false,
    "input": [
      "text"
    ],
    "contextWindow": 32768,
    "maxTokens": 32768,
    "note": "Magistral 原生思考线（无 effort 参数，为 prompt_mode 语义），官方已于 2026-07-28 声明弃用、逐步撤出；现役推理走 mistral-small-2603 / mistral-medium-3-5 的 reasoning_effort（见下条）。"
  },
  {
    "id": "mistral-medium-3",
    "patterns": [
      "mistral-medium-3.5",
      "mistral-small-latest",
      "mistral-small-2603"
    ],
    "efforts": {
      "off": "none",
      "high": "high"
    },
    "defaultEffort": "off",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "note": "Mistral 现役推理档：None / High——官方 reasoning_effort 枚举（mistral-common 协议库）即 none/high；mistral-small-2603（Small 4）与 mistral-medium-3-5 经它控制，Medium 3.5 带视觉。容量未在官方目录页单列，不提供。"
  },
  {
    "id": "qwen-vision",
    "patterns": [
      "qwen-vl",
      "qwen2-vl",
      "qwen2-5-vl",
      "qwen3-vl",
      "qvq"
    ],
    "efforts": {
      "off": null,
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "qwen"
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 131072,
    "maxTokens": 8192,
    "note": "通义视觉线（Qwen-VL/QvQ）：enable_thinking 开关（开=High），收图。qwen3-vl 容量更大，按需上调。"
  },
  {
    "id": "qwen-3-8",
    "patterns": [
      "qwen3.8"
    ],
    "efforts": {
      "off": null,
      "low": "low",
      "medium": "medium",
      "xhigh": "xhigh"
    },
    "defaultEffort": "xhigh",
    "compat": {
      "thinkingFormat": "qwen",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1000000,
    "note": "Qwen 3.8 系：官方 reasoning_effort 档位 XHigh(默认) / Medium / Low，thinking 默认开、可按请求关闭；原生多模态（qwen3.8-max 图像/视频理解，视频未入核心词表）。1M 档上下文。27B 与 Flash-Next 开源款见单独条目。"
  },
  {
    "id": "qwen-3-8-27b",
    "patterns": [
      "qwen3.8-27b"
    ],
    "efforts": {
      "off": null,
      "low": "low",
      "medium": "medium",
      "xhigh": "xhigh"
    },
    "defaultEffort": "xhigh",
    "compat": {
      "thinkingFormat": "qwen",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 262144,
    "note": "Qwen3.8-27B（dense，2026-08-14 开源）：官方 reasoning_effort 档位 XHigh(默认) / Medium / Low，thinking 默认开、可按请求关；原生图像+视频理解（视频未入核心词表）。262,144 原生上下文、官方声明可扩至 1M。来源：HF Qwen/Qwen3.8-27B 模型卡。"
  },
  {
    "id": "qwen-3-8-flash-next",
    "patterns": [
      "qwen3.8-flash-next"
    ],
    "efforts": {
      "off": null,
      "low": "low",
      "medium": "medium",
      "xhigh": "xhigh"
    },
    "defaultEffort": "xhigh",
    "compat": {
      "thinkingFormat": "qwen",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 262144,
    "note": "Qwen3.8-Flash-Next（125B-A6B 实验架构，Qwen4 前身）：官方 reasoning_effort 档位 XHigh(默认) / Medium / Low + enable_thinking 开关；原生视觉（Vision Encoder）。262,144 原生上下文、可扩至 1M。来源：HF 模型卡与 qwen.ai 官方博客。"
  },
  {
    "id": "qwen",
    "patterns": [
      "qwen",
      "qwq"
    ],
    "efforts": {
      "off": null,
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "qwen"
    },
    "input": [
      "text"
    ],
    "contextWindow": 1000000,
    "maxTokens": 65536,
    "note": "通义千问：enable_thinking 开关（无 effort 档），开=High；现役旗舰为 qwen3.8 系（1M 档上下文，见 qwen-3-8 条目）。3.6/3.7 代的 Plus/Flash 亦默认多模态（图片/视频），如接入请按需勾选图片；视觉线见 qwen-vision 条目。"
  },
  {
    "id": "glm-vision",
    "patterns": [
      "glm-4v",
      "glm-4-6v",
      "glm-4-5v",
      "glm-5v"
    ],
    "efforts": {
      "off": null,
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "zai"
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 131072,
    "maxTokens": 32768,
    "note": "智谱视觉线（GLM-4V/4.5V/4.6V/5V）：thinking 开关（开=High），收图。GLM-4.5V 为强制思考（传 disabled 报错，请手动删 Off 档）。"
  },
  {
    "id": "glm-5-3-flash",
    "patterns": [
      "glm-5.3-flash"
    ],
    "efforts": {
      "low": "low",
      "high": "high",
      "max": "max"
    },
    "defaultEffort": "max",
    "compat": {
      "thinkingFormat": "zai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1048576,
    "maxTokens": 131072,
    "note": "GLM-5.3-Flash（320B，官方文档 vlm 分类）：强制思考（thinking.type 仅 enabled，不支持关闭），文本参数与 GLM-5.3 一致——档位 Low / High / Max。输入模态：视频、图像、文本、文件（视频/文件未入核心词表，图片可勾）。官方 1M 上下文 / 128K 最大输出。来源：docs.bigmodel.cn 模型页。"
  },
  {
    "id": "glm-5-3",
    "patterns": [
      "glm-5.3"
    ],
    "efforts": {
      "low": "low",
      "high": "high",
      "max": "max"
    },
    "defaultEffort": "max",
    "compat": {
      "thinkingFormat": "zai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "contextWindow": 1048576,
    "maxTokens": 131072,
    "note": "GLM-5.3 档位：Low / High / Max（强制思考，其余值报错）。官方容量 1M / 128K。"
  },
  {
    "id": "glm-5-2",
    "patterns": [
      "glm-5.2"
    ],
    "efforts": {
      "off": "none",
      "minimal": "minimal",
      "low": "low",
      "medium": "medium",
      "high": "high",
      "xhigh": "xhigh",
      "max": "max"
    },
    "defaultEffort": "max",
    "compat": {
      "thinkingFormat": "zai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "contextWindow": 1048576,
    "maxTokens": 131072,
    "note": "GLM-5.2 档位：None / Minimal / Low / Medium / High / XHigh / Max（官方映射：Low·Medium→High、XHigh→Max、None·Minimal=停止思考）。视觉线见 glm-vision 条目。"
  },
  {
    "id": "glm",
    "patterns": [
      "glm",
      "zhipu",
      "chatglm"
    ],
    "efforts": {
      "off": null,
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "zai"
    },
    "input": [
      "text"
    ],
    "note": "GLM 通用：thinking 开关（无 effort 档），开=High；effort 阶梯仅 GLM-5.2+ 支持（见上两条目）。注意 GLM-4.7/GLM-4.5V 为强制思考，传 disabled 会报错（请手动删 Off 档）。视觉线见 glm-vision 条目。"
  },
  {
    "id": "kimi-k3",
    "patterns": [
      "kimi-k3"
    ],
    "efforts": {
      "low": "low",
      "high": "high",
      "max": "max"
    },
    "defaultEffort": "max",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1048576,
    "note": "Kimi K3 档位：Low / High / Max(默认 Max)，走顶层 reasoning_effort；始终推理、勿传 thinking 对象。原生视觉理解，1M 上下文（最大输出官方未单独列，不提供）。"
  },
  {
    "id": "kimi-k2-vision",
    "patterns": [
      "kimi-k2.6",
      "kimi-k2.5"
    ],
    "efforts": {
      "off": null,
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "deepseek"
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 262144,
    "note": "Kimi K2.5/K2.6 视觉代：thinking.type 开关（默认开、可关），开=High；带视觉，256K。K2.7 Code 始终思考，见单独条目。"
  },
  {
    "id": "kimi-k27-code",
    "patterns": [
      "kimi-k2.7"
    ],
    "efforts": {
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "deepseek"
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 262144,
    "note": "Kimi K2.7 Code（含高速版）：始终思考——thinking.type 仅接受 enabled（传 disabled 报错），无 Off 档；带视觉，256K。"
  },
  {
    "id": "kimi-moonshot-v1-vision",
    "patterns": [
      "moonshot-v1-8k-vision",
      "moonshot-v1-32k-vision",
      "moonshot-v1-128k-vision"
    ],
    "efforts": false,
    "input": [
      "text",
      "image"
    ],
    "note": "Moonshot V1 视觉旧代（8k/32k/128k 各一）：无思考控件（生成模型）、支持图片输入；该线已停止对新用户开放（2026-08-31 全量下线，网关残留仍可命中）。"
  },
  {
    "id": "kimi",
    "patterns": [
      "kimi",
      "moonshot"
    ],
    "efforts": {
      "off": null,
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "deepseek"
    },
    "input": [
      "text"
    ],
    "contextWindow": 262144,
    "note": "Kimi 通用：thinking 开关（无 effort 档），开=High。k2 系列 2026-05-25 下线、kimi-latest 2026-01-28 下线、moonshot-v1 系 2026-08-31 全量下线（网关残留仍可命中；moonshot-v1 本身非思考模型）。视觉代与 K2.7 Code 见单独条目。"
  },
  {
    "id": "hunyuan-hy3",
    "patterns": [
      "hy3"
    ],
    "efforts": {
      "low": "low",
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "contextWindow": 262144,
    "note": "混元 hy3：开源契约经 chat_template_kwargs.reasoning_effort = no_think(默认)/low/high；官方模型卡 256K 上下文（295B MoE，2026 开源）。"
  },
  {
    "id": "hunyuan-hy4",
    "patterns": [
      "hy4-preview",
      "hy-4-preview"
    ],
    "efforts": {
      "off": "no_think",
      "high": "high"
    },
    "defaultEffort": "high",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "contextWindow": 1000000,
    "note": "混元 Hy4 preview：官方 README——reasoning 默认 high（深度思考），关闭经 chat_template_kwargs.reasoning_effort=no_think；官方规格表 1M 上下文（770B-A49B MoE，Gated DSA）。low 档官方未列，如有请手调；视觉未声明，按需手勾。来源：Tencent-Hunyuan/Hy4-preview 官方 README。"
  },
  {
    "id": "step-5-preview",
    "patterns": [
      "step-5"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "defaultEffort": "medium",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1000000,
    "maxTokens": 65536,
    "note": "阶跃 Step-5-Preview（官方 id 即 step-5-preview，无裸 step-5；pattern 取家族主干以兼容网关写法）：档位 Low / Medium(官方标\"默认推荐\") / High，思考不可关闭；原生图片 + 视频输入；1M 上下文、64K 最大输出（官方另注 max_tokens 默认 INF、与 64K 上限并存，以端点实测为准）。"
  },
  {
    "id": "step-3-7",
    "patterns": [
      "step-3.7",
      "step-3.6"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "defaultEffort": "medium",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 262144,
    "note": "阶跃 Step-3.6/3.7 档位：Low / Medium(默认推荐) / High，原生图片+视频理解。上下文为输入+输出总和上限。"
  },
  {
    "id": "step-3-5",
    "patterns": [
      "step-3.5"
    ],
    "efforts": {
      "low": "low",
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "contextWindow": 262144,
    "note": "阶跃 Step-3.5 Flash 档位：Low / High（纯文本推理旗舰）。上下文为输入+输出总和上限。"
  },
  {
    "id": "step",
    "patterns": [
      "step-3",
      "step-2"
    ],
    "efforts": {
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "defaultEffort": "medium",
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "note": "阶跃 Step 档位：Low / Medium / High（默认 Medium，不可关闭）。3.6/3.7 视觉代见单独条目。"
  },
  {
    "id": "doubao",
    "patterns": [
      "doubao",
      "seed"
    ],
    "efforts": {
      "off": null,
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "note": "豆包档位：Off / Low / Medium / High——effort 阶梯仍是社区证据、官方 Ark 文档明列的为 thinking.type 开关（2026-08-24 复核仍未见到 effort 官方明文）。seed 代收图（1.5-pro 例外）。"
  },
  {
    "id": "minimax-m3",
    "patterns": [
      "minimax-m3"
    ],
    "efforts": {
      "off": null,
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "deepseek"
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1048576,
    "note": "MiniMax-M3：官方 thinking 参数 enabled/adaptive/disabled（无 effort 档），开=High、关=disabled；原生多模态（图/视频，核心词表仅含图），1M 上下文。"
  },
  {
    "id": "mimo-v2-6",
    "patterns": [
      "mimo-v2.6",
      "mimo-v2.5"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text",
      "image"
    ],
    "contextWindow": 1048576,
    "maxTokens": 131072,
    "note": "小米 MiMo v2.6 系列（mimo-v2.6-pro / -flash / -pro-ultraspeed；1M 上下文 / 128K 最大输出、原生全模态）与其前代 mimo-v2.5。官方文档：thinking.type（enabled/disabled，默认 enabled）+ reasoning.effort（none 关闭；其余合法值均开启，且**现阶段暂未区分推理强度**——minimal 归一为 low、xhigh/max/ultra 归一为 high），因此这里声明的是端点**接受**的档位 Off / Low / Medium / High（xhigh、max 不声明，端点只会折叠为 high）。思考模式下 temperature / top_p 不可自定义（强制 1.0 / 0.95）；带工具调用的历史轮必须完整回传 reasoning_content，否则 400。mimo-v2.5 与 v2.5-pro 官方定于 2026-10-21 下线。"
  },
  {
    "id": "mimo-v2-5-pro",
    "patterns": [
      "mimo-v2.5-pro"
    ],
    "efforts": {
      "off": "none",
      "low": "low",
      "medium": "medium",
      "high": "high"
    },
    "compat": {
      "thinkingFormat": "openai",
      "supportsReasoningEffort": true
    },
    "input": [
      "text"
    ],
    "contextWindow": 1048576,
    "maxTokens": 131072,
    "note": "小米 MiMo v2.5-Pro：该家族唯一的**纯文本**成员（官方能力表未列全模态理解），1M 上下文 / 128K 最大输出，推理契约与 v2.6 系列相同（thinking.type + reasoning.effort，none 关闭、其余档位暂不区分强度）。官方定于 2026-10-21 下线。"
  },
  {
    "id": "baidu-ernie",
    "patterns": [
      "ernie"
    ],
    "efforts": false,
    "input": [
      "text"
    ],
    "contextWindow": 131072,
    "note": "百度千帆 ERNIE 系：官方 OpenAI 兼容接口无 reasoning_effort 参数——思考由模型变体决定（-Thinking 系列始终思考、普通系列不思考），勿勾思考档。ERNIE 4.5 Turbo VL 支持图片，按需手勾；参考容量取 Turbo 128K 档。"
  }
]
