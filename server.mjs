import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const GAME_TYPES = new Set(['dodge','snake','space','blocks','bricks','pong','flap','racer','bubbles','mines']);
const THEMES = new Set(['space','ocean','forest','candy']);
const DIFFICULTIES = new Set(['easy','normal','hard']);
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };

function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

export function normalizeGameSpec(input) {
  if (!isPlainObject(input) || !GAME_TYPES.has(input.base) || !THEMES.has(input.theme) || !DIFFICULTIES.has(input.difficulty)) {
    throw new Error('INVALID_GAME_SPEC');
  }
  const rawTitle = typeof input.title === 'string' ? input.title : '';
  const title = rawTitle.replace(/[^\p{L}\p{N} !?-]/gu, '').trim().slice(0, 32) || 'ÖZEL MİNİ OYUN';
  const duration = Number.isFinite(input.duration) ? Math.max(20, Math.min(90, Math.round(input.duration))) : 45;
  return { base:input.base, theme:input.theme, difficulty:input.difficulty, title, duration };
}

function sendJson(res, status, value) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
  res.end(JSON.stringify(value));
}

function providerConfigured(env) {
  try {
    const uri = new URL(env.AI_API_URL || '');
    return !!(env.AI_API_KEY && env.AI_MODEL && uri.protocol === 'https:');
  } catch { return false; }
}

async function readJson(req) {
  let bytes = 0, raw = '';
  for await (const chunk of req) {
    bytes += chunk.byteLength;
    if (bytes > 4096) throw new Error('BODY_TOO_LARGE');
    raw += chunk.toString('utf8');
  }
  try { return JSON.parse(raw); } catch { throw new Error('BAD_JSON'); }
}

async function modelGameSpec(input, env, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const prompt = `Kullanıcı: ${input.prompt}\nZorluk seçimi: ${input.difficulty}\nTema tercihi: ${input.theme}`;
  const system = `Sen Tahta Arcade için oyun tasarım planı üreten bir asistansın. SADECE tek bir JSON nesnesi döndür; Markdown/kod döndürme. Şema: {"base":"snake","theme":"space","difficulty":"normal","title":"OYUN İSMİ","duration":45}. base yalnızca ${[...GAME_TYPES].join(', ')} olabilir. theme yalnızca ${[...THEMES].join(', ')} olabilir. difficulty yalnızca easy, normal, hard olabilir. duration 20-90 arası sayı, title en çok 32 karakter. Sadece mevcut güvenli oyun şablonlarından uygun olanı seçip tema/zorluğunu düzenle. Bu sistem özgürce yeni oyun motoru veya kod oluşturmaz. İstekteki seçimi mümkün oldukça koru.`;
  try {
    const response = await fetchImpl(env.AI_API_URL, {
      method:'POST', signal:controller.signal,
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${env.AI_API_KEY}` },
      body:JSON.stringify({ model:env.AI_MODEL, temperature:0.15, max_tokens:220, messages:[{role:'system',content:system},{role:'user',content:prompt}] })
    });
    if (!response.ok) throw new Error('PROVIDER_FAILED');
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length > 4000) throw new Error('PROVIDER_INVALID_RESPONSE');
    let raw;
    try { raw = JSON.parse(content); }
    catch { throw new Error('PROVIDER_INVALID_RESPONSE'); }
    return normalizeGameSpec(raw);
  } finally { clearTimeout(timeout); }
}

export function createAppServer({ env = process.env, fetchImpl = fetch } = {}) {
  const hits = new Map();
  return createServer(async (req,res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/health' || url.pathname === '/api/status') {
      return sendJson(res, 200, { ok:true, ai_enabled:providerConfigured(env) });
    }
    if (url.pathname === '/api/generate') {
      if (req.method !== 'POST') return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'});
      if (!providerConfigured(env)) return sendJson(res,503,{error:'AI_NOT_CONFIGURED'});
      const ip = req.socket.remoteAddress || 'unknown';
      const current = Date.now(), entries = (hits.get(ip) || []).filter(t => current - t < 3600000);
      if (entries.length >= 8) return sendJson(res,429,{error:'RATE_LIMITED'});
      entries.push(current); hits.set(ip,entries);
      try {
        const data = await readJson(req);
        if (!isPlainObject(data) || typeof data.prompt !== 'string' || data.prompt.trim().length < 3 || data.prompt.length > 320 || !DIFFICULTIES.has(data.difficulty) || !(THEMES.has(data.theme) || data.theme === 'auto')) {
          return sendJson(res,400,{error:'BAD_REQUEST'});
        }
        const spec = await modelGameSpec(data, env, fetchImpl);
        return sendJson(res,200,{source:'model',spec});
      } catch (error) {
        if (error.message === 'BODY_TOO_LARGE') return sendJson(res,413,{error:'BODY_TOO_LARGE'});
        if (error.message === 'BAD_JSON') return sendJson(res,400,{error:'BAD_JSON'});
        return sendJson(res,502,{error:'GENERATION_UNAVAILABLE'});
      }
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'});
    let decoded;
    try { decoded = decodeURIComponent(url.pathname); }
    catch { return sendJson(res,400,{error:'BAD_PATH'}); }
    if (decoded.includes('\\') || decoded.split('/').includes('..') || decoded.includes('\0')) return sendJson(res,400,{error:'BAD_PATH'});
    const target = resolve(ROOT, '.' + (decoded === '/' ? '/index.html' : decoded));
    if (target !== ROOT && !target.startsWith(ROOT + sep)) return sendJson(res,403,{error:'FORBIDDEN'});
    try {
      const body = await readFile(target);
      res.writeHead(200, {'Content-Type':MIME[extname(target)] || 'application/octet-stream','Cache-Control':target.endsWith('.html')?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff'});
      return res.end(req.method === 'HEAD' ? undefined : body);
    } catch { return sendJson(res,404,{error:'NOT_FOUND'}); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 10000;
  createAppServer().listen(port, '0.0.0.0', () => console.log(`Tahta Arcade listening on ${port}`));
}
