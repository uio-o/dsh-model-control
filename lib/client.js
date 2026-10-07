// Browser half of dsh-model-picker v2. Loaded through the web plugin loader
// (window.__ModuleLoader__); React comes from the platform module table.
//
// Two-zone trigger button:
//   LEFT  (model label) → model picker popup (search-first)
//   RIGHT (effort label) → effort picker popup (standalone)
//
// Data rides the SAME per-session ModelDirectory as the /model popup
// (ctx.modelDirectories), so a switch made in either surface is what the
// other shows next.
window.__ModuleLoader__.load({ id: 'dsh-model-control', factory: (require) => {
  var module = { exports: {} }; var exports = module.exports;

  const React = require('react')
  const { useState, useEffect, useRef, useMemo, useSyncExternalStore, Fragment } = React
  const h = React.createElement

  // --- Locale ---
  let LOCALE = 'en'
  try {
    const nl = String(navigator.language || navigator.userLanguage || '')
    if (nl.toLowerCase().startsWith('zh')) LOCALE = 'zh'
  } catch (e) {}

  const STR = {
    zh: {
      triggerFallback: '选择模型',
      search: '搜索模型或提供商…',
      loading: '加载中…',
      retry: '重试',
      noModels: '暂无可用的模型',
      providerEmpty: '该提供商暂无模型',
      noMatch: '没有匹配的模型',
      effortHeading: '推理层级',
      providerDefault: '提供方默认',
      selectFailed: '选择失败，请重试',
      selectFailedMsg: '选择失败：',
      providers: '提供商',
      allProviders: '全部提供商',
      contextWindow: '上下文窗口',
      favorites: '收藏',
      favoritesEmpty: '还没有收藏的模型',
      favoriteAdd: '加入收藏',
      favoriteRemove: '取消收藏',
      imageNative: '支持图片输入（模型原生视觉）',
      imageBridged: '支持图片输入（modlens 桥接：模型看到的是转写文本，不是原图）',
      groupByVendor: '按厂家分组',
      groupByProvider: '按提供商分组',
      setDefault: '设为默认档',
      clearDefault: '清除默认档',
      isDefault: '默认',
      advised: '推荐',
      adviceHigh: '知识库匹配',
      adviceMedium: '按厂商推断',
      adviceLow: '通用推断',
      // Model-selection page (functional first pass; visual pass later)
      pageTitle: '模型管理',
      pageHint: '拉取渠道实际提供的模型，勾选后加入本软件使用。未勾选的模型不会出现在任何模型选择入口。',
      refresh: '刷新',
      fetchAvailable: '拉取可用模型',
      fetching: '拉取中…',
      saveSelection: '保存选择',
      saving: '保存中…',
      selectAll: '全选',
      selectNone: '全不选',
      selectedCount: '已选 {0} / {1}',
      noProviders: '还没有配置任何渠道。',
      hostStale: '宿主半未加载（路由 404）：请重载本插件或重启 DSH，让宿主半与新页面版本一致。',
      noDraft: '尚未拉取。点击「拉取可用模型」获取该渠道提供的模型列表。',
      channelModels: '已加入',
      credentialOk: '凭据已配置',
      credentialMissing: '凭据缺失',
      savedNotice: '已保存：新增 {0}，移除 {1}，保留 {2}',
      applyAdvice: '应用建议档位',
      applyAdviceAll: '全部应用建议档位',
      applyAdviceHint: '按知识库写入思考档位声明；已声明过的模型不会被覆盖',
      appliedNotice: '已写入 {0} 个模型（共检查 {1} 个）',
      diagnose: '诊断',
      takeoverLabel: '接管官方「模型」页',
      takeoverOnHint: '官方模型页已隐藏，本页接管；关闭后官方页回来（需重启应用生效）',
      takeoverOffHint: '官方模型页同时显示；开启后隐藏它（需重启应用生效）',
      takeoverOn: '已开启接管',
      takeoverOff: '已关闭接管',
      takeoverOnRestart: '已写入：隐藏官方模型页。重启应用后生效。',
      takeoverOffRestart: '已写入：恢复官方模型页。重启应用后生效。',
      addChannel: '添加渠道',
      create: '创建',
      edit: '编辑',
      remove: '删除',
      save: '保存',
      cancel: '取消',
      refresh2: '刷新',
      fieldId: '渠道 ID',
      fieldDisplayName: '显示名称',
      fieldApi: '接口协议',
      fieldBaseURL: '接口地址',
      fieldApiKeyEnv: '密钥变量名（可留空）',
      fieldApiKey: '密钥',
      keyNameAuto: '留空自动生成',
      keyKeepPlaceholder: '已配置，留空则不修改',
      keyHint: '密钥会存进本机的凭据存储（和官方页同一个位置），配置文件里只留变量名，不会写入明文。',
      apiKeyEnvHint: '直接粘贴密钥即可。下面的变量名可以留空（自动按渠道 ID 生成），也可以自己指定——密钥存在凭据里，不写进配置文件。',
      channelIdRequired: '请先填写渠道 ID',
      channelAdded: '已创建渠道 {0}',
      channelAddedWithKey: '已创建渠道 {0}，密钥已保存',
      channelSaved: '已保存渠道 {0}',
      channelSavedWithKey: '已保存渠道 {0}，密钥已更新',
      channelRemoved: '已删除渠道 {0}',
      channelHide: '隐藏',
      channelShow: '显示',
      channelHidden: '已隐藏',
      builtinChannel: '内置渠道',
      settings: '设置',
      collapse: '收起',
      entryHint: '这是内置渠道自己的配置（不属于自建渠道文档），改动写回它自己的配置项。',
      entryInherit: '（不修改）',
      entryClear: '（清除，恢复默认）',
      entryKeyHint: '密钥存进本机凭据存储，变量名：',
      entryNoKeyField: '该渠道用登录授权（没有密钥字段），这里只改接口地址与思考设置。',
      entryUnavailable: '该渠道当前不可配置（找不到它的配置项）。',
      entryNsLabel: '配置命名空间',
      entryNsNone: '未声明',
      entryNsMissing: '未找到配置项',
      fieldNs: '配置命名空间',
      entryNsHelp: '自动探测没找到这个渠道的配置项。请在上面填它的配置命名空间（例如 llm-deepseek），保存时会校验。',
      entrySaved: '已保存内置渠道配置',
      entrySavedWithKey: '已保存内置渠道配置，密钥已更新',
      fieldOfficialEffort: '思考档位',
      fieldOfficialThinking: '思考开关',
      effortPage: '档位设置',
      effortHint: '每一档都给出输入框：左边勾选是否启用，右边可改该档的实际取值。保存后输入框的档位控件才会出现。',
      adaptive: '自适应',
      adaptiveHint: '勾选后由上游自行决定强度（写入 forceAdaptiveThinking）',
      offKept: '保留已声明的 off',
      declaredLabel: '当前声明',
      declaredNone: '已声明为「无档位」',
      declaredEmpty: '未声明',
      suggestedLabel: '建议来源',
      noReasoning: '无档位',
      effortSaved: '已写入 {0} 的档位',
      abilityTitle: '模型能力',
      abilityText: '文本输入',
      abilityImage: '图片输入（识图）',
      abilitySuggested: '建议',
      abilityContext: '上下文窗口',
      abilityMaxTokens: '最大输出',
      abilitySave: '保存能力',
      abilitySaved: '已写入 {0} 的能力',
      abilityBadNumber: '{0} 必须是正整数',
      abilityToolsNote: '工具调用在 pi-ai 里没有“该模型是否支持”的开关（所有协议都假定可用）；图片生成属于独立的图片模型注册表，聊天模型没有输出图片字段，故不在此处提供。',
      pickChannel: '从左侧选一个渠道',
      moreActions: '更多操作',
      channelCustom: '自定义',
      modelsLabel: '模型',
      modelsHint: '尚未拉取。点「拉取可用模型」获取该渠道提供的模型列表。',
      syncModels: '同步模型',
      fetchHint: '点「拉取可用模型」拉取该渠道支持的模型，勾选后保存即加入；只有加入的模型会出现在模型选择器里。',
      editChannel: '渠道配置',
      candidatesLabel: '可加入 {0} 个',
      noModelsYet: '这个渠道还没有模型。点「拉取可用模型」拉取后勾选加入。',
      probe: '测试连接',
      probing: '测试中…',
      fetchModelsHere: '拉取模型',
      probeOk: '连接成功，端点返回 {0} 个模型',
      probeOkNoModels: '端点能连通，但没有返回任何模型。请核对接口地址与协议。',
      probeReachable: '连接成功，端点返回 {0} 个模型',
      probeFailed: '连接失败',
      fetchedCount: '拉取到 {0} 个模型',
      pickAtLeastOne: '请至少勾选一个模型：pi-ai 不接受空模型列表的渠道',
      createNeedsModels: '注意：必须至少勾选一个模型才能创建。pi-ai 会拒绝 models 为空的渠道（内置目录不认识自定义路由，没有默认值可回退）。',
    },
    en: {
      triggerFallback: 'Select model',
      search: 'Search model or provider…',
      loading: 'Loading…',
      retry: 'Retry',
      noModels: 'No models available',
      providerEmpty: 'No models for this provider',
      noMatch: 'No matching models',
      effortHeading: 'Reasoning Effort',
      providerDefault: 'Provider default',
      selectFailed: 'Selection failed, retry',
      selectFailedMsg: 'Selection failed: ',
      providers: 'Providers',
      allProviders: 'All providers',
      contextWindow: 'Context window',
      favorites: 'Favorites',
      favoritesEmpty: 'No favorite models yet',
      favoriteAdd: 'Add to favorites',
      favoriteRemove: 'Remove from favorites',
      imageNative: 'Accepts images (native vision)',
      imageBridged: 'Accepts images (modlens bridge: the model sees transcribed text, not the picture)',
      groupByVendor: 'Group by vendor',
      groupByProvider: 'Group by provider',
      setDefault: 'Set as default effort',
      clearDefault: 'Clear default effort',
      isDefault: 'Default',
      advised: 'Suggested',
      adviceHigh: 'Knowledge base match',
      adviceMedium: 'Vendor family inference',
      adviceLow: 'Generic inference',
      pageTitle: 'Models',
      pageHint: 'Fetch the models this channel actually serves, then tick the ones to bring into this app. Unticked models appear in no picker.',
      refresh: 'Refresh',
      fetchAvailable: 'Fetch available models',
      fetching: 'Fetching…',
      saveSelection: 'Save selection',
      saving: 'Saving…',
      selectAll: 'All',
      selectNone: 'None',
      selectedCount: '{0} of {1} selected',
      noProviders: 'No channel is configured yet.',
      hostStale: 'Host half not loaded (route 404): reload this plugin or restart DSH so the host half matches the page.',
      noDraft: 'Not fetched yet. Use “Fetch available models” to read this channel’s list.',
      channelModels: 'Added',
      credentialOk: 'Credential configured',
      credentialMissing: 'Credential missing',
      savedNotice: 'Saved: {0} added, {1} removed, {2} kept',
      applyAdvice: 'Apply suggested efforts',
      applyAdviceAll: 'Apply to all models',
      applyAdviceHint: 'Writes the knowledge-base effort ladder; models that already declare one are left alone',
      appliedNotice: 'Declared {0} of {1} models checked',
      diagnose: 'Diagnose',
      takeoverLabel: 'Take over the official Models page',
      takeoverOnHint: 'The official Models page is hidden and this page takes over; turn off to bring it back (needs an app restart)',
      takeoverOffHint: 'The official Models page is shown alongside; turn on to hide it (needs an app restart)',
      takeoverOn: 'Takeover on',
      takeoverOff: 'Takeover off',
      takeoverOnRestart: 'Written: the official Models page is hidden. Restart the app to apply.',
      takeoverOffRestart: 'Written: the official Models page is restored. Restart the app to apply.',
      addChannel: 'Add channel',
      create: 'Create',
      edit: 'Edit',
      remove: 'Remove',
      save: 'Save',
      cancel: 'Cancel',
      refresh2: 'Refresh',
      fieldId: 'Channel id',
      fieldDisplayName: 'Display name',
      fieldApi: 'Protocol',
      fieldBaseURL: 'Endpoint',
      fieldApiKeyEnv: 'Key variable name (optional)',
      fieldApiKey: 'API key',
      keyNameAuto: 'auto-generated when blank',
      keyKeepPlaceholder: 'configured — leave blank to keep',
      keyHint: 'The key is stored in this machine\'s credential store (the same place the official page uses); the config keeps only the variable name.',
      apiKeyEnvHint: 'Paste the key directly. The variable name below may stay blank (it is derived from the channel id) or be set by you — the key lives in the credential store, never in the config file.',
      channelIdRequired: 'Enter a channel id first',
      channelAdded: 'Created channel {0}',
      channelAddedWithKey: 'Created channel {0} with its key',
      channelSaved: 'Saved channel {0}',
      channelSavedWithKey: 'Saved channel {0} and updated its key',
      channelRemoved: 'Removed channel {0}',
      channelHide: 'Hide',
      channelShow: 'Show',
      channelHidden: 'hidden',
      builtinChannel: 'built-in',
      settings: 'Settings',
      collapse: 'Collapse',
      entryHint: 'This is the built-in channel\'s own configuration (not a row of the pi-ai document); changes are written back to its own settings entry.',
      entryInherit: '(leave unchanged)',
      entryClear: '(clear — restore the default)',
      entryKeyHint: 'Stored in the machine credential store under:',
      entryNoKeyField: 'This channel authenticates by login and has no key field; only its endpoint and thinking settings are editable here.',
      entryUnavailable: 'This channel cannot be configured right now (its settings entry was not found).',
      entryNsLabel: 'settings namespace',
      entryNsNone: 'not declared',
      entryNsMissing: 'entry not found',
      fieldNs: 'Settings namespace',
      entryNsHelp: 'Auto-detection found no settings entry for this channel. Type its namespace above (e.g. llm-deepseek); it is validated on save.',
      entrySaved: 'Saved the built-in channel configuration',
      entrySavedWithKey: 'Saved the built-in channel configuration and updated its key',
      fieldOfficialEffort: 'Thinking effort',
      fieldOfficialThinking: 'Thinking switch',
      effortPage: 'Efforts',
      effortHint: 'Every level gets a box: tick the ones to declare, and edit the wire value next to it. The composer control appears once a declaration is written.',
      adaptive: 'Adaptive',
      adaptiveHint: 'let the upstream pick the strength (writes forceAdaptiveThinking)',
      offKept: 'keeps the declared off',
      declaredLabel: 'declared',
      declaredNone: 'declared as "no levels"',
      declaredEmpty: 'not declared',
      suggestedLabel: 'suggested by',
      noReasoning: 'No levels',
      effortSaved: 'Wrote the effort ladder for {0}',
      abilityTitle: 'Model capabilities',
      abilityText: 'Text input',
      abilityImage: 'Image input (vision)',
      abilitySuggested: 'suggested',
      abilityContext: 'Context window',
      abilityMaxTokens: 'Max output',
      abilitySave: 'Save capabilities',
      abilitySaved: 'Wrote the capabilities for {0}',
      abilityBadNumber: '{0} must be a positive integer',
      abilityToolsNote: 'pi-ai has no per-model "supports tools" switch — every protocol it speaks assumes tool use; image generation belongs to a separate image-model registry, and a chat model has no image-output field. Neither is offered here.',
      pickChannel: 'Pick a channel on the left',
      moreActions: 'More actions',
      channelCustom: 'Custom',
      modelsLabel: 'Models',
      modelsHint: 'Nothing fetched yet. Use “Fetch models” to list what this channel offers.',
      syncModels: 'Sync models',
      fetchHint: 'Fetch the models this channel offers, tick the ones you want, then save. Only added models appear in the model pickers.',
      editChannel: 'Channel settings',
      candidatesLabel: '{0} available to add',
      noModelsYet: 'This channel has no models yet. Fetch models, then tick the ones to add.',
      probe: 'Test connection',
      probing: 'Testing…',
      fetchModelsHere: 'Fetch models',
      probeOk: 'Connected — the endpoint returned {0} models',
      probeOkNoModels: 'The endpoint answers but returned no models. Check the base URL and the protocol.',
      probeReachable: 'Connected — the endpoint returned {0} models',
      probeFailed: 'Connection failed',
      fetchedCount: 'Fetched {0} models',
      pickAtLeastOne: 'Pick at least one model: pi-ai refuses a channel with an empty model list',
      createNeedsModels: 'At least one model is required to create this channel. pi-ai rejects a provider whose models array is empty, and a route the installed catalog does not describe has no defaults to fall back on.',
    },
  }
  const t = (key) => STR[LOCALE][key] ?? STR.en[key]

  /**
   * Sentinel for "remove this key from the built-in channel's config".
   *
   * A select cannot carry `null` as a value, so a written level would otherwise
   * be permanent: the page could set `reasoningEffort` but never put the channel
   * back to its shipped default.
   */
  const ENTRY_CLEAR = '__clear__'
  const entryOptionLabel = (value) => {
    if (value === '') return t('entryInherit')
    if (value === ENTRY_CLEAR) return t('entryClear')
    return value
  }
  /** Tiny positional formatter for the few strings that carry counts. */
  const tf = (key, ...values) => {
    let text = t(key)
    values.forEach((value, index) => { text = text.replace('{' + index + '}', String(value)) })
    return text
  }

  // --- Styles ---
  const CSS = `
/* ───────── root + trigger (two-zone) ───────── */
/* The label zone is sized by its content and shrinks only when the composer
   row runs out of space, so the model name stays readable. */
.dsh-mp2-root{position:relative;min-width:0;display:inline-flex}
/* max-width leaves room for the supplier chip (16px + 4px gap) on top of the
   model name budget, so wearing the chip never costs the name a character. */
.dsh-mp2-trigger{display:flex;align-items:stretch;min-width:0;max-width:240px;height:28px;border:none;border-radius:24px;outline:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;font-weight:500;cursor:pointer;overflow:hidden;padding:0}
.dsh-mp2-trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-mp2-trigger:focus-within{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
.dsh-mp2-triggerLocked{color:var(--dsw-alias-label-dimmed)}
.dsh-mp2-triggerLeft{display:flex;align-items:center;gap:4px;min-width:0;flex:0 1 auto;padding:0 2px 0 8px;border:none;background:transparent;color:inherit;font:inherit;cursor:pointer;overflow:hidden}
.dsh-mp2-triggerLeft:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
.dsh-mp2-triggerLeft:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-radius:24px 0 0 24px}
.dsh-mp2-triggerLabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-mp2-triggerDivider{width:1px;flex:0 0 auto;background:var(--dsw-alias-border-l1)}
.dsh-mp2-triggerRight{display:flex;align-items:center;gap:2px;flex:0 0 auto;padding:0 6px;border:none;background:transparent;color:var(--dsw-alias-label-caption);font:inherit;font-size:11px;line-height:20px;cursor:pointer}
.dsh-mp2-triggerRight:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-radius:0 24px 24px 0}
.dsh-mp2-triggerRight:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
/* Icons are block-level inside their wrapper. An inline <svg> sits on the text
   baseline, so the font's descender space below it pushes the glyph above the
   centre of its own line box — which is what knocked the trigger chevron and
   the row check marks off the text's horizontal line. */
.dsh-mp2-root svg{display:block}
.dsh-mp2-chevron{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-caption);transition:transform 120ms ease}
.dsh-mp2-chevronOpen{transform:rotate(180deg)}

/* ───────── menu containers ───────── */
/* A fixed height, not a max-height: the popup is anchored above the composer,
   so a content-sized box makes the whole panel jump every keystroke as the
   result set narrows. The body scrolls instead. The clamp keeps it inside the
   space above the composer (the tool row sits ~340px up in the hero layout)
   and never lets a short window collapse it to nothing. */
.dsh-mp2-menu{position:absolute;right:0;bottom:calc(100% + 8px);z-index:20;display:flex;flex-direction:column;width:min(540px,calc(100vw - 32px));height:clamp(220px,calc(100vh - 340px),400px);overflow:hidden;padding:4px;border:1px solid var(--dsw-alias-border-inverted);border-radius:12px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary)}
/* The effort list is short and has no search box, so it stays content-sized. */
.dsh-mp2-menuEffort{width:min(280px,calc(100vw - 32px));height:auto;max-height:min(260px,calc(100vh - 340px))}

/* ───────── search ───────── */
.dsh-mp2-search{flex:0 0 auto;margin:2px 2px 6px;padding:6px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;outline:none;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}
.dsh-mp2-search::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsh-mp2-search:focus{border-color:var(--dsw-alias-brand-primary)}

/* ───────── body (provider tabs + model list) ───────── */
.dsh-mp2-body{display:flex;flex:1;min-height:0;gap:4px}
.dsh-mp2-providers{flex:0 0 150px;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding:2px}
.dsh-mp2-provider{display:flex;align-items:center;gap:6px;width:100%;min-height:30px;padding:0 8px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;text-align:left;cursor:pointer}
.dsh-mp2-provider:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-mp2-providerActive{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary);font-weight:600}
.dsh-mp2-paneCaption{padding:10px 8px 6px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.dsh-mp2-providerName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-mp2-providerCount{flex:0 0 auto;padding:0 6px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}
/* Supplier group in the model list. The header is a section label, deliberately
   unlike a model row (14px/500 on a rounded hover surface): tracked-out
   uppercase, dimmed, and pinned to the top of the list while its group scrolls. */
.dsh-mp2-group{border-top:1px solid var(--dsw-alias-border-l)}
.dsh-mp2-group:first-child{border-top:none}
.dsh-mp2-groupHeader{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:5px;padding:10px 8px 4px;background:var(--dsw-specific-menu);color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.dsh-mp2-groupHeaderIcon{flex:0 0 auto;display:inline-flex}

/* ───────── model list ───────── */
.dsh-mp2-list{position:relative;flex:1;min-width:0;min-height:0;overflow-y:auto;border-left:1px solid var(--dsw-alias-border-l1);padding:0 0 2px 2px}
.dsh-mp2-status,.dsh-mp2-empty{padding:10px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}
.dsh-mp2-error,.dsh-mp2-warning{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin:4px 2px;padding:7px 8px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.dsh-mp2-warning{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-state-warn-label)}
.dsh-mp2-retry{flex:0 0 auto;padding:0;border:none;background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer}
.dsh-mp2-option{display:flex;align-items:center;gap:8px;width:100%;min-height:38px;padding:6px 8px;border:none;border-radius:10px;outline:none;background:transparent;color:inherit;text-align:left;cursor:pointer;scroll-margin-top:34px;scroll-margin-bottom:4px}
.dsh-mp2-option:hover:not(:disabled),.dsh-mp2-option:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}
/* The keyboard cursor. Focus stays in the search box, so the row the arrow
   keys stand on has to say so by itself — the hover surface marks it, and
   nothing else does. It is deliberately separate from the check mark, which
   reports the model actually in use. */
.dsh-mp2-optionActive:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsh-mp2-option:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
.dsh-mp2-optionCopy{display:flex;flex:1;flex-direction:column;min-width:0}
.dsh-mp2-modelName{overflow:hidden;color:inherit;font-size:14px;line-height:20px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}
.dsh-mp2-description{overflow:hidden;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap}
.dsh-mp2-check{flex:0 0 18px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-brand-primary)}

/* ───────── per-row facts (context window / image input) ───────── */
.dsh-mp2-facts{display:flex;flex:0 0 auto;align-items:center;gap:5px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}
.dsh-mp2-context{flex:0 0 auto;padding:0 6px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover)}
.dsh-mp2-image{display:inline-flex;flex:0 0 auto;align-items:center;color:var(--dsw-alias-label-tertiary)}
/* Bridged vision: the route accepts images, but the model reads a transcript. */
.dsh-mp2-imageBridged{opacity:.5}
/* The favorite toggle sits between the name and the fact strip. */
.dsh-mp2-star{flex:0 0 auto;display:inline-flex;align-items:center;font-size:13px;line-height:1;padding:0 2px;color:var(--dsw-alias-label-tertiary);opacity:.6;cursor:pointer}
.dsh-mp2-star:hover{opacity:1}
.dsh-mp2-starOn{color:var(--dsw-alias-state-warn-primary,currentColor);opacity:1}
/* Name + star share one flex row so the toggle sits right after the label. */
.dsh-mp2-nameRow{display:inline-flex;align-items:center;gap:2px}
/* The supplier's leading character, ahead of the model name. Only the tint
   carries the supplier's hue, so the glyph stays legible on either theme.
   --dsh-mp2-hue is set per row; it falls back to the brand-neutral 0. */
.dsh-mp2-avatar{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin-right:2px;border-radius:5px;background:hsl(var(--dsh-mp2-hue,0) 55% 50% / .18);color:inherit;font-size:10px;line-height:1;font-weight:600;text-transform:uppercase}
/* The trigger's own gap already spaces the chip from the name. */
.dsh-mp2-triggerLeft .dsh-mp2-avatar{margin-right:0}
/* Same for the provider elevator — its gap:6px does the spacing. */
.dsh-mp2-provider .dsh-mp2-avatar{margin-right:0}
/* A locked trigger dims as a whole, tint included. */
.dsh-mp2-triggerLocked .dsh-mp2-avatar{opacity:.5}

/* ───────── effort popup ───────── */
.dsh-mp2-effortList{padding:2px;overflow-y:auto;flex:1}
.dsh-mp2-effortHeader{padding:6px 8px 4px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;flex:0 0 auto}

/* ───────── model-control additions ───────── */
/* Advisory footer inside the effort popup: what the engine suggests for this
   model and how much to trust it, plus the "set as default" toggle. */
.dsh-mp2-advice{flex:0 0 auto;border-top:1px solid var(--dsw-alias-border-l1);padding:6px 8px;display:flex;flex-direction:column;gap:4px}
.dsh-mp2-adviceText{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;display:flex;align-items:center;gap:5px}
.dsh-mp2-adviceDot{width:6px;height:6px;border-radius:50%;flex:0 0 auto}
.dsh-mp2-adviceDotHigh{background:var(--dsw-alias-label-success,var(--dsw-alias-label-primary))}
.dsh-mp2-adviceDotMedium{background:var(--dsw-alias-label-warning,#c80)}
.dsh-mp2-adviceDotLow{background:var(--dsw-alias-label-tertiary)}
.dsh-mp2-defaultToggle{align-self:flex-start;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;padding:3px 8px;cursor:pointer}
.dsh-mp2-defaultToggle:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-mp2-defaultToggleActive{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
/* Group-mode switch row in the model menu, above the provider pane. */
.dsh-mp2-modeRow{flex:0 0 auto;display:flex;gap:4px;padding:2px 2px 4px}
.dsh-mp2-modeBtn{border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;padding:2px 8px;cursor:pointer}
.dsh-mp2-modeBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-mp2-modeBtnActive{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-border-l1)}
/* Vendor-grouped section headers reuse the provider group header look. */
.dsh-mp2-vendorIcon{display:inline-flex;margin-right:4px}

/* ───────── model-selection page (functional first pass) ───────── */
.dsh-mc-page{display:flex;flex-direction:column;gap:12px;padding:4px 2px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}
.dsh-mc-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsh-mc-title{font-size:15px;font-weight:600}
.dsh-mc-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsh-mc-card{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;background:var(--dsw-alias-bg-layer-2)}
/* ── Layered dialogs ──
   The settings sheet is narrow, so a side-by-side master/detail split made the
   left rail cramped and the right pane tall. Instead the page itself stays a
   plain channel list, and everything that needs room opens in an overlay: the
   channel editor is layer 1, a single model's settings is layer 2 on top.
   position:fixed is used deliberately - the overlay must cover the viewport
   regardless of where the slot renders it. */
.dsh-mc-scrim{position:fixed;inset:0;background:rgba(8,20,22,.42);display:flex;align-items:center;justify-content:center;padding:24px;z-index:40}
/* Layer 2 sits above layer 1: both scrims stack, only the top one is dark. */
.dsh-mc-scrimTop{background:rgba(8,20,22,.28);z-index:60}
.dsh-mc-sheet{display:flex;flex-direction:column;width:min(680px,100%);max-height:min(78vh,640px);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-shadow-lv3,var(--dsw-shadow-lv2));overflow:hidden}
.dsh-mc-sheetTop{width:min(560px,100%);max-height:min(72vh,560px)}
.dsh-mc-sheetHead{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:0 0 auto}
.dsh-mc-sheetTitle{font-size:14px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-mc-sheetBody{display:flex;flex-direction:column;gap:10px;padding:14px 16px;overflow-y:auto;min-height:0}
.dsh-mc-sheetFoot{display:flex;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid var(--dsw-alias-border-l1);flex:0 0 auto}
.dsh-mc-close{border:none;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:18px;line-height:18px;padding:2px 6px;border-radius:6px;cursor:pointer}
.dsh-mc-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
/* The channel list on the page itself: one row per channel, like Cherry's. */
.dsh-mc-listRows{display:flex;flex-direction:column;gap:8px}
.dsh-mc-listRow{display:flex;align-items:center;gap:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2)}
.dsh-mc-listRowHidden{opacity:.6}
.dsh-mc-listName{font-weight:600;flex:0 0 auto}
.dsh-mc-listMeta{color:var(--dsw-alias-label-tertiary);font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-mc-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-success,#2a9d8f);flex:0 0 auto}
.dsh-mc-modelRow{display:flex;align-items:center;gap:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;background:var(--dsw-alias-bg-layer-1,transparent)}
/* The fetch result is a panel, not the page: it appears only after an explicit
   fetch and can be dismissed, so the channel's own model list is never replaced
   by whatever the endpoint happens to advertise. */
.dsh-mc-panel{display:flex;flex-direction:column;gap:8px;border:1px dashed var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;background:var(--dsw-alias-bg-layer-1,transparent)}
.dsh-mc-modelListHead{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.dsh-mc-modelRowMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dsh-mc-modelName{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-mc-modelSub{color:var(--dsw-alias-label-tertiary);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-mc-modelRowHidden{opacity:.55}
/* The old ⋯ menu stays for the row-level secondary actions. */
.dsh-mc-menu{position:relative;display:flex;flex-direction:column;gap:1px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-2));box-shadow:var(--dsw-shadow-lv2);padding:3px;min-width:132px;z-index:5}
.dsh-mc-menuItem{text-align:left;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;padding:5px 8px;cursor:pointer}
.dsh-mc-menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-mc-menuItem:disabled{opacity:.5;cursor:default}
.dsh-mc-menuDanger{color:var(--dsw-alias-label-error,#c33)}
.dsh-mc-btnIcon{padding:2px 9px;font-size:14px;line-height:18px}
.dsh-mc-cardHead{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.dsh-mc-name{font-weight:600}
.dsh-mc-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;overflow-wrap:anywhere}
.dsh-mc-badge{border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:1px 8px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dsh-mc-badgeOk{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.dsh-mc-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.dsh-mc-btn{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;padding:4px 10px;cursor:pointer}
.dsh-mc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsh-mc-btn:disabled{opacity:.5;cursor:default}
.dsh-mc-btnPrimary{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.dsh-mc-list{display:flex;flex-direction:column;gap:2px;max-height:340px;overflow:auto;border-top:1px solid var(--dsw-alias-border-l1);padding-top:6px}
.dsh-mc-row{display:flex;align-items:center;gap:8px;padding:3px 4px;border-radius:6px}
.dsh-mc-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-mc-rowLabel{flex:1;min-width:0;overflow-wrap:anywhere}
.dsh-mc-rowMeta{color:var(--dsw-alias-label-tertiary);font-size:11px}
.dsh-mc-error{color:var(--dsw-alias-label-error,var(--dsw-alias-label-primary));font-size:12px}
.dsh-mc-notice{color:var(--dsw-alias-label-tertiary);font-size:12px}
.dsh-mc-status{margin:0;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;max-height:280px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-mc-switch{display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.dsh-mc-form{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px}
.dsh-mc-field{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dsh-mc-field > .dsh-mc-input{flex:1;min-width:0}
.dsh-mc-input{border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;padding:3px 8px}
.dsh-mc-cardHidden{opacity:.6}
.dsh-mc-effort{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px}
.dsh-mc-effortRow{display:flex;flex-direction:column;gap:4px;padding:6px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-1,transparent)}
.dsh-mc-effortHead{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.dsh-mc-level{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dsh-mc-effortBar{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dsh-mc-levels{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px 10px;padding:2px 0}
.dsh-mc-ability{display:flex;flex-direction:column;gap:6px;margin-top:4px;padding-top:6px;border-top:1px dashed var(--dsw-alias-border-l1)}
.dsh-mc-abilityField{display:inline-flex;align-items:center;gap:6px}
.dsh-mc-abilityField .dsh-mc-wire{width:110px}
.dsh-mc-levelTick{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary);min-width:96px}
.dsh-mc-wire{flex:1;min-width:0;font-size:11px}
`

  // ─── Runtime model facts ───
  // The catalog this seat reads carries id / name / description / reasoning
  // only — no context window and no input modalities. The host half
  // republishes both from the Host `llm` service at this loopback route, so
  // the popup badges each row without a round trip per model. One fetch per
  // page load, shared by every popup instance; a missing route (older host
  // half, non-web carrier) simply yields no badges.
  const FACTS_ROUTE = '/api/model-control/models'
  const ADVISE_ROUTE = '/api/model-control/advise'
  const DEFAULTS_ROUTE = '/api/model-control/defaults'
  const GROUPING_ROUTE = '/api/model-control/grouping'
  const PROVIDERS_ROUTE = '/api/model-control/providers'
  const AVAILABLE_ROUTE = '/api/model-control/available'
  const SELECTION_ROUTE = '/api/model-control/selection'
  const DECLARE_ROUTE = '/api/model-control/declare'
  const STATUS_ROUTE = '/api/model-control/status'
  const TAKEOVER_ROUTE = '/api/model-control/takeover'
  const PROVIDER_ROUTE = '/api/model-control/provider'
  const PROBE_ROUTE = '/api/model-control/probe'
  const HIDDEN_ROUTE = '/api/model-control/hidden'
  const EFFORT_ROUTE = '/api/model-control/effort'
  const ENTRY_ROUTE = '/api/model-control/entry'
  const ABILITY_ROUTE = '/api/model-control/ability'

  // ─── Per-model default effort (persisted host-side via the sidecar) ───
  // Keyed `provider/modelId` like favorites. Loaded once per page and kept in
  // sync after each write; a failed write only disables persistence, the
  // in-memory value keeps working.
  let defaultsPromise = null
  function loadDefaults() {
    if (defaultsPromise !== null) return defaultsPromise
    defaultsPromise = fetch(DEFAULTS_ROUTE, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        const map = new Map()
        for (const [key, value] of Object.entries(body?.defaults ?? {})) {
          if (typeof value === 'string') map.set(key, value)
        }
        return map
      })
      .catch(() => new Map())
    return defaultsPromise
  }

  function saveDefault(key, effort) {
    const slash = key.indexOf('/')
    const provider = key.slice(0, slash)
    const model = key.slice(slash + 1)
    return fetch(DEFAULTS_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider, model, effort }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
  }

  // ─── Effort advisory ───
  // Ask the host engine for the recommended ladder of a model id. Returned
  // advice marks the popup: the vendor-default row shows a confidence dot and
  // "设为默认" pins the user's own choice. A failed call degrades to no advice.
  function loadAdvice(modelId, displayName) {
    const params = new URLSearchParams({ model: modelId })
    if (displayName !== undefined) params.set('display', displayName)
    return fetch(ADVISE_ROUTE + '?' + params.toString(), { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => body?.advice ?? null)
      .catch(() => null)
  }

  // ─── Vendor grouping rules ───
  // The host owns the authoritative rule table (built-in defaults plus user
  // overrides), so the picker asks for it once per page rather than keeping a
  // second hardcoded copy that could drift. A missing route leaves the
  // built-in table in place, so grouping still works without the host half.
  let groupingPromise = null
  function loadGrouping() {
    if (groupingPromise !== null) return groupingPromise
    groupingPromise = fetch(GROUPING_ROUTE, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => (Array.isArray(body?.rules) && body.rules.length > 0 ? body.rules : null))
      .catch(() => null)
    return groupingPromise
  }

  let factsPromise = null
  // Provider ids the user hid. Held alongside the facts because both arrive on
  // the same route, and the picker needs them before it renders a provider
  // column — a hidden channel must not appear in ANY model list this plugin
  // draws.
  const hiddenProviders = new Set()
  let hiddenLoaded = false
  function loadFacts() {
    if (factsPromise !== null) return factsPromise
    factsPromise = fetch(FACTS_ROUTE, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        hiddenProviders.clear()
        for (const id of body?.hiddenProviders ?? []) hiddenProviders.add(id)
        hiddenLoaded = true
        const map = new Map()
        for (const row of body?.models ?? []) map.set(row.provider + '/' + row.id, row)
        return map
      })
      .catch(() => new Map())
    return factsPromise
  }

  // ─── Favorites ───
  // Favorites are a browser-local UI preference, so they live in localStorage
  // under a `dsh.`-prefixed key — the same place the shipped conversation
  // plugin keeps its own view and width preferences. They are keyed on the
  // route (`provider/modelId`), not the bare model id, because one model id is
  // routinely served by several configured providers and favoriting one route
  // says nothing about the others.
  const FAVORITES_KEY = 'dsh.modelPicker.favorites'
  /** Left-column row ids that are not providers. */
  const ALL_TAB = '__all__'
  const FAVORITES_TAB = '__favorites__'

  /** @returns the favorited `provider/modelId` keys; empty when storage is unusable. */
  function readFavorites() {
    if (typeof localStorage === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(FAVORITES_KEY)
      if (raw === null) return new Set()
      const stored = JSON.parse(raw)
      if (!Array.isArray(stored)) return new Set()
      return new Set(stored.filter((key) => typeof key === 'string'))
    } catch {
      return new Set()
    }
  }

  /** Persist the favorites. A storage refusal must not break the picker. */
  function writeFavorites(favorites) {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]))
    } catch {
      // Private mode or a full quota: the in-memory set still tracks this page.
    }
  }

  /** Compact token count: 1000000 → "1M", 384000 → "384K". */
  function formatContext(tokens) {
    if (typeof tokens !== 'number' || !Number.isFinite(tokens) || tokens <= 0) return null
    if (tokens >= 1000000) return String(Number((tokens / 1000000).toFixed(1))) + 'M'
    return Math.round(tokens / 1000) + 'K'
  }

  /**
   * One line of facts under a model's display name: the real id when it differs,
   * the context window, and whether the model takes images. Shared by the
   * channel's model list and the fetch-candidate list so both read the same way.
   */
  function modelSubtitle(model) {
    return [
      model?.id !== undefined && model.id !== (model.name ?? model.id) ? model.id : null,
      model?.contextWindow !== undefined ? formatContext(model.contextWindow) : null,
      Array.isArray(model?.input) && model.input.includes('image') ? '🖼' : null,
    ].filter(Boolean).join(' · ')
  }

  // ─── Icons ───
  // Lucide (https://lucide.dev, ISC licence), inlined as paths on its 24×24
  // grid and stroked with `currentColor`. No icon font, no emoji, no runtime
  // dependency: the glyphs stay crisp at 13px and follow the theme tokens.
  const ICONS = {
    // Lucide `star`.
    star: [['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' }]],
    // The same outline, filled — a favorited row.
    starFilled: [['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z', fill: 'currentColor', strokeWidth: 1 }]],
    // Lucide `check`.
    check: [['path', { d: 'M20 6 9 17l-5-5' }]],
    // Lucide `chevron-down`.
    chevron: [['path', { d: 'm6 9 6 6 6-6' }]],
    // Lucide `building`.
    building: [
      ['rect', { x: 4, y: 2, width: 16, height: 20, rx: 2 }],
      ['path', { d: 'M9 22v-4h6v4' }],
      ['path', { d: 'M8 6h.01' }],
      ['path', { d: 'M16 6h.01' }],
      ['path', { d: 'M12 6h.01' }],
      ['path', { d: 'M12 10h.01' }],
      ['path', { d: 'M12 14h.01' }],
      ['path', { d: 'M16 10h.01' }],
      ['path', { d: 'M16 14h.01' }],
      ['path', { d: 'M8 10h.01' }],
      ['path', { d: 'M8 14h.01' }],
    ],
    // Lucide `image`.
    image: [
      ['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }],
      ['circle', { cx: 9, cy: 9, r: 2 }],
      ['path', { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' }],
    ],
  }

  /** Render one {@link ICONS} entry at `size` px, inheriting the current colour. */
  function icon(name, size) {
    return h('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round',
      strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false',
    }, ICONS[name].map(([tag, props], index) => h(tag, { key: index, ...props })))
  }

  const IMAGE_GLYPH = icon('image', 13)

  /**
   * A stable hue per supplier. Two providers whose leading characters collide —
   * `17an-db`, `17an-anbot` and `17an-mumiao` all start with `1` — would
   * otherwise wear the same chip and read as one supplier.
   * @param id - the supplier's route id, which is stable across sessions.
   */
  function providerHue(id) {
    let hue = 0
    for (const ch of id) hue = (hue * 31 + ch.codePointAt(0)) % 360
    return hue
  }

  /**
   * The supplier's leading character, for the row's avatar chip. Taken by code
   * point so a name starting outside the BMP is not cut in half.
   */
  function providerInitial(name) {
    const [first] = name.trim()
    return first === undefined ? '?' : first.toUpperCase()
  }

  /**
   * The supplier chip: its leading character on its own tint. Rendered both
   * ahead of a model name in the list and on the closed trigger, so the source
   * is legible before the picker is opened. The glyph carries no meaning to a
   * screen reader — the supplier is already named in the tooltip and the row
   * detail — so it is hidden from the accessibility tree.
   */
  function supplierChip(provider) {
    return h('span', {
      className: 'dsh-mp2-avatar',
      style: { '--dsh-mp2-hue': String(providerHue(provider.id)) },
      'aria-hidden': true,
    }, providerInitial(provider.name))
  }

  /**
   * The row's fact strip: vision glyph + context-window chip.
   *
   * Vision has two states that are NOT the same capability: a route whose
   * model reads pixels itself (native), and a modlens bridge route, where the
   * model still cannot see — modlens transcribes the image to text first.
   * `bridged` marks the second, so the glyph can say which.
   */
  function ModelFacts({ facts, bridged }) {
    const context = formatContext(facts?.contextWindow)
    const image = bridged || (Array.isArray(facts?.input) && facts.input.includes('image'))
    if (!image && context === null) return null
    return h('span', { className: 'dsh-mp2-facts' },
      image && h('span', {
        className: 'dsh-mp2-image' + (bridged ? ' dsh-mp2-imageBridged' : ''),
        title: bridged ? t('imageBridged') : t('imageNative'),
      }, IMAGE_GLYPH),
      context !== null && h('span', { className: 'dsh-mp2-context', title: t('contextWindow') }, context),
    )
  }

  /**
   * One selectable model row: name, favorite toggle, fact strip, check mark.
   *
   * The row is a `<button>`, so the star is a focusable span that stops the
   * click from reaching it — clicking a star must never also pick the model.
   */
  function ModelRow({ id, group, provider, model, detail, selected, active, busy, favorite, facts, bridged, onToggle, onChoose }) {
    const label = favorite ? t('favoriteRemove') : t('favoriteAdd')
    // The chip names the *display* supplier, so a folded `(modlens vision)` row
    // wears the same chip as its siblings under the base provider's heading.
    const chip = provider ?? group
    return h('button', {
      id,
      type: 'button',
      role: 'menuitemradio',
      'aria-checked': selected,
      className: 'dsh-mp2-option' + (selected ? ' dsh-mp2-selected' : '') + (active ? ' dsh-mp2-optionActive' : ''),
      disabled: busy,
      onClick: onChoose,
    },
      h('span', { className: 'dsh-mp2-optionCopy' },
        h('span', { className: 'dsh-mp2-nameRow' },
          supplierChip(chip),
          h('span', { className: 'dsh-mp2-modelName' }, model.name),
          h('span', {
            className: 'dsh-mp2-star' + (favorite ? ' dsh-mp2-starOn' : ''),
            role: 'button',
            tabIndex: 0,
            'aria-pressed': favorite,
            'aria-label': label + '：' + model.name,
            title: label,
            onClick: (event) => { event.stopPropagation(); onToggle() },
            onKeyDown: (event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              event.stopPropagation()
              onToggle()
            },
          }, icon(favorite ? 'starFilled' : 'star', 14)),
        ),
        detail !== undefined && detail !== '' && h('span', { className: 'dsh-mp2-description' }, detail),
      ),
      h(ModelFacts, { facts, bridged, reasoning: model.reasoning }),
      h('span', { className: 'dsh-mp2-check' }, selected && icon('check', 14)),
    )
  }

  // ─── Helper: render one effort list popup ───
  // Extended for model-control: an advisory footer (what the engine suggests,
  // with confidence) and a per-model default-effort toggle. Both degrade
  // silently when the advice call fails or the host route is missing — the
  // plain ladder list above stays fully functional on its own.
  function EffortPopup({ reasoning, effectiveEffort, effortChoices, busy, chooseEffort, close,
      advice, defaultEffort, onSetDefault, onClearDefault }) {
    const adviceClass = advice === null || advice === undefined ? undefined
      : advice.confidence === 'high' ? 'dsh-mp2-adviceDotHigh'
        : advice.confidence === 'medium' ? 'dsh-mp2-adviceDotMedium'
          : 'dsh-mp2-adviceDotLow'
    const adviceLabel = advice === null || advice === undefined ? undefined
      : advice.confidence === 'high' ? t('adviceHigh')
        : advice.confidence === 'medium' ? t('adviceMedium') : t('adviceLow')
    if (reasoning === undefined || effortChoices.length === 0) {
      return h('div', { className: 'dsh-mp2-menu dsh-mp2-menuEffort', role: 'menu', tabIndex: -1,
        onMouseDown: (e) => { e.preventDefault() } },
        h('div', { className: 'dsh-mp2-empty' }, t('providerDefault')),
      )
    }
    return h('div', { className: 'dsh-mp2-menu dsh-mp2-menuEffort', role: 'menu', tabIndex: -1,
      onMouseDown: (e) => { e.preventDefault() } },
      h('div', { className: 'dsh-mp2-effortHeader' }, t('effortHeading')),
      h('div', { className: 'dsh-mp2-effortList' },
        effortChoices.map((level) => h('button', {
          key: level.key,
          type: 'button',
          role: 'menuitemradio',
          'aria-checked': effectiveEffort === level.effort,
          className: 'dsh-mp2-option' + (effectiveEffort === level.effort ? ' dsh-mp2-selected' : ''),
          disabled: busy,
          title: level.description,
          onClick: () => { chooseEffort(level.effort) },
        },
          h('span', { className: 'dsh-mp2-optionCopy' },
            h('span', { className: 'dsh-mp2-modelName' }, level.label),
            // Mark the model's pinned default, and the vendor-default advice,
            // so the two are distinguishable at a glance.
            defaultEffort !== undefined && defaultEffort === level.effort
              && h('span', { className: 'dsh-mp2-description' }, t('isDefault')),
            advice !== null && advice !== undefined
              && advice.defaultEffort !== undefined && advice.defaultEffort === level.effort
              && defaultEffort !== level.effort
              && h('span', { className: 'dsh-mp2-description' }, t('advised')),
            level.description !== undefined && h('span', { className: 'dsh-mp2-description' }, level.description),
          ),
          h('span', { className: 'dsh-mp2-check' }, effectiveEffort === level.effort ? icon('check', 14) : ''),
        )),
      ),
      (advice !== null && advice !== undefined || defaultEffort !== undefined || onSetDefault !== undefined)
        && h('div', { className: 'dsh-mp2-advice' },
          advice !== null && advice !== undefined && h('div', { className: 'dsh-mp2-adviceText' },
            h('span', { className: 'dsh-mp2-adviceDot ' + (adviceClass ?? '') }),
            h('span', null,
              t('advised') + (adviceLabel !== undefined ? ' · ' + adviceLabel : '')
                + (advice.defaultEffort !== undefined ? ' · ' + advice.defaultEffort : '')),
          ),
          onSetDefault !== undefined && onClearDefault !== undefined && h('button', {
            type: 'button',
            className: 'dsh-mp2-defaultToggle' + (defaultEffort !== undefined ? ' dsh-mp2-defaultToggleActive' : ''),
            onClick: () => {
              if (defaultEffort !== undefined) onClearDefault()
              else if (effectiveEffort !== undefined) onSetDefault(effectiveEffort)
            },
          },
            defaultEffort !== undefined ? t('clearDefault') : t('setDefault')),
        ),
    )
  }

  /** A provider name that is another provider's name plus a "(…)" capability suffix. */
  const CAPABILITY_SUFFIX = /^(.*?)\s*\([^()]*\)$/
  /** A provider route modlens mints to bridge images to a text-only model. */
  const VISION_ROUTE = /\(modlens vision\)/i

  /**
   * Fold capability-suffixed providers into their base provider for display.
   * Each entry keeps `{ group, model }` pairs so a pick still submits the group
   * that serves the model; only the column rows are merged.
   * @param groups - the directory's provider groups, in host order.
   * @returns display rows, ordered by each base provider's first appearance.
   */
  function mergeProviders(groups) {
    const byName = new Map(groups.map((group) => [group.name, group]))
    const rowIdOfGroup = new Map()
    for (const group of groups) {
      const suffix = CAPABILITY_SUFFIX.exec(group.name)
      const base = suffix === null ? undefined : byName.get(suffix[1])
      rowIdOfGroup.set(group.id, base !== undefined && base !== group ? base.id : group.id)
    }
    const rows = []
    const byId = new Map()
    for (const group of groups) {
      const id = rowIdOfGroup.get(group.id)
      let row = byId.get(id)
      if (row === undefined) {
        const base = groups.find((candidate) => candidate.id === id) ?? group
        row = { id, name: base.name, models: [] }
        byId.set(id, row)
        rows.push(row)
      }
      for (const model of group.models) row.models.push({ group, model })
    }
    return rows
  }

  // ─── Vendor grouping (display only) ───
  // Pure UI re-bucketing of the flat model list by vendor family, inferred
  // from the model id. Routing never changes: every entry keeps its
  // `{ group, model }` pair, exactly like provider folding. Rules mirror the
  // host's defaults; unmatched models fall under 其他.
  const VENDOR_RULES = [
    { label: 'Anthropic / Claude', patterns: ['claude'] },
    { label: 'OpenAI / GPT', patterns: ['gpt', 'o1', 'o3', 'o4', 'chatgpt', 'codex'] },
    { label: '智谱 GLM', patterns: ['glm'] },
    { label: 'DeepSeek', patterns: ['deepseek'] },
    { label: '月之暗面 Kimi', patterns: ['kimi', 'moonshot'] },
    { label: '阿里 Qwen', patterns: ['qwen', 'qwq'] },
    { label: 'Google Gemini', patterns: ['gemini'] },
    { label: '字节 Doubao', patterns: ['doubao', 'seed-'] },
    { label: '小米 MiMo', patterns: ['mimo'] },
    { label: 'MiniMax', patterns: ['minimax', 'abab'] },
    { label: '腾讯 Hunyuan', patterns: ['hunyuan', 'hy-'] },
    { label: 'StepFun', patterns: ['step-'] },
  ]
  const OTHER_VENDOR = '其他 / 未分类'

  function vendorOf(modelId, rules) {
    const table = Array.isArray(rules) && rules.length > 0 ? rules : VENDOR_RULES
    const id = String(modelId).toLowerCase()
    for (const rule of table) {
      if (rule === null || typeof rule !== 'object' || !Array.isArray(rule.patterns)) continue
      for (const pattern of rule.patterns) {
        if (typeof pattern !== 'string' || pattern === '') continue
        const needle = pattern.toLowerCase()
        let at = id.indexOf(needle)
        while (at >= 0) {
          const before = at === 0 ? '' : id[at - 1]
          const after = at + needle.length >= id.length ? '' : id[at + needle.length]
          const edge = (ch) => ch === '' || !/[a-z0-9]/.test(ch)
          if (edge(before) && edge(after)) return rule.label
          at = id.indexOf(needle, at + 1)
        }
      }
    }
    return OTHER_VENDOR
  }

  /**
   * Re-bucket display rows by vendor family. `allModels`-shaped entries
   * (`{ group, model }`) go in; vendor-section-shaped rows
   * (`{ id, name, models }`) come out, "Other" always last. `rules` comes from
   * the host when it answers; the built-in table is the fallback.
   */
  function groupRowsByVendor(allModels, rules) {
    const table = Array.isArray(rules) && rules.length > 0 ? rules : VENDOR_RULES
    const buckets = new Map()
    for (const entry of allModels) {
      const label = vendorOf(entry.model.id, table)
      if (!buckets.has(label)) buckets.set(label, [])
      buckets.get(label).push(entry)
    }
    const rows = []
    for (const rule of table) {
      if (rule === null || typeof rule !== 'object' || typeof rule.label !== 'string') continue
      const list = buckets.get(rule.label)
      if (list !== undefined && list.length > 0) rows.push({ id: 'vendor:' + rule.label, name: rule.label, models: list })
    }
    const rest = buckets.get(OTHER_VENDOR)
    if (rest !== undefined && rest.length > 0) rows.push({ id: 'vendor:' + OTHER_VENDOR, name: OTHER_VENDOR, models: rest })
    return rows
  }

  /**
   * The section owning a scroll offset — the last one whose top edge has
   * passed the list's own top edge. With sticky headers that is exactly the
   * heading currently pinned, so it is the floor the list is standing on.
   * @param floors - `{ id, top }` per section, in list order.
   * @param scrollTop - the list's current scroll offset.
   * @returns the owning section id, or null for an empty list.
   */
  function floorAt(floors, scrollTop) {
    let current = null
    for (const floor of floors) {
      if (floor.top > scrollTop + 1) break
      current = floor.id
    }
    return current
  }

  // ─── Main component ───
  function ModelPicker(props) {
    const locked = props.locked
    const available = props.available
    const directory = props.directory
    const load = props.load
    const select = props.select

    const EMPTY_STATE = { current: null, routable: null, groups: [], failures: [], status: 'idle', error: null }

    const state = useSyncExternalStore(
      (fn) => directory === null ? (() => {}) : directory.subscribe(fn),
      () => directory === null ? EMPTY_STATE : directory.getSnapshot(),
    )

    // Which popup is open: null | 'model' | 'effort'
    const [openKind, setOpenKind] = useState(null)
    const [query, setQuery] = useState('')
    // Provider row used to narrow an active query; null keeps every provider.
    const [facetId, setFacetId] = useState(null)
    // The group under the list's top edge — the elevator's current floor.
    const [spyId, setSpyId] = useState(null)
    // The keyboard cursor: which row the arrow keys are standing on. It is not
    // `current` (the model actually in use) — the cursor only travels, and
    // Enter commits it. The picker is search-first, so focus never leaves the
    // search box; the cursor is what the keyboard drives instead.
    const [activeIndex, setActiveIndex] = useState(0)
    const [notice, setNotice] = useState(null)
    // Favorited `provider/modelId` keys, mirrored to localStorage on every edit.
    const [favorites, setFavorites] = useState(readFavorites)
    // Runtime facts keyed `provider/modelId`; null until the one fetch lands.
    const [facts, setFacts] = useState(null)
    // Per-model default effort, keyed `provider/modelId`; loaded once per page.
    const [modelDefaults, setModelDefaults] = useState(() => new Map())
    // Effort advisory for the currently selected model; null until fetched.
    const [advice, setAdvice] = useState(null)
    // Vendor grouping rules from the host; null keeps the built-in table.
    const [vendorRules, setVendorRules] = useState(null)
    // Display grouping of the model list: 'provider' (original) or 'vendor'.
    const [listMode, setListMode] = useState('provider')
    const lastActionRef = useRef('load')
    const rootRef = useRef(null)
    const triggerLeftRef = useRef(null)
    const triggerRightRef = useRef(null)
    const searchRef = useRef(null)
    const listRef = useRef(null)
    const groupRefs = useRef(new Map())

    const q = query.trim().toLowerCase()
    const current = state.current

    const currentChoice = useMemo(() => {
      if (current === null) return null
      for (const group of state.groups) {
        if (group.id !== current.provider) continue
        for (const model of group.models) {
          if (model.id === current.model) return { group, model }
        }
      }
      return null
    }, [state.groups, current])

    // Reasoning / effort
    const reasoning = currentChoice === null ? undefined : currentChoice.model.reasoning
    const effectiveEffort = current === null ? undefined : (current.reasoningEffort ?? reasoning?.defaultEffort)
    const effortLabel = reasoning === undefined ? undefined
      : effectiveEffort === undefined ? t('providerDefault')
        : (reasoning.efforts.find((level) => level.id === effectiveEffort)?.name ?? String(effectiveEffort))
    const effortChoices = useMemo(() => {
      if (reasoning === undefined) return []
      const rows = []
      if (reasoning.defaultEffort === undefined) {
        rows.push({ key: 'provider-default', effort: undefined, label: t('providerDefault') })
      }
      for (const level of reasoning.efforts) {
        rows.push({ key: level.id, effort: level.id, label: level.name, description: level.description })
      }
      return rows
    }, [reasoning])

    // Providers differing only by a trailing capability suffix in parentheses
    // fold into their base provider: modlens registers vision as its own
    // provider route, which would otherwise put a near-duplicate row per
    // provider in the column. Folding is display-only — every row keeps its
    // models paired with the group that actually serves them, so a pick still
    // submits the original provider id and the suffix stays on the model name.
    // Hidden channels are dropped here, before folding, so they never reach
    // the provider column, the model list, the search results or the favorites
    // mirror. The current session keeps working: if the model in use belongs to
    // a hidden channel the trigger still shows it, because that label comes
    // from `currentChoice`, not from this list.
    const visibleGroups = useMemo(
      () => state.groups.filter((group) => !hiddenProviders.has(group.id)),
      [state.groups, hiddenLoaded, facts],
    )
    const providers = useMemo(() => mergeProviders(visibleGroups), [visibleGroups])

    // Search narrows BOTH columns: the query is a facet over providers as
    // well as models, so a provider matches by its own name/id or by having
    // at least one matching model.
    const searching = q !== ''
    const favoriteKey = (group, model) => group.id + '/' + model.id
    const isFavorite = (group, model) => favorites.has(favoriteKey(group, model))
    const toggleFavorite = (group, model) => {
      const key = favoriteKey(group, model)
      const next = new Set(favorites)
      if (!next.delete(key)) next.add(key)
      writeFavorites(next)
      setFavorites(next)
    }
    const matches = useMemo(() => {
      if (!searching) return []
      const out = []
      for (const provider of providers) {
        const providerMatch = provider.name.toLowerCase().includes(q) || provider.id.toLowerCase().includes(q)
        const models = providerMatch
          ? provider.models
          : provider.models.filter(({ model }) => model.name.toLowerCase().includes(q)
              || (model.description !== undefined && model.description.toLowerCase().includes(q)))
        if (providerMatch || models.length > 0) out.push({ provider, models })
      }
      return out
    }, [searching, q, providers])

    // A clicked provider narrows the search to that provider; NULL keeps the
    // cross-provider result list.
    const facet = searching && facetId !== null && matches.some((item) => item.provider.id === facetId)
      ? facetId
      : null

    // Every model across every provider, paired with the route that serves it.
    const allModels = useMemo(() => providers.flatMap((row) => row.models), [providers])
    const favoriteRows = useMemo(
      () => allModels.filter(({ group, model }) => favorites.has(group.id + '/' + model.id)),
      [allModels, favorites],
    )

    const searchAll = useMemo(() => matches.flatMap((item) => item.models), [matches])

    const results = useMemo(() => {
      if (!searching) return []
      if (facet === null) return searchAll
      const item = matches.find((entry) => entry.provider.id === facet)
      return item === undefined ? [] : item.models
    }, [searching, searchAll, matches, facet])
    const matchCounts = useMemo(() => new Map(matches.map((item) => [item.provider.id, item.models.length])), [matches])

    // Provider column: filtered while searching, complete otherwise.
    const visibleProviders = searching ? matches.map((item) => item.provider) : providers

    // The right column is one list. In 'provider' mode: 收藏 first, then every
    // provider group. In 'vendor' mode: 收藏 first, then vendor-family groups —
    // a pure display re-bucketing of the SAME rows, so routing never changes.
    // Searching replaces both with flat results.
    const vendorRows = useMemo(
      () => (listMode === 'vendor' ? groupRowsByVendor(allModels, vendorRules) : providers),
      [listMode, allModels, providers, vendorRules],
    )
    const grouped = searching ? null : [{ id: FAVORITES_TAB, name: t('favorites'), models: favoriteRows }, ...vendorRows]
    const rows = searching ? results : []

    // The same list, flattened in render order. The keyboard cursor is an index
    // into this, so an empty 收藏 group is simply skipped rather than standing
    // in the way of the first model.
    const flatRows = grouped === null ? rows : grouped.flatMap((group) => group.models)
    const activeAt = flatRows.length === 0 ? -1 : Math.min(activeIndex, flatRows.length - 1)
    const activeRow = activeAt === -1 ? null : flatRows[activeAt]
    /** The DOM id the search box points `aria-activedescendant` at. */
    const optionId = (index) => 'dsh-mp2-opt-' + index

    // Which left-column row is lit: the query facet while searching, otherwise
    // the section pinned at the list's top edge. At scrollTop 0 the spy lands
    // on the favorites group, so "收藏" is lit by default.
    const highlighted = searching
      ? (facet === null ? ALL_TAB : facet)
      : (spyId ?? FAVORITES_TAB)

    // Search results span providers, so their rows always name the serving route.
    const rowDetail = (group, model) =>
      model.description === undefined ? group.name : group.name + ' · ' + model.description

    // The display supplier a route belongs to. A folded `(modlens vision)` route
    // has no row of its own, so its models must wear their base provider's chip
    // rather than one of their own.
    const displayProviderOf = (group) =>
      providers.find((row) => row.models.some((entry) => entry.group.id === group.id)) ?? group

    const busy = state.status === 'selecting'
    const modelLabel = currentChoice === null ? t('triggerFallback') : currentChoice.model.name
    // The supplier behind the current selection, for the chip the trigger wears
    // and the tooltip it shows. Both name the *display* supplier, so a selection
    // on a folded `(modlens vision)` route reads as its base provider — matching
    // the column the user picked from.
    const currentProvider = currentChoice === null ? null : displayProviderOf(currentChoice.group)
    // One model id is routinely served by several providers, so the model name
    // alone does not say where the model runs.
    const modelTip = currentChoice === null ? modelLabel
      : currentProvider.name + ' · ' + currentChoice.model.name
    const factsOf = (group, model) => (facts === null ? undefined : facts.get(group.id + '/' + model.id))

    const reload = () => {
      lastActionRef.current = 'load'
      load()
    }

    // ── Elevator ──
    // The grouped list is a table of contents with 收藏 as its first floor,
    // followed by every provider. Scrolling the list lights the left column
    // row for the section pinned at the list's top edge.
    const floors = () =>
      (grouped ?? []).map((g) => ({
        id: g.id,
        top: groupRefs.current.get(g.id)?.offsetTop ?? 0,
      }))

    /**
     * Jump the list to a floor. The left column is a table of contents, not a
     * ride: a supplier click has to land on its group at once, so the scroll is
     * instant rather than animated. jsdom and older carriers have no `scrollTo`
     * at all, hence the plain-offset fallback.
     */
    const scrollList = (list, top) => {
      if (list === null) return
      if (typeof list.scrollTo === 'function') list.scrollTo({ top, behavior: 'auto' })
      else list.scrollTop = top
    }

    const scrollToFloor = (id) => {
      const node = groupRefs.current.get(id)
      if (node === undefined) return
      scrollList(listRef.current, node.offsetTop)
      setSpyId(id)
    }

    /** Click on a supplier row: a facet while a query is active, else a floor. */
    const pickProvider = (id) => {
      if (searching) {
        setFacetId(facetId === id ? null : id)
        return
      }
      scrollToFloor(id)
    }

    const onListScroll = (event) => {
      if (searching) return
      setSpyId(floorAt(floors(), event.currentTarget.scrollTop))
    }

    useEffect(() => {
      if (!available) return
      lastActionRef.current = 'load'
      load()
    }, [available, load])

    // Model facts are host-wide, not per session: fetch once while mounted.
    useEffect(() => {
      if (!available) return
      let live = true
      loadFacts().then((map) => { if (live) setFacts(map) })
      loadDefaults().then((map) => { if (live) setModelDefaults(map) })
      loadGrouping().then((rules) => { if (live && rules !== null) setVendorRules(rules) })
      return () => { live = false }
    }, [available])

    // Effort advisory follows the current model: refetch whenever the
    // provider/model pair changes. Failures leave the previous advice stale
    // only until the next change; a missing route keeps advice null.
    const currentKey = current === null ? null : current.provider + '/' + current.model
    useEffect(() => {
      if (!available || currentKey === null || currentChoice === null) return
      let live = true
      loadAdvice(currentChoice.model.id, currentChoice.model.name).then((result) => {
        if (live) setAdvice(result)
      })
      return () => { live = false }
    }, [available, currentKey])

    // Auto-focus search when model popup opens
    useEffect(() => {
      if (openKind === 'model') {
        requestAnimationFrame(() => { searchRef.current?.focus() })
      }
    }, [openKind])

    // Every new popup and every new result set starts on the first row, so the
    // arrow keys work the moment the panel is open.
    useEffect(() => { setActiveIndex(0) }, [openKind, query, facetId])

    // Keep the cursor on screen. `scroll-margin-top` in the stylesheet keeps the
    // sticky group header from covering the row it scrolled to.
    useEffect(() => {
      if (openKind !== 'model' || listRef.current === null) return
      const node = listRef.current.querySelector('.dsh-mp2-optionActive')
      if (node !== null && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'nearest' })
    }, [openKind, activeIndex, query, facetId, flatRows.length])

    // A new query starts broad: the previous provider facet no longer applies.
    useEffect(() => { setFacetId(null) }, [query])

    // Close on Escape
    useEffect(() => {
      if (openKind === null) return
      const handler = (event) => {
        if (event.key === 'Escape') {
          setOpenKind(null)
          setNotice(null)
          setFacetId(null)
          setSpyId(null)
          setQuery('')
        }
      }
      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }, [openKind])

    // Close on outside click
    useEffect(() => {
      if (openKind === null) return
      const handler = (event) => {
        if (rootRef.current && !rootRef.current.contains(event.target)) {
          setOpenKind(null)
          setNotice(null)
          setFacetId(null)
          setSpyId(null)
          setQuery('')
        }
      }
      // Use mousedown to catch clicks before the menu loses focus
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [openKind])

    // Blur handling for model menu
    const onModelBlur = (event) => {
      const related = event.relatedTarget
      if (related !== null && rootRef.current !== null && rootRef.current.contains(related)) return
      // Clicking the effort trigger button is fine
      if (related === triggerRightRef.current) return
      setOpenKind(null)
      setNotice(null)
      setFacetId(null)
      setSpyId(null)
      setQuery('')
    }

    const close = (restoreFocus) => {
      setOpenKind(null)
      setNotice(null)
      setFacetId(null)
      setSpyId(null)
      setQuery('')
      if (restoreFocus && triggerLeftRef.current !== null) triggerLeftRef.current.focus()
    }

    const settle = (accepted) => {
      if (accepted) {
        close(true)
        return
      }
      const message = directory === null ? null : directory.getSnapshot().error
      setNotice(message === null ? t('selectFailed') : t('selectFailedMsg') + message)
    }

    // --- Select a model ---
    const choose = (group, model) => {
      if (current !== null && current.provider === group.id && current.model === model.id) {
        close(true)
        return
      }
      lastActionRef.current = 'select'
      const effort = (current !== null && current.provider === group.id)
        ? current.reasoningEffort
        : model.reasoning?.defaultEffort
      const selection = {
        provider: group.id,
        model: model.id,
        ...(effort === undefined ? {} : { reasoningEffort: effort }),
      }
      void select(selection).then(settle)
    }

    // --- Select reasoning effort independently ---
    const chooseEffort = (effort) => {
      if (current === null) return
      if (effectiveEffort === effort) return
      lastActionRef.current = 'select'
      const selection = {
        provider: current.provider,
        model: current.model,
        ...(effort === undefined ? {} : { reasoningEffort: effort }),
      }
      void select(selection).then(settle)
    }

    // --- Keyboard ---
    // The whole popup is drivable from the search box: ↑/↓ walk the list, Enter
    // commits the row the cursor is on. Focus stays in the input, so the cursor
    // is reported to assistive tech through `aria-activedescendant` rather than
    // by moving DOM focus — typing keeps filtering after every arrow press.
    const moveCursor = (delta) => {
      const count = flatRows.length
      if (count === 0) return
      const from = activeAt === -1 ? 0 : activeAt
      setActiveIndex(Math.min(Math.max(from + delta, 0), count - 1))
    }

    const onMenuKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      switch (event.key) {
        case 'ArrowDown': event.preventDefault(); moveCursor(1); break
        case 'ArrowUp': event.preventDefault(); moveCursor(-1); break
        case 'Home': event.preventDefault(); setActiveIndex(0); break
        case 'End': event.preventDefault(); setActiveIndex(flatRows.length - 1); break
        case 'PageDown': event.preventDefault(); moveCursor(10); break
        case 'PageUp': event.preventDefault(); moveCursor(-10); break
        case 'Enter':
          // Enter belongs to the search box alone. On a focused row or star the
          // button's own activation must win, or Enter on a star would both
          // favorite and pick a model.
          if (event.target !== searchRef.current) return
          event.preventDefault()
          if (activeRow !== null) choose(activeRow.group, activeRow.model)
          break
        default: break
      }
    }

    if (!available || directory === null) return null

    // Rows are numbered in render order, which is exactly `flatRows` order, so
    // the cursor can address one by index and the search box can name it in
    // `aria-activedescendant`. Numbering by position rather than by route keeps
    // the two copies of a favorited model — the 收藏 mirror and the row under
    // its supplier — from lighting up together.
    let rowCursor = -1
    const takeRowIndex = () => { rowCursor += 1; return rowCursor }

    // ─── Render ───
    return h('div', { ref: rootRef, className: 'dsh-mp2-root' },

      // ─── Two-zone trigger ───
      h('div', { className: 'dsh-mp2-trigger' + (locked ? ' dsh-mp2-triggerLocked' : '') },

        // LEFT zone: model name (click opens model picker)
        h('button', {
          ref: triggerLeftRef,
          type: 'button',
          className: 'dsh-mp2-triggerLeft',
          title: modelTip,
          'aria-label': modelTip,
          'aria-haspopup': 'menu',
          'aria-expanded': openKind === 'model',
          disabled: locked,
          onClick: () => {
            if (openKind === 'model') { close() } else {
              setOpenKind('model')
              setNotice(null)
              setQuery('')
              lastActionRef.current = 'load'
              reload()
            }
          },
        },
          currentProvider !== null && supplierChip(currentProvider),
          h('span', { className: 'dsh-mp2-triggerLabel' }, modelLabel),
          h('span', { className: 'dsh-mp2-chevron' + (openKind === 'model' ? ' dsh-mp2-chevronOpen' : '') }, icon('chevron', 12)),
        ),

        // Divider
        effortLabel !== undefined && h('span', { className: 'dsh-mp2-triggerDivider' }),

        // RIGHT zone: effort label (click opens effort picker)
        effortLabel !== undefined && h('button', {
          ref: triggerRightRef,
          type: 'button',
          className: 'dsh-mp2-triggerRight',
          title: t('effortHeading') + ': ' + effortLabel,
          'aria-label': t('effortHeading') + ': ' + effortLabel,
          'aria-haspopup': 'menu',
          'aria-expanded': openKind === 'effort',
          disabled: locked,
          onClick: () => {
            if (openKind === 'effort') { setOpenKind(null) } else {
              setOpenKind('effort')
            }
          },
        },
          h('span', null, effortLabel),
          h('span', { className: 'dsh-mp2-chevron' + (openKind === 'effort' ? ' dsh-mp2-chevronOpen' : '') }, icon('chevron', 12)),
        ),
      ),

      // ─── Model picker popup ───
      openKind === 'model' && h('div', {
        className: 'dsh-mp2-menu',
        role: 'menu',
        tabIndex: -1,
        onBlur: onModelBlur,
        onKeyDown: onMenuKeyDown,
        onMouseDown: (event) => { event.preventDefault() },
        'aria-busy': state.status === 'loading' || busy,
      },
        // Search input — always at the top, auto-focused
        h('input', {
          ref: searchRef,
          type: 'text',
          className: 'dsh-mp2-search',
          placeholder: t('search'),
          value: query,
          onChange: (event) => { setQuery(event.target.value) },
          // Focus never leaves the search box, so this is what tells a screen
          // reader which row the arrow keys are standing on.
          'aria-activedescendant': activeAt === -1 ? undefined : optionId(activeAt),
        }),

        // Grouping mode switch — display only: 'provider' keeps the original
        // per-provider sections, 'vendor' re-buckets the same rows by model
        // family. Both submit the original route on pick.
        h('div', { className: 'dsh-mp2-modeRow' },
          h('button', {
            type: 'button',
            className: 'dsh-mp2-modeBtn' + (listMode === 'provider' ? ' dsh-mp2-modeBtnActive' : ''),
            onClick: () => { setListMode('provider') },
          }, t('groupByProvider')),
          h('button', {
            type: 'button',
            className: 'dsh-mp2-modeBtn' + (listMode === 'vendor' ? ' dsh-mp2-modeBtnActive' : ''),
            onClick: () => { setListMode('vendor') },
          }, t('groupByVendor')),
        ),

        // Body: providers (left) + model list (right)
        h('div', { className: 'dsh-mp2-body' },
          // Provider sidebar — caption then the floors.
          h('div', { className: 'dsh-mp2-providers', role: 'tablist', 'aria-label': t('providers') },
            // Column caption follows the active grouping mode.
            h('div', { className: 'dsh-mp2-paneCaption' }, listMode === 'vendor' ? t('groupByVendor') : t('allProviders')),
            // 收藏 floor — a mirrored copy at the top of the model list.
            h('button', {
              key: FAVORITES_TAB,
              type: 'button',
              role: 'tab',
              'aria-selected': highlighted === FAVORITES_TAB,
              className: 'dsh-mp2-provider' + (highlighted === FAVORITES_TAB ? ' dsh-mp2-providerActive' : ''),
              onClick: () => { scrollToFloor(FAVORITES_TAB) },
            },
              h('span', { className: 'dsh-mp2-providerName' }, t('favorites')),
              h('span', { className: 'dsh-mp2-providerCount' }, String(favoriteRows.length)),
            ),
            // The floor rows: provider groups in 'provider' mode, vendor
            // families in 'vendor' mode. Clicking a floor scrolls the model
            // list to that section, whichever mode is active.
            (listMode === 'vendor' ? vendorRows : visibleProviders).map((section) => {
              const active = highlighted === section.id
              const count = searching ? (matchCounts.get(section.id) ?? 0) : section.models.length
              return h('button', {
                key: section.id,
                type: 'button',
                role: 'tab',
                'aria-selected': active,
                className: 'dsh-mp2-provider' + (active ? ' dsh-mp2-providerActive' : ''),
                onClick: () => { pickProvider(section.id) },
              },
                listMode === 'provider' && supplierChip(section),
                h('span', { className: 'dsh-mp2-providerName' }, section.name),
                h('span', { className: 'dsh-mp2-providerCount' }, String(count)),
              )
            }),
          ),

          // Model list
          h('div', { className: 'dsh-mp2-list', ref: listRef, onScroll: onListScroll },
            state.status === 'loading'
              ? h('div', { className: 'dsh-mp2-status' }, t('loading'))
              : h(Fragment, null,
                  state.error !== null && lastActionRef.current === 'load'
                    && h('div', { className: 'dsh-mp2-error' },
                        h('span', null, String(state.error)),
                        h('button', { type: 'button', className: 'dsh-mp2-retry', onClick: reload }, t('retry')),
                      ),
                  notice !== null
                    && h('div', { className: 'dsh-mp2-error' },
                        h('span', null, notice),
                      ),
                  !searching && state.failures.map((failure) =>
                    h('div', { className: 'dsh-mp2-warning', key: failure.id },
                      h('span', null, failure.name + ' 加载失败：' + failure.message),
                      h('button', { type: 'button', className: 'dsh-mp2-retry', onClick: reload }, t('retry')),
                    ),
                  ),
                  (grouped === null ? rows.length === 0 : providers.length === 0)
                    ? h('div', { className: 'dsh-mp2-empty' },
                        searching ? t('noMatch') : t('noModels'))
                    : grouped === null
                      ? rows.map(({ group, model }) => {
                          const index = takeRowIndex()
                          const selected = current !== null && current.provider === group.id && current.model === model.id
                          return h(ModelRow, {
                            key: group.id + '/' + model.id,
                            id: optionId(index),
                            group,
                            provider: displayProviderOf(group),
                            model,
                            detail: rowDetail(group, model),
                            selected,
                            active: index === activeAt,
                            busy,
                            favorite: isFavorite(group, model),
                            facts: factsOf(group, model),
                            bridged: VISION_ROUTE.test(group.name),
                            onToggle: () => { toggleFavorite(group, model) },
                            onChoose: () => { choose(group, model) },
                          })
                        })
                      : grouped.map((g) =>
                          h('div', {
                            key: g.id,
                            className: 'dsh-mp2-group',
                            ref: (node) => {
                              if (node === null) groupRefs.current.delete(g.id)
                              else groupRefs.current.set(g.id, node)
                            },
                          },
                            h('div', { className: 'dsh-mp2-groupHeader' },
                              h('span', { className: 'dsh-mp2-groupHeaderIcon' }, icon('building', 14)),
                              h('span', null, g.name),
                            ),
                            g.models.length === 0
                              ? h('div', { className: 'dsh-mp2-empty' },
                                  g.id === FAVORITES_TAB ? t('favoritesEmpty') : t('providerEmpty'))
                              : g.models.map(({ group, model }) => {
                                  const index = takeRowIndex()
                                  const selected = current !== null && current.provider === group.id && current.model === model.id
                                  return h(ModelRow, {
                                    key: group.id + '/' + model.id,
                                    id: optionId(index),
                                    group,
                                    provider: displayProviderOf(group),
                                    model,
                                    detail: g.id === FAVORITES_TAB ? rowDetail(group, model) : model.description,
                                    selected,
                                    active: index === activeAt,
                                    busy,
                                    favorite: isFavorite(group, model),
                                    facts: factsOf(group, model),
                                    bridged: VISION_ROUTE.test(group.name),
                                    onToggle: () => { toggleFavorite(group, model) },
                                    onChoose: () => { choose(group, model) },
                                  })
                                }),
                          ),
                        ),
                ),
          ),
        ),
      ),

      // ─── Effort picker popup (SEPARATE, standalone) ───
      openKind === 'effort' && EffortPopup({
        reasoning,
        effectiveEffort,
        effortChoices,
        busy,
        chooseEffort,
        advice,
        defaultEffort: currentKey === null ? undefined : modelDefaults.get(currentKey),
        onSetDefault: (effort) => {
          if (currentKey === null || effort === undefined) return
          const next = new Map(modelDefaults)
          next.set(currentKey, effort)
          setModelDefaults(next)
          void saveDefault(currentKey, effort)
        },
        onClearDefault: () => {
          if (currentKey === null) return
          const next = new Map(modelDefaults)
          next.delete(currentKey)
          setModelDefaults(next)
          void saveDefault(currentKey, null)
        },
      }),
    )
  }

  // ─── Model-selection page ───
  // Registered into `settings.section`, so it is one entry in the settings
  // navigation. This is the functional first pass: fetch what a channel serves,
  // tick the models to bring into the app, save. Visual refinement comes later,
  // so the markup is deliberately plain and uses only theme tokens.
  //
  // The page never writes to the composer seat: it reads and writes the
  // `llm-pi-ai` selection through the host routes, which is the same source the
  // picker reads. A saved selection therefore shows up in every entry point.
  function ModelControlPage() {
    const [providers, setProviders] = useState(null)
    const [error, setError] = useState(null)
    const [busyId, setBusyId] = useState(null)
    // Per provider: the fetched candidate list plus the tick state.
    const [drafts, setDrafts] = useState({})
    const [notice, setNotice] = useState(null)
    // Host diagnostics, shown verbatim on demand: this page is the only channel
    // that can reach these routes on a fenced host, so a failure has to be
    // readable here rather than only in a log file.
    const [status, setStatus] = useState(null)
    const [showStatus, setShowStatus] = useState(false)
    // The add-channel form's fields, and which channel's editor is open.
    const [draft, setDraft] = useState({ id: '', displayName: '', api: 'openai-completions', baseURL: '', apiKey: '', apiKeyEnv: '' })
    const [addOpen, setAddOpen] = useState(false)
    // The add-channel wizard's own state: what the endpoint listed for this
    // unsaved draft, which of those are ticked, and whether the last probe said
    // the endpoint answers. All of it is pre-create, so none of it is persisted.
    const [draftPicked, setDraftPicked] = useState({ available: null, selected: new Set() })
    const [probeResult, setProbeResult] = useState(null)
    const [editing, setEditing] = useState(null)
    // Layered dialogs. Layer 1 is the channel editor (`openChannelId`); layer 2
    // is one model's settings, stacked on top (`modelSheetKey` names it). Both
    // are view state only — closing them never writes anything.
    const [openChannelId, setOpenChannelId] = useState(null)
    const [modelSheetKey, setModelSheetKey] = useState(null)
    const [menuOpen, setMenuOpen] = useState(null)
    const [takeover, setTakeover] = useState(null)
    // Effort editor: per provider, the declared-vs-suggested rows.
    const [effort, setEffort] = useState({})            // providerId -> rows
    const [effortDraft, setEffortDraft] = useState({})  // `${provider}/${model}` -> {levels:Set, wire, adaptive}
    const [effortOpen, setEffortOpen] = useState(null)  // providerId whose effort panel is open
    // The five strength boxes are always rendered; the host gives the order.
    const [effortLevels, setEffortLevels] = useState({})  // providerId -> string[]
    // Per-model abilities, keyed `${provider}/${model}`. Only the fields pi-ai
    // actually has a slot for are offered (see the ability route's comment).
    const [abilityDraft, setAbilityDraft] = useState({})  // -> {input:Set, contextWindow, maxTokens}
    // Which BUILT-IN channel's own config editor is open, and its pending fields.
    const [editingEntry, setEditingEntry] = useState(null)
    const [editingEntryBaseURL, setEditingEntryBaseURL] = useState(null)
    const [editingEntryEffort, setEditingEntryEffort] = useState(null)
    const [editingEntryThinking, setEditingEntryThinking] = useState(null)
    // Plaintext key draft for the built-in API-key channel. It is deliberately
    // kept separate from the persisted provider settings and only sent on save.
    const [entryKey, setEntryKey] = useState('')
    // The namespace the editor writes into. Prefilled from auto-detection and
    // editable: the directory API is the only way to learn a built-in channel's
    // namespace, so a manual override keeps this working when that call answers
    // nothing. The host validates it against the live settings descriptors.
    const [editingEntryNs, setEditingEntryNs] = useState(null)

    const loadProviders = () => {
      setError(null)
      return fetch(PROVIDERS_ROUTE, { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status))))
        .then((body) => {
          const list = Array.isArray(body?.providers) ? body.providers : []
          setProviders(list)
          setTakeover(body?.takeover !== false)
          // If the channel whose sheet is open disappeared (deleted, or the list
          // changed underneath), close the sheet rather than leaving it showing
          // a channel that no longer exists.
          setOpenChannelId((current) => (current !== null && list.some((p) => p.id === current) ? current : null))
        })
        .catch((failure) => { setError(String(failure?.message ?? failure)) })
    }

    const loadStatus = () => {
      setShowStatus(true)
      fetch(STATUS_ROUTE, { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status))))
        .then((body) => { setStatus(body) })
        .catch((failure) => { setStatus({ ok: false, error: String(failure?.message ?? failure) }) })
    }

    /** One POST that re-reads the provider list on success. */
    const post = (route, payload, onDone) => {
      setError(null)
      setNotice(null)
      return fetch(route, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((response) => (response.ok ? response.json() : response.json().then(
          (body) => Promise.reject(new Error(body?.error ?? ('HTTP ' + response.status))),
          () => Promise.reject(new Error('HTTP ' + response.status)),
        )))
        .then((body) => { if (onDone !== undefined) onDone(body); return body })
        .catch((failure) => { setError(String(failure?.message ?? failure)); return null })
    }

    /** Save the edited fields of a BUILT-IN channel (its own settings entry). */
    const saveEntry = (id, fields, apiKey, ns) => {
      void post(ENTRY_ROUTE, {
        provider: id,
        fields,
        ...(typeof ns === 'string' && ns !== '' ? { ns } : {}),
        ...(typeof apiKey === 'string' && apiKey !== '' ? { apiKey } : {}),
      }, (body) => {
        setEditingEntry(null)
        setNotice(body?.keyStored === true ? t('entrySavedWithKey') : t('entrySaved'))
        void loadProviders()
      })
    }

    /**
     * Create the channel.
     *
     * The picked models travel WITH the create: pi-ai refuses a provider whose
     * models array is empty, so "create an empty shell, then add models" is not
     * a flow the document supports. This is the last step of the wizard, and the
     * one that actually writes.
     */
    const addChannel = () => {
      if (draft.id.trim() === '') { setError(t('channelIdRequired')); return }
      const models = (draftPicked.available ?? []).filter((model) => draftPicked.selected.has(model.id))
      if (models.length === 0) { setError(t('pickAtLeastOne')); return }
      setBusyId('*')
      void post(PROVIDER_ROUTE, { action: 'add', ...draft, id: draft.id.trim(), models }, (body) => {
        setBusyId(null)
        setNotice(body?.keyStored === true
          ? tf('channelAddedWithKey', draft.id.trim())
          : tf('channelAdded', draft.id.trim()))
        setDraft({ id: '', displayName: '', api: 'openai-completions', baseURL: '', apiKey: '', apiKeyEnv: '' })
        setDraftPicked({ available: null, selected: new Set() })
        setProbeResult(null)
        setAddOpen(false)
        void loadProviders()
      })
    }

    /** Ask the host whether this draft reachably answers. Writes nothing. */
    const probeDraft = () => {
      if (draft.id.trim() === '') { setError(t('channelIdRequired')); return }
      setBusyId('*')
      setProbeResult(null)
      void post(PROBE_ROUTE, { draft: { ...draft, id: draft.id.trim() } }, (body) => {
        setBusyId(null)
        setProbeResult({ reachable: true, modelCount: body?.modelCount ?? 0 })
        setNotice(body?.modelCount > 0 ? tf('probeOk', body.modelCount) : t('probeOkNoModels'))
      })
    }

    /** Fetch the endpoint's model list for an UNSAVED draft. Writes nothing. */
    const fetchDraftModels = () => {
      if (draft.id.trim() === '') { setError(t('channelIdRequired')); return }
      setBusyId('*')
      void post(AVAILABLE_ROUTE, { draft: { ...draft, id: draft.id.trim() } }, (body) => {
        setBusyId(null)
        const available = Array.isArray(body?.available) ? body.available : []
        setDraftPicked({ available, selected: new Set(available.map((model) => model.id)) })
        setNotice(tf('fetchedCount', available.length))
      })
    }

    const saveChannel = (id) => {
      const fields = editing ?? {}
      void post(PROVIDER_ROUTE, {
        action: 'update',
        id,
        ...(typeof fields.displayName === 'string' ? { displayName: fields.displayName } : {}),
        ...(typeof fields.baseURL === 'string' ? { baseURL: fields.baseURL } : {}),
        ...(typeof fields.api === 'string' ? { api: fields.api } : {}),
        ...(typeof fields.apiKeyEnv === 'string' ? { apiKeyEnv: fields.apiKeyEnv } : {}),
        // Blank means "keep the current key"; only a typed value is written.
        ...(typeof fields.apiKey === 'string' && fields.apiKey !== '' ? { apiKey: fields.apiKey } : {}),
      }, (body) => {
        setEditing(null)
        setNotice(body?.keyStored === true ? tf('channelSavedWithKey', id) : tf('channelSaved', id))
        void loadProviders()
      })
    }

    const removeChannel = (id) => {
      void post(PROVIDER_ROUTE, { action: 'remove', id }, () => {
        setNotice(tf('channelRemoved', id))
        void loadProviders()
      })
    }

    const toggleHidden = (provider) => {
      void post(HIDDEN_ROUTE, { provider: provider.id, hidden: !provider.hidden }, () => {
        // The picker caches the catalog; drop it so the change is visible on
        // the next open rather than after the cache expires.
        factsPromise = null
        void loadProviders()
      })
    }

    const toggleTakeover = () => {
      const next = !(takeover === true)
      void post(TAKEOVER_ROUTE, { enabled: next }, (body) => {
        const enabled = body?.enabled !== false
        setTakeover(enabled)
        // The layer stack is read when the host loads, so the nav only changes
        // after a restart. Say so rather than pretending the switch is instant.
        setNotice(body?.restart === true
          ? (enabled ? t('takeoverOnRestart') : t('takeoverOffRestart'))
          : (enabled ? t('takeoverOn') : t('takeoverOff')))
      })
    }

    // Opening the effort panel toggles it: pressing the button again (or the
    // panel's own 收起) closes it, so the box a save leaves behind can be put
    // away without reloading the page.
    // Loads a channel's effort rows (and seeds the drafts). Opening/closing the
    // model sheet is the caller's business — this is just the fetch, so the
    // sheet can open first and fill in when the data lands.
    const loadEffort = (id) => {
      setEffortOpen(id)
      fetch(EFFORT_ROUTE + '?provider=' + encodeURIComponent(id), { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status))))
        .then((body) => {
          const rows = Array.isArray(body?.models) ? body.models : []
          setEffort((current) => ({ ...current, [id]: rows }))
          // Seed one editable box per canonical level. What is declared wins;
          // otherwise the suggestion fills the box; otherwise the level name is
          // its own wire spelling. A model whose advice skips a level still gets
          // a box, so nothing is silently missing from the editor.
          const levels = Array.isArray(body?.levels) && body.levels.length > 0
            ? body.levels
            : ['low', 'medium', 'high', 'xhigh', 'max']
          setEffortLevels((current) => ({ ...current, [id]: levels }))
          const seed = {}
          for (const row of rows) {
            const declared = row.declared
            const suggestedWire = row.suggested?.wire
            const wire = {}
            for (const level of levels) {
              const fromDeclared = declared !== null && typeof declared === 'object' ? declared[level] : undefined
              const fromSuggested = suggestedWire !== null && typeof suggestedWire === 'object' ? suggestedWire[level] : undefined
              wire[level] = typeof fromDeclared === 'string' && fromDeclared !== ''
                ? fromDeclared
                : (typeof fromSuggested === 'string' && fromSuggested !== '' ? fromSuggested : level)
            }
            const declaredLevels = declared === false
              ? []
              : (declared !== null && typeof declared === 'object' ? Object.keys(declared) : [])
            const suggestedLevels = suggestedWire !== null && typeof suggestedWire === 'object' ? Object.keys(suggestedWire) : []
            const active = declaredLevels.length > 0 ? declaredLevels : suggestedLevels
            seed[id + '/' + row.id] = {
              levels: new Set(active.filter((level) => levels.includes(level) || level === 'off')),
              wire,
              // 自适应: ticked when the model already declares it, otherwise when
              // the knowledge base says this generation works that way.
              adaptive: declared !== null && typeof declared === 'object' && row.declaredAdaptive === true
                ? true
                : (declared === undefined || declared === null ? row.suggestedAdaptive === true : false),
              noReasoning: declared === false,
              off: declared !== null && typeof declared === 'object' && 'off' in declared
                ? declared.off
                : (suggestedWire !== null && typeof suggestedWire === 'object' && 'off' in suggestedWire ? suggestedWire.off : undefined),
              declared,
            }
          }
          setEffortDraft((current) => ({ ...current, ...seed }))
          // Capabilities ride along in the same response, so one fetch fills
          // both the ladder editor and the ability row.
          const abilitySeed = {}
          for (const row of rows) {
            abilitySeed[id + '/' + row.id] = {
              input: new Set(Array.isArray(row.input) ? row.input : []),
              suggestedInput: Array.isArray(row.suggested?.input) ? row.suggested.input : [],
              contextWindow: typeof row.contextWindow === 'number' ? String(row.contextWindow) : '',
              maxTokens: typeof row.maxTokens === 'number' ? String(row.maxTokens) : '',
              declaredInput: Array.isArray(row.input) ? row.input : undefined,
            }
          }
          setAbilityDraft((current) => ({ ...current, ...abilitySeed }))
        })
        .catch((failure) => { setError(String(failure?.message ?? failure)) })
    }

    const toggleLevel = (key, level) => {
      setEffortDraft((current) => {
        const entry = current[key]
        if (entry === undefined) return current
        const levels = new Set(entry.levels)
        if (!levels.delete(level)) levels.add(level)
        return { ...current, [key]: { ...entry, levels, noReasoning: false } }
      })
    }

    const setWire = (key, level, value) => {
      setEffortDraft((current) => {
        const entry = current[key]
        if (entry === undefined) return current
        return { ...current, [key]: { ...entry, wire: { ...entry.wire, [level]: value } } }
      })
    }

    const toggleAdaptive = (key) => {
      setEffortDraft((current) => {
        const entry = current[key]
        if (entry === undefined) return current
        return { ...current, [key]: { ...entry, adaptive: entry.adaptive !== true } }
      })
    }

    /** Write the ticked levels (with the wire values in their boxes) back. */
    const saveEffort = (providerId, row) => {
      const key = providerId + '/' + row.id
      const draftRow = effortDraft[key] ?? { levels: new Set() }
      const wire = {}
      for (const level of draftRow.levels) {
        const value = draftRow.wire?.[level]
        wire[level] = typeof value === 'string' && value !== '' ? value : level
      }
      // `off` is not one of the five strength boxes, but a ladder that already
      // declares it must keep it: dropping it would silently re-enable thinking.
      if (draftRow.off !== undefined) wire.off = draftRow.off
      const compat = {
        ...(row.suggested?.compat === undefined ? {} : row.suggested.compat),
        ...(draftRow.adaptive === true ? { forceAdaptiveThinking: true } : {}),
      }
      void post(DECLARE_ROUTE, {
        provider: providerId,
        model: row.id,
        ladder: draftRow.noReasoning === true || draftRow.levels.size === 0 ? false : wire,
        ...(Object.keys(compat).length === 0 ? {} : { compat }),
      }, () => {
        setNotice(tf('effortSaved', row.id))
        void loadEffort(providerId)
      })
    }

    useEffect(() => { void loadProviders() }, [])

    /**
     * Open the channel editor sheet (layer 1).
     *
     * Every editor state is cleared on open, so a sheet always starts from the
     * channel's real values rather than residue from a previous channel — the
     * bug class where a cancelled edit leaks into the next one.
     */
    const openChannel = (provider) => {
      setOpenChannelId(provider.id)
      setModelSheetKey(null)
      setMenuOpen(null)
      setEditing(null)
      setEditingEntry(null)
      setEntryKey('')
      setDraft((current) => current)
      // Load the channel's ALREADY-SELECTED models so the sheet has content the
      // moment it opens. This is a local read (the pi-ai document), not a
      // network fetch: a model list must not require the endpoint to be up, and
      // re-fetching on every open threw away nothing but also gained nothing.
      if (provider.kind === 'config') void loadEffort(provider.id)
      else toggleEntryEditor(provider)
    }

    /** Close both layers, discarding any drafts. */
    const closeSheets = () => {
      setOpenChannelId(null)
      setModelSheetKey(null)
      setEffortOpen(null)
      setEditing(null)
      setEditingEntry(null)
    }

    /** Open layer 2 for one model: its effort ladder and its capabilities. */
    const openModelSheet = (provider, model) => {
      setModelSheetKey(String(model.name ?? model.id))
      if (effort[provider.id] === undefined) loadEffort(provider.id)
      else setEffortOpen(provider.id)
    }

    /** Open layer 2 for a self-built channel's model, addressed by its row. */
    const openModelSheetForRow = (provider, row) => {
      setModelSheetKey(String(row.name ?? row.id))
      setEffortOpen(provider.id)
    }

    // Escape closes the topmost layer first, then the one under it — the order
    // a stacked dialog is expected to unwind in.
    useEffect(() => {
      if (openChannelId === null && modelSheetKey === null) return
      const onKey = (event) => {
        if (event.key !== 'Escape') return
        if (modelSheetKey !== null) { setModelSheetKey(null); setEffortOpen(null) }
        else closeSheets()
      }
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }, [openChannelId, modelSheetKey])

    /** Open/close the built-in channel's own-config editor, seeded each time. */
    const toggleEntryEditor = (provider) => {
      const opening = editingEntry !== provider.id
      setEditingEntry(opening ? provider.id : null)
      setEntryKey('')
      // Seed the fields from the channel's current values each time the editor
      // opens, so a cancelled edit leaves no residue.
      setEditingEntryNs(opening ? (provider.editable?.ns ?? '') : null)
      setEditingEntryBaseURL(opening ? (provider.editable?.baseURL ?? '') : null)
      setEditingEntryEffort(opening ? (provider.editable?.reasoningEffort ?? '') : null)
      setEditingEntryThinking(opening ? (provider.editable?.thinking ?? '') : null)
    }

    /** Open/close the self-built channel's basic editor. */
    const toggleEditing = (provider, isOpen) => {
      setEditing(isOpen ? null : {
        id: provider.id,
        displayName: provider.displayName,
        baseURL: provider.baseURL ?? '',
        api: provider.api ?? 'openai-completions',
        apiKeyEnv: provider.apiKeyEnv ?? '',
      })
    }

    /** Tick/untick one request modality for a model. */
    const toggleInput = (key, modality) => {
      setAbilityDraft((current) => {
        const entry = current[key]
        if (entry === undefined) return current
        const input = new Set(entry.input)
        if (!input.delete(modality)) input.add(modality)
        return { ...current, [key]: { ...entry, input } }
      })
    }

    const setAbilityField = (key, field, value) => {
      setAbilityDraft((current) => {
        const entry = current[key]
        if (entry === undefined) return current
        return { ...current, [key]: { ...entry, [field]: value } }
      })
    }

    /**
     * Write the ticked modalities and the two budgets for one model.
     *
     * `text` is pinned on before sending: unticking it would write an empty
     * list, which pi-ai reads as "undeclared" and silently replaces with the
     * catalog's answer — the opposite of what unticking a box means.
     */
    const saveAbility = (providerId, row) => {
      const key = providerId + '/' + row.id
      const draftRow = abilityDraft[key]
      if (draftRow === undefined) return
      const input = new Set(draftRow.input)
      input.add('text')
      const payload = { provider: providerId, model: row.id, input: [...input] }
      for (const field of ['contextWindow', 'maxTokens']) {
        const raw = draftRow[field]
        if (typeof raw !== 'string' || raw.trim() === '') continue
        const value = Number(raw)
        if (!Number.isInteger(value) || value <= 0) {
          setError(tf('abilityBadNumber', field))
          return
        }
        payload[field] = value
      }
      void post(ABILITY_ROUTE, payload, () => {
        setNotice(tf('abilitySaved', row.id))
        void loadEffort(providerId)
      })
    }

    const fetchAvailable = (id) => {
      setBusyId(id)
      setError(null)
      setNotice(null)
      fetch(AVAILABLE_ROUTE + '?provider=' + encodeURIComponent(id), { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : response.json().then(
          (body) => Promise.reject(new Error(body?.error ?? ('HTTP ' + response.status))),
          () => Promise.reject(new Error('HTTP ' + response.status)),
        )))
        .then((body) => {
          const available = Array.isArray(body?.available) ? body.available : []
          const selected = new Set(Array.isArray(body?.selected) ? body.selected : [])
          setDrafts((current) => ({ ...current, [id]: { available, selected } }))
        })
        .catch((failure) => { setError(String(failure?.message ?? failure)) })
        .finally(() => { setBusyId(null) })
    }

    const toggle = (id, modelId) => {
      setDrafts((current) => {
        const draft = current[id]
        if (draft === undefined) return current
        const selected = new Set(draft.selected)
        if (!selected.delete(modelId)) selected.add(modelId)
        return { ...current, [id]: { ...draft, selected } }
      })
    }

    const setAll = (id, on) => {
      setDrafts((current) => {
        const draft = current[id]
        if (draft === undefined) return current
        const selected = on ? new Set(draft.available.map((model) => model.id)) : new Set()
        return { ...current, [id]: { ...draft, selected } }
      })
    }

    const save = (id) => {
      const draft = drafts[id]
      if (draft === undefined) return
      setBusyId(id)
      setError(null)
      setNotice(null)
      // Keep the display order of the fetched list, so a saved selection reads
      // the same way it was ticked.
      const ids = draft.available.map((model) => model.id).filter((modelId) => draft.selected.has(modelId))
      fetch(SELECTION_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: id, ids, available: draft.available }),
      })
        .then((response) => (response.ok ? response.json() : response.json().then(
          (body) => Promise.reject(new Error(body?.error ?? ('HTTP ' + response.status))),
          () => Promise.reject(new Error('HTTP ' + response.status)),
        )))
        .then((body) => {
          const diff = body?.diff ?? { added: [], removed: [], kept: [] }
          setNotice(tf('savedNotice', diff.added.length, diff.removed.length, diff.kept.length))
          setDrafts((current) => {
            const next = { ...current }
            delete next[id]
            return next
          })
          return loadProviders()
        })
        .catch((failure) => { setError(String(failure?.message ?? failure)) })
        .finally(() => { setBusyId(null) })
    }

    // Declare effort ladders. The host already fills undeclared models on load;
    // this is the manual remedy for a model added later, or for a deployment
    // that turned autofill off.
    const declare = (id) => {
      setBusyId(id === undefined ? '*' : id)
      setError(null)
      setNotice(null)
      fetch(DECLARE_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(id === undefined ? {} : { provider: id }),
      })
        .then((response) => (response.ok ? response.json() : response.json().then(
          (body) => Promise.reject(new Error(body?.error ?? ('HTTP ' + response.status))),
          () => Promise.reject(new Error('HTTP ' + response.status)),
        )))
        .then((body) => {
          const rows = Array.isArray(body?.results) ? body.results : [body]
          const applied = rows.filter((row) => Array.isArray(row.applied) && row.applied.length > 0).length
          const failed = rows.filter((row) => row.failed !== undefined)
          setNotice(tf('appliedNotice', applied, rows.length))
          // A per-model failure is the whole point of this button: show the
          // concrete reason instead of just a count.
          if (failed.length > 0) {
            setError(failed.slice(0, 3).map((row) =>
              (row.provider ?? '?') + '/' + (row.model ?? row.index) + ': ' + row.failed).join('  ·  '))
          }
          return loadProviders()
        })
        .catch((failure) => { setError(String(failure?.message ?? failure)) })
        .finally(() => { setBusyId(null) })
    }

    // A failed load must not also claim to be loading: the error line above is
    // the whole story, and when the failure is a 404 the host half is stale
    // (the client half reloads with the page, the host half does not), which
    // needs its own actionable wording rather than a bare status code.
    const hostStale = typeof error === 'string' && error.includes('404')

    // ── Master–detail, the Cherry Studio shape ──
    // ── The page is just a channel list ──
    // Everything that needs room lives in an overlay instead: the settings sheet
    // is narrow, so a side-by-side split made the rail cramped and the detail
    // pane very tall. One row per channel, with an 编辑 button — the Cherry shape.
    const channelList = providers === null || providers.length === 0
      ? null
      : providers.map((provider) => {
        const isConfig = provider.kind === 'config'
        return h('div', {
          key: provider.id,
          className: 'dsh-mc-listRow' + (provider.hidden ? ' dsh-mc-listRowHidden' : ''),
        },
          h('span', { className: 'dsh-mc-listName' }, provider.displayName),
          provider.hidden !== true && provider.credential?.configured !== false && h('span', { className: 'dsh-mc-dot' }),
          isConfig
            ? h('span', { className: 'dsh-mc-badge' }, t('channelCustom'))
            : h('span', { className: 'dsh-mc-badge' }, t('builtinChannel')),
          provider.hidden === true && h('span', { className: 'dsh-mc-badge' }, t('channelHidden')),
          h('span', { className: 'dsh-mc-listMeta' },
            (isConfig ? provider.id : (provider.editable?.ns ?? '')) + ' · ' + provider.modelCount),
          h('button', {
            type: 'button', className: 'dsh-mc-btn',
            onClick: () => { openChannel(provider) },
          }, t('edit')),
        )
      })

    // ── Layer 1: the channel editor sheet ──
    const openProvider = providers === null
      ? undefined
      : providers.find((provider) => provider.id === openChannelId)

    // Layer 2's data: the effort rows for the open channel, once fetched.
    const effortRowsForOpen = openChannelId === null ? undefined : effort[openChannelId]

    const channelSheet = openProvider === undefined ? null : (() => {
      const provider = openProvider
      const draft = drafts[provider.id]
      const busy = busyId === provider.id
      const isConfig = provider.kind === 'config'
      const editingThis = editing !== null && editing.id === provider.id
      return h('div', {
        className: 'dsh-mc-scrim',
        onClick: (event) => { if (event.target === event.currentTarget) closeSheets() },
      },
        h('div', { className: 'dsh-mc-sheet', role: 'dialog', 'aria-modal': 'true' },
          h('div', { className: 'dsh-mc-sheetHead' },
            h('span', { className: 'dsh-mc-sheetTitle' }, provider.displayName),
            h('span', { className: 'dsh-mc-badge' }, provider.api ?? '—'),
            isConfig
              ? h('span', { className: 'dsh-mc-badge' }, t('channelCustom'))
              : h('span', { className: 'dsh-mc-badge' }, t('builtinChannel')),
            provider.credential !== undefined && h('span', {
              className: 'dsh-mc-badge' + (provider.credential.configured ? ' dsh-mc-badgeOk' : ''),
            }, provider.credential.configured ? t('credentialOk') : t('credentialMissing')),
            h('button', { type: 'button', className: 'dsh-mc-close', onClick: closeSheets, title: t('cancel') }, '×'),
          ),
          h('div', { className: 'dsh-mc-sheetBody' },
            isConfig && h(Fragment, null,
              h('div', { className: 'dsh-mc-actions' },
                h('button', {
                  type: 'button', className: 'dsh-mc-btn dsh-mc-btnPrimary', disabled: busy,
                  onClick: () => { fetchAvailable(provider.id) },
                }, busy ? t('fetching') : t('fetchAvailable')),
                h('button', {
                  type: 'button', className: 'dsh-mc-btn', disabled: busy,
                  onClick: () => { fetchAvailable(provider.id) },
                }, t('syncModels')),
                h('button', {
                  type: 'button', className: 'dsh-mc-btn',
                  onClick: () => { toggleEditing(provider, editingThis) },
                }, t('editChannel')),
              ),
              h('div', { className: 'dsh-mc-hint' }, t('fetchHint')),
            ),

            // The channel's own config fields (self-built: name/endpoint/api/key;
            // built-in: namespace/endpoint/thinking/effort/key).
            isConfig && editingThis && h('div', { className: 'dsh-mc-form' },
              h('label', { className: 'dsh-mc-field' }, t('fieldDisplayName'),
                h('input', {
                  className: 'dsh-mc-input', type: 'text', value: editing.displayName ?? '',
                  onChange: (event) => { setEditing({ ...editing, displayName: event.target.value }) },
                })),
              h('label', { className: 'dsh-mc-field' }, t('fieldBaseURL'),
                h('input', {
                  className: 'dsh-mc-input', type: 'text', value: editing.baseURL ?? '',
                  onChange: (event) => { setEditing({ ...editing, baseURL: event.target.value }) },
                })),
              h('label', { className: 'dsh-mc-field' }, t('fieldApi'),
                h('select', {
                  className: 'dsh-mc-input', value: editing.api ?? 'openai-completions',
                  onChange: (event) => { setEditing({ ...editing, api: event.target.value }) },
                },
                  ['openai-completions', 'openai-responses', 'anthropic-messages'].map((api) =>
                    h('option', { key: api, value: api }, api)))),
              h('label', { className: 'dsh-mc-field' }, t('fieldApiKey'),
                h('input', {
                  className: 'dsh-mc-input', type: 'password', value: editing.apiKey ?? '',
                  placeholder: provider.credential?.configured === true ? t('keyKeepPlaceholder') : 'sk-…',
                  autoComplete: 'off',
                  onChange: (event) => { setEditing({ ...editing, apiKey: event.target.value }) },
                })),
              h('label', { className: 'dsh-mc-field' }, t('fieldApiKeyEnv'),
                h('input', {
                  className: 'dsh-mc-input', type: 'text', value: editing.apiKeyEnv ?? '',
                  placeholder: 'MY_PROVIDER_API_KEY',
                  onChange: (event) => { setEditing({ ...editing, apiKeyEnv: event.target.value }) },
                })),
              h('div', { className: 'dsh-mc-hint' }, t('keyHint')),
              h('div', { className: 'dsh-mc-actions' },
                h('button', {
                  type: 'button', className: 'dsh-mc-btn dsh-mc-btnPrimary',
                  onClick: () => { saveChannel(provider.id) },
                }, t('save')),
                h('button', { type: 'button', className: 'dsh-mc-btn', onClick: () => { setEditing(null) } }, t('cancel')),
              ),
            ),

            !isConfig && editingEntry === provider.id && h('div', { className: 'dsh-mc-form' },
              h('label', { className: 'dsh-mc-field' }, t('fieldNs'),
                h('input', {
                  className: 'dsh-mc-input', type: 'text',
                  value: editingEntryNs ?? provider.editable?.ns ?? '',
                  placeholder: 'llm-deepseek',
                  onChange: (event) => { setEditingEntryNs(event.target.value) },
                })),
              provider.editable?.available !== true && h('div', { className: 'dsh-mc-hint' }, t('entryNsHelp')),
              h('label', { className: 'dsh-mc-field' }, t('fieldBaseURL'),
                h('input', {
                  className: 'dsh-mc-input', type: 'text', value: editingEntryBaseURL ?? provider.editable?.baseURL ?? '',
                  placeholder: 'https://api.deepseek.com',
                  onChange: (event) => { setEditingEntryBaseURL(event.target.value) },
                })),
              h('label', { className: 'dsh-mc-field' }, t('fieldOfficialEffort'),
                h('select', {
                  className: 'dsh-mc-input', value: editingEntryEffort ?? provider.editable?.reasoningEffort ?? '',
                  onChange: (event) => { setEditingEntryEffort(event.target.value) },
                },
                  ['', ENTRY_CLEAR, 'off', 'low', 'high', 'max'].map((value) =>
                    h('option', { key: value || 'inherit', value }, entryOptionLabel(value))))),
              h('label', { className: 'dsh-mc-field' }, t('fieldOfficialThinking'),
                h('select', {
                  className: 'dsh-mc-input', value: editingEntryThinking ?? provider.editable?.thinking ?? '',
                  onChange: (event) => { setEditingEntryThinking(event.target.value) },
                },
                  ['', ENTRY_CLEAR, 'enabled', 'disabled'].map((value) =>
                    h('option', { key: value || 'inherit', value }, entryOptionLabel(value))))),
              provider.editable?.apiKeyEnv !== undefined
                ? h(Fragment, null,
                  h('label', { className: 'dsh-mc-field' }, t('fieldApiKey'),
                    h('input', {
                      className: 'dsh-mc-input', type: 'password', value: entryKey,
                      placeholder: provider.editable?.credential?.configured === true ? t('keyKeepPlaceholder') : 'sk-…',
                      autoComplete: 'off',
                      onChange: (event) => { setEntryKey(event.target.value) },
                    })),
                  h('div', { className: 'dsh-mc-hint' }, t('entryKeyHint') + ' (' + provider.editable.apiKeyEnv + ')'),
                )
                : h('div', { className: 'dsh-mc-hint' }, t('entryNoKeyField')),
              h('div', { className: 'dsh-mc-actions' },
                h('button', {
                  type: 'button', className: 'dsh-mc-btn dsh-mc-btnPrimary',
                  onClick: () => {
                    const pick = (value) => {
                      if (value === null || value === undefined || value === '') return undefined
                      return value === ENTRY_CLEAR ? null : value
                    }
                    const effort = pick(editingEntryEffort)
                    const thinking = pick(editingEntryThinking)
                    saveEntry(provider.id, {
                      ...(editingEntryBaseURL !== null && editingEntryBaseURL !== undefined && editingEntryBaseURL !== '' ? { baseURL: editingEntryBaseURL } : {}),
                      ...(effort === undefined ? {} : { reasoningEffort: effort }),
                      ...(thinking === undefined ? {} : { thinking }),
                    }, entryKey, editingEntryNs ?? provider.editable?.ns)
                  },
                }, t('save')),
                h('button', { type: 'button', className: 'dsh-mc-btn', onClick: () => { setEditingEntry(null) } }, t('cancel')),
              ),
            ),

            // ── Model list ──
            // ── Models already in this channel ──
            // These render from what the channel HOLDS (`/effort` for a
            // self-built channel, the adapter's list for a built-in one), so
            // opening this sheet never re-fetches from the endpoint. Fetching is
            // a separate, explicit action that only fills the candidate panel
            // below — a channel's model list must not depend on the network
            // being up just to be looked at.
            h('div', { className: 'dsh-mc-modelListHead' },
              h('span', { className: 'dsh-mc-rowMeta' },
                t('modelsLabel') + ' · ' + (isConfig ? (effortRowsForOpen?.length ?? provider.modelCount) : provider.modelCount)),
            ),

            isConfig
              ? (effortRowsForOpen === undefined
                ? h('div', { className: 'dsh-mc-hint' }, t('loading'))
                : effortRowsForOpen.length === 0
                  ? h('div', { className: 'dsh-mc-hint' }, t('noModelsYet'))
                  : h('div', { className: 'dsh-mc-list' },
                    effortRowsForOpen.map((row) => h('div', { key: row.id, className: 'dsh-mc-modelRow' },
                      h('div', { className: 'dsh-mc-modelRowMain' },
                        h('span', { className: 'dsh-mc-modelName' }, row.name ?? row.id),
                        h('span', { className: 'dsh-mc-modelSub' }, modelSubtitle(row)),
                      ),
                      h('button', {
                        type: 'button', className: 'dsh-mc-btn',
                        onClick: () => { openModelSheetForRow(provider, row) },
                      }, t('settings')),
                    )),
                  ))
              : ((provider.models ?? []).length === 0
                ? h('div', { className: 'dsh-mc-hint' }, t('modelsHint'))
                : h('div', { className: 'dsh-mc-list' },
                  (provider.models ?? []).map((model) => h('div', {
                    key: model.id,
                    className: 'dsh-mc-modelRow' + (model.hidden === true ? ' dsh-mc-modelRowHidden' : ''),
                  },
                    h('div', { className: 'dsh-mc-modelRowMain' },
                      h('span', { className: 'dsh-mc-modelName' }, model.name ?? model.id),
                      h('span', { className: 'dsh-mc-modelSub' }, modelSubtitle(model)),
                    ),
                    model.editable === true && h('button', {
                      type: 'button', className: 'dsh-mc-btn',
                      onClick: () => { openModelSheet(provider, model) },
                    }, t('settings')),
                  )),
                )),

            // ── Candidate panel: only after the user asks for a fetch ──
            isConfig && draft !== undefined && h('div', { className: 'dsh-mc-panel' },
              h('div', { className: 'dsh-mc-effortHead' },
                h('span', { className: 'dsh-mc-rowMeta' },
                  tf('candidatesLabel', draft.available.length) + ' · ' + tf('selectedCount', draft.selected.size, draft.available.length)),
                h('button', {
                  type: 'button', className: 'dsh-mc-btn',
                  onClick: () => { setDrafts((current) => { const next = { ...current }; delete next[provider.id]; return next }) },
                }, t('collapse')),
              ),
              h('div', { className: 'dsh-mc-list' },
                draft.available.map((model) => h('label', { key: model.id, className: 'dsh-mc-row' },
                  h('input', {
                    type: 'checkbox',
                    checked: draft.selected.has(model.id),
                    disabled: busy,
                    onChange: () => { toggle(provider.id, model.id) },
                  }),
                  h('span', { className: 'dsh-mc-rowLabel' }, model.name ?? model.id),
                  h('span', { className: 'dsh-mc-rowMeta' }, modelSubtitle(model)),
                )),
              ),
              h('div', { className: 'dsh-mc-actions' },
                h('button', {
                  type: 'button', className: 'dsh-mc-btn', disabled: busy,
                  onClick: () => { setAll(provider.id, true) },
                }, t('selectAll')),
                h('button', {
                  type: 'button', className: 'dsh-mc-btn', disabled: busy,
                  onClick: () => { setAll(provider.id, false) },
                }, t('selectNone')),
                h('button', {
                  type: 'button', className: 'dsh-mc-btn dsh-mc-btnPrimary', disabled: busy,
                  onClick: () => { save(provider.id) },
                }, busy ? t('saving') : t('saveSelection')),
              ),
            ),
          ),
          h('div', { className: 'dsh-mc-sheetFoot' },
            h('button', {
              type: 'button', className: 'dsh-mc-btn', disabled: busy,
              title: t('applyAdviceHint'),
              onClick: () => { declare(provider.id) },
            }, t('applyAdvice')),
            h('button', {
              type: 'button', className: 'dsh-mc-btn',
              onClick: () => { toggleHidden(provider) },
            }, provider.hidden ? t('channelShow') : t('channelHide')),
            h('span', { style: { flex: 1 } }),
            isConfig && h('button', {
              type: 'button', className: 'dsh-mc-btn dsh-mc-menuDanger',
              onClick: () => { closeSheets(); removeChannel(provider.id) },
            }, t('remove')),
            h('button', { type: 'button', className: 'dsh-mc-btn', onClick: closeSheets }, t('cancel')),
          ),
        ),
      )
    })()

    // ── Layer 2: ONE model's settings (effort ladder + capabilities) ──
    // Opened from the 设置 button on a model row, stacked over layer 1. Only the
    // model that was clicked is rendered: the sheet is about that model, and
    // showing the whole channel again here would just repeat layer 1.
    const modelSheetRow = (openProvider !== undefined && effortRowsForOpen !== undefined && modelSheetKey !== null)
      ? effortRowsForOpen.find((row) => row.id === modelSheetKey || String(row.name ?? row.id) === modelSheetKey)
      : undefined

    const modelSheet = openProvider !== undefined && modelSheetRow !== undefined
      ? h('div', {
        className: 'dsh-mc-scrim dsh-mc-scrimTop',
        onClick: (event) => { if (event.target === event.currentTarget) { setEffortOpen(null); setModelSheetKey(null) } },
      },
        h('div', { className: 'dsh-mc-sheet dsh-mc-sheetTop', role: 'dialog', 'aria-modal': 'true' },
          h('div', { className: 'dsh-mc-sheetHead' },
            h('span', { className: 'dsh-mc-sheetTitle' }, modelSheetRow.name ?? modelSheetRow.id),
            h('span', { className: 'dsh-mc-badge' }, openProvider.displayName),
            h('button', {
              type: 'button', className: 'dsh-mc-close',
              onClick: () => { setEffortOpen(null); setModelSheetKey(null) },
              title: t('cancel'),
            }, '×'),
          ),
          h('div', { className: 'dsh-mc-sheetBody' },
            [modelSheetRow].map((row) => {
              const key = openChannelId + '/' + row.id
              const rowDraft = effortDraft[key]
              const levels = Array.isArray(effortLevels[openChannelId]) && effortLevels[openChannelId].length > 0
                ? effortLevels[openChannelId]
                : ['low', 'medium', 'high', 'xhigh', 'max']
              const declaredLevels = row.declared === false
                ? []
                : (row.declared === undefined || row.declared === null ? [] : Object.keys(row.declared))
              return h('div', { key: key, className: 'dsh-mc-effortRow' },
                h('div', { className: 'dsh-mc-effortHead' },
                  h('span', { className: 'dsh-mc-rowMeta' },
                    declaredLevels.length > 0
                      ? t('declaredLabel') + ': ' + declaredLevels.join('/')
                      : (row.declared === false ? t('declaredNone') : t('declaredEmpty'))),
                  row.suggested !== undefined && h('span', { className: 'dsh-mc-rowMeta' },
                    t('suggestedLabel') + ': ' + (row.suggested.source ?? '')),
                ),
                h('div', { className: 'dsh-mc-levels' },
                  levels.map((level) => h('div', { key: level, className: 'dsh-mc-level' },
                    h('label', { className: 'dsh-mc-levelTick' },
                      h('input', {
                        type: 'checkbox',
                        checked: rowDraft?.levels?.has(level) === true,
                        onChange: () => { toggleLevel(key, level) },
                      }),
                      h('span', null, level),
                    ),
                    h('input', {
                      className: 'dsh-mc-input dsh-mc-wire',
                      type: 'text',
                      value: rowDraft?.wire?.[level] ?? level,
                      placeholder: level,
                      onChange: (event) => { setWire(key, level, event.target.value) },
                    }),
                  )),
                ),
                h('div', { className: 'dsh-mc-actions' },
                  h('label', { className: 'dsh-mc-levelTick' },
                    h('input', {
                      type: 'checkbox',
                      checked: rowDraft?.adaptive === true,
                      onChange: () => { toggleAdaptive(key) },
                    }),
                    h('span', null, t('adaptive')),
                  ),
                  h('span', { className: 'dsh-mc-rowMeta' }, t('adaptiveHint')),
                  rowDraft?.off !== undefined && h('span', { className: 'dsh-mc-rowMeta' }, t('offKept')),
                  h('button', {
                    type: 'button', className: 'dsh-mc-btn',
                    onClick: () => {
                      setEffortDraft((current) => ({
                        ...current,
                        [key]: { ...(current[key] ?? {}), levels: new Set(), noReasoning: true, declared: row.declared },
                      }))
                    },
                  }, t('noReasoning')),
                  h('button', {
                    type: 'button', className: 'dsh-mc-btn dsh-mc-btnPrimary',
                    onClick: () => { saveEffort(openChannelId, row) },
                  }, t('save')),
                ),
                (() => {
                  const ability = abilityDraft[key]
                  if (ability === undefined) return null
                  return h('div', { className: 'dsh-mc-ability' },
                    h('div', { className: 'dsh-mc-effortHead' },
                      h('span', { className: 'dsh-mc-rowMeta' }, t('abilityTitle'))),
                    h('div', { className: 'dsh-mc-actions' },
                      h('label', { className: 'dsh-mc-levelTick' },
                        h('input', { type: 'checkbox', checked: ability.input.has('text'), disabled: true }),
                        h('span', null, t('abilityText')),
                      ),
                      h('label', { className: 'dsh-mc-levelTick' },
                        h('input', {
                          type: 'checkbox',
                          checked: ability.input.has('image'),
                          onChange: () => { toggleInput(key, 'image') },
                        }),
                        h('span', null, t('abilityImage')),
                      ),
                      ability.suggestedInput.length > 0 && h('span', { className: 'dsh-mc-rowMeta' },
                        t('abilitySuggested') + ': ' + ability.suggestedInput.join('/')),
                    ),
                    h('div', { className: 'dsh-mc-actions' },
                      h('label', { className: 'dsh-mc-abilityField' },
                        h('span', { className: 'dsh-mc-rowMeta' }, t('abilityContext')),
                        h('input', {
                          className: 'dsh-mc-input dsh-mc-wire', type: 'text',
                          value: ability.contextWindow, placeholder: '262144',
                          onChange: (event) => { setAbilityField(key, 'contextWindow', event.target.value) },
                        }),
                      ),
                      h('label', { className: 'dsh-mc-abilityField' },
                        h('span', { className: 'dsh-mc-rowMeta' }, t('abilityMaxTokens')),
                        h('input', {
                          className: 'dsh-mc-input dsh-mc-wire', type: 'text',
                          value: ability.maxTokens, placeholder: '32768',
                          onChange: (event) => { setAbilityField(key, 'maxTokens', event.target.value) },
                        }),
                      ),
                      h('button', {
                        type: 'button', className: 'dsh-mc-btn',
                        onClick: () => { saveAbility(openChannelId, row) },
                      }, t('abilitySave')),
                    ),
                    h('div', { className: 'dsh-mc-rowMeta' }, t('abilityToolsNote')),
                  )
                })(),
              )
            }),
          ),
        ),
      )
      : null

    const rows = providers === null
      ? (error === null
        ? h('div', { className: 'dsh-mc-notice' }, t('loading'))
        : h('div', { className: 'dsh-mc-notice' }, hostStale ? t('hostStale') : ''))
      : providers.length === 0
        ? h('div', { className: 'dsh-mc-notice' }, t('noProviders'))
        : h('div', { className: 'dsh-mc-listRows' }, channelList)
    return h('div', { className: 'dsh-mc-page' },
      h('div', { className: 'dsh-mc-head' },
        h('span', { className: 'dsh-mc-title' }, t('pageTitle')),
        h('div', { className: 'dsh-mc-actions' },
          h('button', { type: 'button', className: 'dsh-mc-btn dsh-mc-btnPrimary', onClick: () => { closeSheets(); setAddOpen(!addOpen) } }, t('addChannel')),
          h('button', {
            type: 'button', className: 'dsh-mc-btn', disabled: busyId === '*',
            title: t('applyAdviceHint'),
            onClick: () => { declare(undefined) },
          }, t('applyAdviceAll')),
          h('button', { type: 'button', className: 'dsh-mc-btn', onClick: () => { void loadProviders() } }, t('refresh')),
          h('button', { type: 'button', className: 'dsh-mc-btn', onClick: loadStatus }, t('diagnose')),
        ),
      ),

      // ── Takeover switch ──
      // The escape hatch that keeps the official page reachable: with takeover
      // off this plugin registers beside the official page instead of replacing
      // it, so a broken page here can never lock the user out of model
      // management. A refresh applies the new registration.
      h('label', { className: 'dsh-mc-switch' },
        h('input', {
          type: 'checkbox',
          checked: takeover === true,
          onChange: () => { toggleTakeover() },
        }),
        h('span', null, t('takeoverLabel')),
        h('span', { className: 'dsh-mc-rowMeta' }, takeover === true ? t('takeoverOnHint') : t('takeoverOffHint')),
      ),

      // ── Add-channel form ──
      addOpen && h('div', { className: 'dsh-mc-card' },
        h('div', { className: 'dsh-mc-cardHead' }, h('span', { className: 'dsh-mc-name' }, t('addChannel'))),
        h('div', { className: 'dsh-mc-form' },
          h('label', { className: 'dsh-mc-field' }, t('fieldId'),
            h('input', {
              className: 'dsh-mc-input', type: 'text', value: draft.id, placeholder: 'my-gateway',
              onChange: (event) => { setDraft({ ...draft, id: event.target.value }) },
            })),
          h('label', { className: 'dsh-mc-field' }, t('fieldDisplayName'),
            h('input', {
              className: 'dsh-mc-input', type: 'text', value: draft.displayName,
              onChange: (event) => { setDraft({ ...draft, displayName: event.target.value }) },
            })),
          h('label', { className: 'dsh-mc-field' }, t('fieldApi'),
            h('select', {
              className: 'dsh-mc-input', value: draft.api,
              onChange: (event) => { setDraft({ ...draft, api: event.target.value }) },
            }, ['openai-completions', 'openai-responses', 'anthropic-messages'].map((api) =>
              h('option', { key: api, value: api }, api)))),
          h('label', { className: 'dsh-mc-field' }, t('fieldBaseURL'),
            h('input', {
              className: 'dsh-mc-input', type: 'text', value: draft.baseURL, placeholder: 'https://api.example.com/v1',
              onChange: (event) => { setDraft({ ...draft, baseURL: event.target.value }) },
            })),
          // The key is typed in plaintext. It is stored through the credential
          // service, so the config keeps only a variable NAME — the same split
          // the official page uses, and no secret lands in the config file.
          h('label', { className: 'dsh-mc-field' }, t('fieldApiKey'),
            h('input', {
              className: 'dsh-mc-input', type: 'password', value: draft.apiKey, placeholder: 'sk-…',
              autoComplete: 'off',
              onChange: (event) => { setDraft({ ...draft, apiKey: event.target.value }) },
            })),
          h('label', { className: 'dsh-mc-field' }, t('fieldApiKeyEnv'),
            h('input', {
              className: 'dsh-mc-input', type: 'text', value: draft.apiKeyEnv, placeholder: t('keyNameAuto'),
              onChange: (event) => { setDraft({ ...draft, apiKeyEnv: event.target.value }) },
            })),
          h('div', { className: 'dsh-mc-hint' }, t('apiKeyEnvHint')),

          // ── Step 2: test, then fetch, then pick ──
          // Order matters: pi-ai refuses a provider with an empty models array,
          // so the models have to be chosen BEFORE the channel is written. That
          // makes "probe → fetch → pick" the only workable sequence, and it is
          // also the friendlier one — a bad key surfaces as a connection error
          // here, not as a schema error after the fact.
          h('div', { className: 'dsh-mc-actions' },
            h('button', {
              type: 'button', className: 'dsh-mc-btn', disabled: busyId === '*',
              onClick: probeDraft,
            }, busyId === '*' ? t('probing') : t('probe')),
            h('button', {
              type: 'button', className: 'dsh-mc-btn', disabled: busyId === '*',
              onClick: fetchDraftModels,
            }, busyId === '*' ? t('fetching') : t('fetchModelsHere')),
          ),
          probeResult !== null && h('div', {
            className: 'dsh-mc-hint' + (probeResult.reachable ? ' dsh-mc-okText' : ''),
          }, probeResult.reachable
            ? tf('probeReachable', probeResult.modelCount)
            : t('probeFailed')),

          draftPicked.available !== null && h('div', { className: 'dsh-mc-panel' },
            h('div', { className: 'dsh-mc-effortHead' },
              h('span', { className: 'dsh-mc-rowMeta' },
                tf('candidatesLabel', draftPicked.available.length) + ' · '
                  + tf('selectedCount', draftPicked.selected.size, draftPicked.available.length)),
              draftPicked.available.length > 0 && h('button', {
                type: 'button', className: 'dsh-mc-btn',
                onClick: () => { setDraftPicked({ available: draftPicked.available, selected: new Set(draftPicked.available.map((m) => m.id)) }) },
              }, t('selectAll')),
              draftPicked.available.length > 0 && h('button', {
                type: 'button', className: 'dsh-mc-btn',
                onClick: () => { setDraftPicked({ available: draftPicked.available, selected: new Set() }) },
              }, t('selectNone')),
            ),
            draftPicked.available.length === 0
              ? h('div', { className: 'dsh-mc-hint' }, t('probeOkNoModels'))
              : h('div', { className: 'dsh-mc-list' },
                draftPicked.available.map((model) => h('label', { key: model.id, className: 'dsh-mc-row' },
                  h('input', {
                    type: 'checkbox',
                    checked: draftPicked.selected.has(model.id),
                    onChange: () => {
                      setDraftPicked((current) => {
                        const selected = new Set(current.selected)
                        if (!selected.delete(model.id)) selected.add(model.id)
                        return { ...current, selected }
                      })
                    },
                  }),
                  h('span', { className: 'dsh-mc-rowLabel' }, model.name ?? model.id),
                  h('span', { className: 'dsh-mc-rowMeta' }, modelSubtitle(model)),
                )),
              ),
          ),

          h('div', { className: 'dsh-mc-hint' }, t('createNeedsModels')),
          h('div', { className: 'dsh-mc-actions' },
            h('button', {
              type: 'button', className: 'dsh-mc-btn dsh-mc-btnPrimary',
              disabled: busyId === '*' || draftPicked.selected.size === 0,
              onClick: addChannel,
            }, t('create')),
            h('button', {
              type: 'button', className: 'dsh-mc-btn',
              onClick: () => {
                setAddOpen(false)
                setDraftPicked({ available: null, selected: new Set() })
                setProbeResult(null)
              },
            }, t('cancel')),
          ),
        ),
      ),

      h('div', { className: 'dsh-mc-hint' }, t('pageHint')),
      error !== null && h('div', { className: 'dsh-mc-error' }, error),
      notice !== null && h('div', { className: 'dsh-mc-notice' }, notice),
      showStatus && h('pre', { className: 'dsh-mc-status' },
        status === null ? t('loading') : JSON.stringify(status, null, 2)),

      // The page itself is only the channel list; every editor opens as an
      // overlay so the narrow settings sheet never has to hold two columns.
      rows,

      // Layer 1 then layer 2, in that DOM order so the stacked scrims layer up.
      channelSheet,
      modelSheet,
    )
  }

  // ─── Plugin registration ───
  // The seat is claimed only once the services it reads are live: an
  // unserviceable occupant would win the single seat and render nothing,
  // hiding the working picker underneath it.
  //
  // `remote` / `remote.session` are required by every face of
  // `modelDirectories`: a cordis service proxy rebinds `this.ctx` to the
  // caller, so `directoryFor()` / `load()` / `select()` read `remote.session`
  // through THIS plugin's inject set. Without them the seat entry throws
  // (`cannot get property "remote.session" without inject`), the shadowing
  // entry abdicates, and the enhanced picker never appears.
  const pluginInject = ['slots', 'sessions', 'modelDirectories', 'remote', 'remote.session']

  function apply(ctx) {
    // Inject CSS
    ctx.effect(() => {
      const id = 'dsh-model-control-style'
      if (!document.getElementById(id)) {
        const s = document.createElement('style')
        s.id = id
        s.textContent = CSS
        document.head.appendChild(s)
      }
      return () => { const el = document.getElementById(id); if (el) el.remove() }
    }, 'model-control-style')

    // Register into the composer model seat
    ctx.inject(['slots', 'modelDirectories'], (scope) => {
      const slots = scope.slots
      const models = scope.modelDirectories
      const sessions = scope.sessions
      slots.inject('conversation.input.model', () => slots.register({
        name: 'conversation.input.model',
        priority: -20,
        registrant: 'dsh-model-control',
        inject: (sessionId) => {
          const directory = models.directoryFor(sessionId)
          const available = sessions.subagentAddress(sessionId) === undefined
          return {
            available,
            directory: directory.store,
            load: () => { if (available) directory.load().catch(() => { /* surfaced on the store */ }) },
            select: (selection) => available
              ? directory.select(selection).then(() => true, () => false)
              : Promise.resolve(false),
          }
        },
      }, ModelPicker))
    })

    // Register the model page as a settings section.
    //
    // Two rules learned the hard way, both measured live:
    //
    //  1. Use an id of our OWN. Reusing the shipped `models` id does NOT
    //     replace that page — the registration is rejected as a duplicate and
    //     no occupant appears at all, which is how this page went missing.
    //     Takeover is done in the layer stack instead (the host disables the
    //     shipped `ui-settings-models` entry); see ROUTE_TAKEOVER.
    //
    //  2. Register directly on `ctx.slots`, synchronously, which is what the
    //     shipped sections do (`ctx.slots.inject("settings.section", …)` in
    //     dsh-client-ui-settings-models). A registration that waits on a fetch
    //     never lands.
    ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'model-control',
      order: 12,
      label: () => t('pageTitle'),
    }, SafeSection))
  }

  /**
   * Error boundary around the settings page: a thrown render inside a settings
   * section would otherwise blank the panel, leaving the user unable to manage
   * models at all.
   */
  class SafeSection extends React.Component {
    constructor(props) {
      super(props)
      this.state = { failure: null }
    }
    static getDerivedStateFromError(failure) {
      return { failure }
    }
    componentDidCatch(failure) {
      // A diagnosable line beats a silently blank page.
      try { console.error('[dsh-model-control] settings page failed:', failure) } catch { /* console may be gone */ }
    }
    render() {
      if (this.state.failure !== null) {
        return h('div', { className: 'dsh-mc-page' },
          h('div', { className: 'dsh-mc-title' }, t('pageTitle')),
          h('div', { className: 'dsh-mc-error' }, String(this.state.failure?.message ?? this.state.failure)),
        )
      }
      return h(ModelControlPage, this.props)
    }
  }

  module.exports = { inject: pluginInject, apply }
  return module.exports;
} })
