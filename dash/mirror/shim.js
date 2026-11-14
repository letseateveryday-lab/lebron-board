/* File/GitHub mirror shim (Chill t341u/t342u). Loaded first in every mirrored page.
   Local: reads /workspace/dash/mirror/d/*.js written by dash_backend.py.
   GitHub: reads mirror_files from the private wormhole snapshot (parent or token fetch).
   Chat sends -> local download bridge or GitHub inbox. Approvals/uploads/other writes refused.
   No injected top bar — the all-bots shell owns navigation so each page looks like the original. */
(function(){
const IS_GH = /github\.io$/.test(location.hostname) || /github\.com$/.test(location.hostname);
const ROOT = IS_GH ? null : 'file:///workspace/dash/mirror/d/';
window.__M = window.__M || {};
const safe = k => k.replace(/[^A-Za-z0-9._-]/g, '_');
let ghReady = null;

function loadScript(key){
  return new Promise(res => {
    const s = document.createElement('script');
    s.src = ROOT + safe(key) + '.js?t=' + Date.now();
    s.onload = () => { s.remove(); res(window.__M[key] || null); };
    s.onerror = () => { s.remove(); res(null); };
    (document.head || document.documentElement).appendChild(s);
  });
}

async function ensureGh(){
  if (window.__M_READY) return;
  if (window.parent && window.parent !== window && window.parent.__DASH_MIRROR) {
    Object.assign(window.__M, window.parent.__DASH_MIRROR);
    window.__M_READY = true;
    return;
  }
  if (ghReady) return ghReady;
  ghReady = (async () => {
    try {
      const tok = localStorage.getItem('dash_gh_token') || '';
      if (!tok) return;
      const url = 'https://api.github.com/repos/letseateveryday-lab/manifest-wormhole/contents/dash-sync/data.json?ref=dash-sync-data';
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github.raw' } });
      if (!r.ok) return;
      const d = await r.json();
      const files = (d && d.mirror_files) || {};
      for (const [k, v] of Object.entries(files)) {
        window.__M[k] = typeof v === 'object' && v && 'body' in v ? v : { ts: Date.now()/1000, ct: 'application/json', body: typeof v === 'string' ? v : JSON.stringify(v) };
      }
      if (d && d.gen_ts) window.__M['_hb'] = { ts: d.gen_ts, body: String(d.gen_ts), ct: 'text/plain' };
      window.__M_READY = true;
    } catch (e) {}
  })();
  return ghReady;
}

async function load(key){
  if (IS_GH) { await ensureGh(); return window.__M[key] || null; }
  return loadScript(key);
}

const J = (o, st) => new Response(typeof o === 'string' ? o : JSON.stringify(o), { status: st || 200, headers: { 'Content-Type': 'application/json' } });

async function bridgeLocal(target, text){
  const t = await load('_token');
  if (!t || !t.body) throw new Error('bridge token unavailable');
  const ts = Date.now(), body = JSON.stringify({ target, text, token: t.body, ts });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  a.download = 'dashmsg-' + target + '-' + ts + '.json';
  document.body.appendChild(a); a.click(); a.remove();
}

async function bridgeGh(target, text){
  const tok = localStorage.getItem('dash_gh_token') || '';
  if (!tok) throw new Error('GitHub token missing — unlock the backup dashboard first');
  if (window.parent && window.parent !== window && typeof window.parent.__dashGhSend === 'function') {
    return window.parent.__dashGhSend(target, text);
  }
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 16);
  const name = Date.now() + '-' + target + '-' + nonce + '.json';
  const content = btoa(unescape(encodeURIComponent(JSON.stringify({ target, text, nonce, ts: Date.now() }))));
  const r = await fetch('https://api.github.com/repos/letseateveryday-lab/manifest-wormhole/contents/dash-sync/inbox/' + name, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'chat ' + target, content, branch: 'dash-sync' })
  });
  if (!r.ok) throw new Error('GitHub inbox write failed: ' + r.status);
}

async function bridge(target, text){
  if (IS_GH) return bridgeGh(target, text);
  return bridgeLocal(target, text);
}
window.__dashBridge = bridge;

const AG = { neoshua: 'neoshua_local', neoshua_local: 'neoshua_local', ape: 'ape', apotheosis: 'apotheosis', apothua: 'apothua' };
const NO = "Not available in the file mirror (safety): approvals, uploads and other writes stay in Apothua's own chat tab or terminal.";
const realFetch = window.fetch ? window.fetch.bind(window) : null;

