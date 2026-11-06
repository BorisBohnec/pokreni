/* PoKreni AI client: the same providers and order as Tanjur (Claude when there's a key and the shared monthly
   limit isn't reached, then free OpenRouter models, with Groq as a second free provider). Keys come from Tanjur.
   createAI(deps) → { text(prompt, opts), available(), source(), errCopy(e, t) }. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib; else root.PK_AI = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
  const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_MODEL = 'qwen/qwen3.8-27b';
  /* [id, label, USD per million input tokens, per million output tokens] — same table as Tanjur */
  const CLAUDE_MODELS = [['claude-haiku-4-5-20251001', 'Haiku 4.5', 1, 5], ['claude-sonnet-5-5', 'Sonnet 5.5', 2, 10]];
  const FALLBACK_MODELS = ['google/gemma-4-31b-it:free', 'openrouter/free', 'qwen/qwen3.8-27b:free'];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const shortModel = m => String(m || '').replace(/^[^/]+\//, '').replace(/:free$/, '');
  const stripThink = t => String(t || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '').trim();
  const month = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

  function createAI(deps) {
    /* deps: keys() → { claudeKey, claudeModel, claudeCap, orKey, groqKey, model } | null
             spent() → USD used this month by both apps; record(model, usage) stores PoKreni's own use
             http → CapacitorHttp plugin (native fallback when fetch is blocked) */
    const K = () => deps.keys() || {};
    const claudeKey = () => String(K().claudeKey || '').trim();
    const orKey = () => String(K().orKey || '').trim();
    const groqKey = () => String(K().groqKey || '').trim();
    const claudeModel = () => { const m = K().claudeModel; return CLAUDE_MODELS.some(x => x[0] === m) ? m : CLAUDE_MODELS[0][0]; };
    const cap = () => (K().claudeCap != null ? +K().claudeCap : 2);
    const claudeOk = () => !!claudeKey() && (!cap() || deps.spent() < cap());
    const available = () => !!claudeKey() || !!orKey() || !!groqKey();
    const source = () => (claudeOk() ? 'claude' : (orKey() || groqKey()) ? 'free' : claudeKey() ? 'capped' : 'none');

    async function post(url, headers, payload, signal, opts, readTimeout) {
      try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal });
        let body = null; try { body = await res.json(); } catch (e) { body = null; }
        return { status: res.status, body };
      } catch (e) {
        if (opts.signal && opts.signal.aborted) throw { code: 'cancelled' };
        if (signal.aborted) throw { code: 'timeout', label: 'took too long' };
        if (!deps.http || typeof deps.http.request !== 'function') throw { code: 'network', label: 'no connection' };
        try {
          const r = await deps.http.request({ url, method: 'POST', headers, data: payload, connectTimeout: 20000, readTimeout: readTimeout || 120000 });
          if (opts.signal && opts.signal.aborted) throw { code: 'cancelled' };
          return { status: r.status, body: typeof r.data === 'string' ? JSON.parse(r.data) : r.data };
        } catch (e2) { if (e2 && e2.code === 'cancelled') throw e2; throw { code: 'network', label: 'no connection' }; }
      }
    }
    async function claude(prompt, opts, signal) {
      const model = claudeModel();
      const payload = { model, max_tokens: opts.maxTokens || 1200, temperature: opts.temperature ?? 0.3, messages: [{ role: 'user', content: prompt }] };
      const headers = { 'x-api-key': claudeKey(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' };
      const { status, body } = await post(CLAUDE_URL, headers, payload, signal, opts);
      if (status >= 400 || !body || body.type === 'error') {
        const msg = String((body && body.error && body.error.message) || '');
        if (status === 401 || status === 403) throw { code: 'claude_key', label: 'API key rejected' };
        if (/credit balance|billing/i.test(msg) || status === 402) throw { code: 'claude_credits', label: 'out of API credit' };
        if (status === 429) throw { code: 'rate_limited', label: 'rate limited' };
        if (status >= 500) throw { code: 'upstream', label: status === 529 ? 'overloaded' : 'error ' + status };
        throw { code: 'model', label: `error ${status}${msg ? ' (' + msg.slice(0, 120) + ')' : ''}` };
      }
      const m = CLAUDE_MODELS.find(x => x[0] === model) || CLAUDE_MODELS[0];
      const i = +(body.usage && body.usage.input_tokens) || 0, o = +(body.usage && body.usage.output_tokens) || 0;
      deps.record({ month: month(), cost: i / 1e6 * m[2] + o / 1e6 * m[3], inTok: i, outTok: o });
      const text = (body.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      if (!text.trim()) throw { code: 'empty', label: 'empty answer' };
      return { text, via: 'Claude ' + m[1] };
    }
    function freeAttempts() {
      const chosen = String(K().model || '').trim() || 'openrouter/free';
      const chain = chosen === 'google/gemma-4-31b-it:free' ? [chosen, 'openrouter/free'] : Array.from(new Set((chosen === 'openrouter/free' ? [] : [chosen]).concat(FALLBACK_MODELS))).slice(0, 3);
      const or = orKey() ? chain.map((m, i) => ({ prov: 'or', model: m, retry429: i === 0 })) : [];
      const gq = groqKey() ? [{ prov: 'groq', model: GROQ_MODEL }] : [];
      return or.slice(0, 1).concat(gq, or.slice(1));
    }
    async function compat(at, prompt, opts, signal) {
      const groq = at.prov === 'groq';
      const url = groq ? GROQ_URL : OR_URL;
      const headers = groq ? { 'Authorization': 'Bearer ' + groqKey(), 'Content-Type': 'application/json' }
        : { 'Authorization': 'Bearer ' + orKey(), 'Content-Type': 'application/json', 'X-Title': 'PoKreni' };
      const payload = { model: at.model, messages: [{ role: 'user', content: prompt }], temperature: opts.temperature ?? 0.3, max_tokens: opts.maxTokens || 1500 };
      if (groq) payload.reasoning_effort = 'none'; else payload.reasoning = { effort: 'low', exclude: true };
      let res = await post(url, headers, payload, signal, opts, 150000);
      if (groq && res.status === 400 && payload.reasoning_effort) { delete payload.reasoning_effort; res = await post(url, headers, payload, signal, opts, 150000); }
      if (res.status === 429 && at.retry429) { await sleep(2500); if (opts.signal && opts.signal.aborted) throw { code: 'cancelled' }; res = await post(url, headers, payload, signal, opts, 150000); }
      const body = res.body, used = groq ? 'Groq ' + shortModel(at.model) : shortModel((body && body.model) || at.model);
      if (res.status >= 400 || !body || body.error) {
        const st = res.status >= 400 ? res.status : (+(body && body.error && body.error.code) || 500);
        const code = st === 401 ? (groq ? 'groq_key' : 'bad_key') : st === 402 ? 'credits' : st === 429 ? 'rate_limited' : st === 404 || st === 400 ? 'model' : 'upstream';
        throw { code, used, label: st === 429 ? 'busy or daily limit' : 'error ' + st };
      }
      const choice = body.choices && body.choices[0], m = choice && choice.message;
      const text = m && (Array.isArray(m.content) ? m.content.map(p => p.text || '').join('') : m.content);
      if (!text || !String(text).trim()) throw { code: 'empty', used, label: 'empty answer' };
      return { text, via: used };
    }
    /* Returns { text, via }. Throws { code, tried } when every provider failed. */
    async function text(prompt, opts = {}) {
      if (!available()) throw { code: 'no_key' };
      const ctl = new AbortController(); const tid = setTimeout(() => ctl.abort(), 170000);
      const onAbort = () => ctl.abort(); if (opts.signal) opts.signal.addEventListener('abort', onAbort);
      const tried = []; let lastErr = null;
      const clean = r => { const s = stripThink(r.text).replace(/^\s*(coach|trener|answer|odgovor)\s*:\s*/i, '').trim(); if (!s) throw { code: 'empty' }; return { text: s, via: r.via }; };
      try {
        if (claudeKey()) {
          if (!claudeOk()) tried.push(`Claude: monthly limit of $${cap()} reached`);
          else {
            try { return clean(await claude(prompt, opts, ctl.signal)); }
            catch (e) { if (e.code === 'cancelled' || e.code === 'timeout') throw Object.assign(e, { tried }); lastErr = e; tried.push(`Claude: ${e.label || e.code}`); }
          }
        }
        const bad = {};
        for (const at of freeAttempts()) {
          if (bad[at.prov]) continue;
          try { const out = clean(await compat(at, prompt, opts, ctl.signal)); if (lastErr) out.claudeErr = lastErr.code; return out; }
          catch (e) {
            if (e.code === 'cancelled' || e.code === 'timeout') throw Object.assign(e, { tried });
            lastErr = e; tried.push(`${e.used || at.model}: ${e.label || e.code}`);
            if (e.code === 'bad_key' || e.code === 'groq_key') bad[at.prov] = true;
          }
        }
        throw Object.assign(lastErr || { code: 'no_key' }, { tried });
      } finally {
        clearTimeout(tid);
        if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
      }
    }
    return { text, available, source, claudeOk, cap };
  }

  /* Short safety net that runs before any AI: symptoms that need 112 now, in English or Croatian. */
  const EMERGENCY = [
    /chest\s*(pain|pressure|tight)/i, /pain.{0,25}(left\s*)?(arm|jaw)/i, /(faint|passed out|black(ed)? out|collaps)/i, /can'?t\s*(breathe|catch my breath)/i, /dark (urine|pee)/i,
    /(bol|pritisak|stezanje|probadanje).{0,15}(u\s*)?prsima/i, /prsa.{0,15}(bol|stež|stisk|pritis)/i, /bol.{0,25}(ruk|čeljust|celjust)/i, /(nesvjest|onesvijest|onesvjest|kolaps|pao u nesvijest)/i,
    /(ne mogu|nemogu).{0,10}(disati|doći do zraka|doci do zraka)/i, /taman urin|tamni urin|tamna mokraća|tamna mokraca/i
  ];
  const isEmergency = q => EMERGENCY.some(r => r.test(String(q || '')));
  return { createAI, isEmergency, CLAUDE_MODELS };
});
