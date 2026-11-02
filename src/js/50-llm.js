/* 50-llm.js —— 直连大模型（OpenAI 兼容协议），密钥只存在本机浏览器 */
(function () {
  const MT = (window.MT = window.MT || {});
  const U = MT.util;

  const PRESETS = [
    {
      id: 'deepseek', name: 'DeepSeek（推荐）', base: 'https://api.deepseek.com', model: 'deepseek-flash',
      models: ['deepseek-flash', 'deepseek-v4-pro'],
      vision: 'deepseek-flash', visionModels: ['deepseek-flash'],
      note: '浏览器可直连，便宜、上下文长（1M），deepseek-flash 能看图；deepseek-v4-pro 不支持图片。'
    },
    {
      id: 'moonshot', name: 'Kimi 月之暗面', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-k2-0711-preview'],
      vision: 'moonshot-v1-8k-vision-preview', visionModels: ['moonshot-v1-8k-vision-preview', 'moonshot-v1-32k-vision-preview'],
      note: '浏览器可直连，长题友好，自带识图模型。'
    },
    {
      id: 'dashscope', name: '阿里通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus',
      models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
      vision: 'qwen-vl-max', visionModels: ['qwen-vl-max', 'qwen-vl-plus'],
      note: '浏览器可直连（阿里云百炼，兼容 OpenAI 协议），识图能力强。'
    },
    {
      id: 'siliconflow', name: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-72B-Instruct',
      models: ['Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1'],
      vision: 'Qwen/Qwen2.5-VL-72B-Instruct', visionModels: ['Qwen/Qwen2.5-VL-72B-Instruct', 'Qwen/Qwen2.5-VL-32B-Instruct'],
      note: '浏览器可直连，模型多，自带视觉模型。'
    },
    {
      id: 'openrouter', name: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'deepseek/deepseek-chat',
      models: ['deepseek/deepseek-chat', 'qwen/qwen-2.5-72b-instruct', 'anthropic/claude-3.5-sonnet'],
      vision: 'qwen/qwen-2.5-vl-72b-instruct', visionModels: ['qwen/qwen-2.5-vl-72b-instruct', 'google/gemini-2.0-flash-001'],
      note: '浏览器可直连，可访问多家模型（需要外网）。'
    },
    {
      id: 'custom', name: '自定义（OpenAI 兼容）', base: '', model: '',
      models: [], vision: '', visionModels: [],
      note: '任何兼容 /chat/completions 的服务，例如本地 Ollama：http://localhost:11434/v1'
    }
  ];

  const DEFAULTS = {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-flash',
    visionModel: '',
    apiKey: '',
    temperature: 0.2,
    jsonMode: true
  };

  /* 老模型名已经下线，旧配置读到就自动换到现行的名字 */
  const LEGACY_MODELS = {
    'deepseek-chat': 'deepseek-flash',
    'deepseek-reasoner': 'deepseek-flash',
    'deepseek-v4-flash': 'deepseek-flash',
    'deepseek-v4-flash-vision-exp': 'deepseek-flash'
  };

  function migrate(cfg) {
    if (cfg.provider === 'deepseek') {
      const m = LEGACY_MODELS[cfg.model];
      if (m) cfg.model = m;
      if (cfg.visionModel && LEGACY_MODELS[cfg.visionModel]) cfg.visionModel = LEGACY_MODELS[cfg.visionModel];
    }
    return cfg;
  }

  const LS_KEY = 'config';

  function getConfig() {
    const saved = U.store.get(LS_KEY, null);
    return migrate(Object.assign({}, DEFAULTS, saved || {}));
  }

  function saveConfig(cfg) {
    U.store.set(LS_KEY, {
      provider: cfg.provider,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      visionModel: cfg.visionModel || '',
      apiKey: cfg.apiKey,
      temperature: Number(cfg.temperature),
      jsonMode: !!cfg.jsonMode
    });
  }

  function clearKey() {
    const cfg = getConfig();
    cfg.apiKey = '';
    saveConfig(cfg);
    return cfg;
  }

  function isConfigured(cfg) {
    cfg = cfg || getConfig();
    return !!(cfg.apiKey && cfg.baseUrl && cfg.model);
  }

  function endpoint(baseUrl) {
    let b = String(baseUrl || '').trim().replace(/\/+$/, '');
    if (!b) throw new Error('还没有填写接口地址');
    if (b.endsWith('/chat/completions')) return b;
    return b + '/chat/completions';
  }

  /** 当前配置下用来"看图"的模型；空字符串表示看不了图 */
  function visionModelOf(cfg) {
    cfg = cfg || getConfig();
    if (cfg.visionModel) return cfg.visionModel;
    if (/deepseek-flash|vl|vision|glm-4v|-4o|claude-3|gemini|internvl|pixtral/i.test(cfg.model || '')) return cfg.model;
    return '';
  }

  function describeError(err, status, body) {
    const detail = (body && (body.error && (body.error.message || body.error.code) || body.message)) || '';
    if (status === 401) return 'API Key 不对或已失效（401）。请到设置里重新粘贴。';
    if (status === 402) return '账户余额不足（402）。';
    if (status === 403) return '这个 Key 没有权限，或所在地区被限制（403）。' + detail;
    if (status === 404) return '接口地址或模型名不对（404）——检查 Base URL 是否要带 /v1。' + detail;
    if (status === 429) return '请求太频繁或超出额度（429），等一会儿再试。';
    if (status >= 500) return '服务商暂时出问题（' + status + '），稍后重试。';
    if (err && /Failed to fetch|NetworkError|load failed/i.test(err.message || '')) {
      return '连不上服务商：可能是网络问题，或该服务商不允许浏览器直接调用（CORS）。可换 DeepSeek / Kimi / 通义 / 硅基流动。';
    }
    if (err && err.name === 'AbortError') return '请求超时了（120 秒），题目可能太长，或网络太慢。';
    return detail || (err && err.message) || '调用失败';
  }

  /**
   * 发一次对话请求
   * @returns {Promise<string>} 模型返回的文本
   */
  async function chat(messages, opts) {
    opts = opts || {};
    const cfg = Object.assign({}, getConfig(), opts.config || {});
    if (!cfg.apiKey) throw new Error('还没有配置 API Key，点右上角「设置」填一下。');
    const url = endpoint(cfg.baseUrl);

    const body = {
      model: cfg.model,
      messages,
      temperature: Number(cfg.temperature) >= 0 ? Number(cfg.temperature) : 0.2,
      stream: false
    };
    if (cfg.jsonMode && opts.json !== false) body.response_format = { type: 'json_object' };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout || 120000);

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + cfg.apiKey
        },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
    } catch (e) {
      clearTimeout(timer);
      throw new Error(describeError(e));
    }
    clearTimeout(timer);

    let data = null;
    const raw = await res.text();
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { /* 保留 raw */ }

    if (!res.ok) {
      // 有些服务商不认 response_format，去掉再试一次
      if (body.response_format && /response_format|json_object|unsupported/i.test(raw)) {
        return chat(messages, Object.assign({}, opts, { config: Object.assign({}, cfg, { jsonMode: false }) }));
      }
      throw new Error(describeError(null, res.status, data));
    }

    const content = data && data.choices && data.choices[0] &&
      (data.choices[0].message && data.choices[0].message.content);
    if (!content) {
      if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.reasoning_content) {
        return data.choices[0].message.reasoning_content;
      }
      throw new Error('模型没有返回内容（可能被内容策略拦截），换个模型或换个问法。');
    }
    return content;
  }

  /** 连通性测试：发一句极短的话 */
  async function test(cfg) {
    const t0 = performance.now();
    const text = await chat(
      [{ role: 'user', content: '只回复两个字：可以' }],
      { config: Object.assign({}, cfg, { jsonMode: false }), timeout: 30000 }
    );
    return { ok: true, ms: Math.round(performance.now() - t0), text: String(text).slice(0, 40) };
  }

  MT.llm = { PRESETS, DEFAULTS, getConfig, saveConfig, clearKey, isConfigured, chat, test, endpoint, visionModelOf, migrate };
})();