window.fetch = async function(u, opt){
  let s = String((u && u.url) || u);
  s = s.replace(/^https?:\/\/127\.0\.0\.1:\d+/, '')
       .replace(/^https?:\/\/localhost:\d+/, '')
       .replace(/^https?:\/\/[^/]+/, '')
       .replace(/^file:\/\/\/workspace\//, '')
       .replace(/^dash\/mirror\//, '')
       .replace(/^\.?\//, '');
  // absolute /api or /data from file pages
  if (s.startsWith('/')) s = s.slice(1);
  const [path, qs] = s.split('?');
  const q = new URLSearchParams(qs || '');
  const m = ((opt && opt.method) || 'GET').toUpperCase();

  if (m !== 'GET') {
    if (path === 'api/send' || path === 'api/agent/send') {
      let b = opt && opt.body, text = '', agent = path === 'api/send' ? 'apothua' : '';
      try {
        if (b instanceof FormData) { text = String(b.get('text') || b.get('msg') || ''); }
        else { const o = JSON.parse(b || '{}'); text = String(o.text || o.msg || ''); agent = agent || String(o.agent || '').toLowerCase(); }
      } catch (e) {}
      text = text.trim();
      const tg = AG[agent];
      if (!tg || !text) return J({ ok: false, error: 'empty or unknown agent' }, 400);
      if (/^\s*(approve|reject)\b/i.test(text)) return J({ ok: false, error: "Approvals can't be sent from the file mirror. Use Apothua's own chat tab or terminal." }, 403);
      if (text.length > 2000) return J({ ok: false, error: 'max 2000 characters' }, 413);
      try { await bridge(tg, text); return J({ ok: true, busy: true, via: IS_GH ? 'github-bridge' : 'file-bridge' }); }
      catch (e) { return J({ ok: false, error: String(e) }, 503); }
    }
    if (path === 'send' || path === 'api/approve' || path === 'api/upload') {
      return J({ ok: false, error: NO }, 403);
    }
    return J({ ok: false, error: NO }, 403);
  }

  let key = path;
  if (path === 'api/agent/history') key += '__' + (AG[(q.get('agent') || '').toLowerCase()] || q.get('agent'));
  if (path === 'msgs') key = 'msgs';

  const d = await load(key);
  if (!d) {
    if (realFetch && !/^api\//.test(path) && !/^data\//.test(path) && path !== 'msgs') {
      try { return await realFetch(u, opt); } catch (e) {}
    }
    return J({ ok: false, error: 'unavailable in file mirror: ' + path }, 503);
  }
  if (path === 'api/creations') {
    try {
      const o = JSON.parse(d.body), st = q.get('status'), ty = q.get('type'), qq = (q.get('q') || '').toLowerCase();
      o.items = (o.items || []).filter(i => (!st || i.status === st) && (!ty || i.type === ty) && (!qq || JSON.stringify(i).toLowerCase().includes(qq)));
      o.matched = o.items.length; return J(o);
    } catch (e) {}
  }
  return new Response(d.body, { status: 200, headers: { 'Content-Type': d.ct || 'application/json' } });
};

// small age badge only (no nav chrome)
function badge(){
  let el = document.getElementById('__dash_badge');
  if (!el) {
    el = document.createElement('div'); el.id = '__dash_badge';
    el.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:2147483647;font:11px/1.2 system-ui,sans-serif;padding:5px 9px;border-radius:12px;color:#041021;box-shadow:0 2px 8px #0008;cursor:default;opacity:.92';
    (document.body || document.documentElement).appendChild(el);
  }
  load('_hb').then(h => {
    const a = h ? Math.round(Date.now()/1000 - (typeof h === 'object' ? (h.ts || parseFloat(h.body)) : h)) : null;
    el.textContent = a == null ? '● data: unavailable' : ('● ' + (IS_GH ? 'github' : 'file') + ' · data ' + a + 's old');
    el.style.background = a == null || a > 30 ? '#ff5c6c' : a > 12 ? '#ffc24a' : '#2fd38a';
  });
}
document.addEventListener('DOMContentLoaded', () => { badge(); setInterval(badge, 4000); });

// Open Agents tab when hash/query asks (mirror copy only; original untouched)
document.addEventListener('DOMContentLoaded', () => {
  const want = (location.hash || '').replace(/^#/, '') || new URLSearchParams(location.search).get('tab') || '';
  if (!want) return;
  const map = { agents: 'agents', apothua: 'agents', chat: 'agents', creations: 'creations', mind: 'mind', history: 'history', live: 'live', paper: 'paper' };
  const tab = map[want.toLowerCase()];
  if (!tab) return;
  const tryClick = () => {
    const btn = document.querySelector('.tab[data-tab="' + tab + '"], button.tab[data-tab="' + tab + '"]');
    if (btn) { btn.click(); return true; }
    return false;
  };
  if (!tryClick()) setTimeout(tryClick, 200);
  setTimeout(tryClick, 800);
});
})();
