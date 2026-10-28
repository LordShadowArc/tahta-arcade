import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer, normalizeGameSpec } from '../server.mjs';

const disabledEnv = {};
const fakeEnv = { AI_API_KEY:'local-test-secret', AI_API_URL:'https://example.invalid/chat/completions', AI_MODEL:'test-model' };

async function withServer(options, run) {
  const server = createAppServer(options);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try { return await run(url); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('safe spec normalization and unexpected fields discarded', () => {
  assert.deepEqual(normalizeGameSpec({base:'mines',theme:'forest',difficulty:'easy',duration:1000,title:'MAYIN <script>alert(1)</script>',evil:'yes'}),{
    base:'mines',theme:'forest',difficulty:'easy',duration:90,title:'MAYIN scriptalert1script'
  });
  assert.throws(() => normalizeGameSpec({base:'made-up',theme:'space',difficulty:'hard'}));
  assert.throws(() => normalizeGameSpec({base:'snake',theme:'javascript:alert',difficulty:'easy'}));
  assert.throws(() => normalizeGameSpec('not a spec'));
});

test('site files load without login and report offline AI', async () => {
  await withServer({env:disabledEnv}, async url => {
    const index = await fetch(url);
    assert.equal(index.status,200);
    const html = await index.text();
    assert.match(html,/MAYIN TARLASI/);
    assert.match(html,/NEON YILAN/);
    assert.match(html,/aiMode/);
    for (const filename of ['game.js','extra-games.js','styles.css']) {
      const response = await fetch(`${url}/${filename}`);
      assert.equal(response.status,200);
      assert.ok((await response.text()).length > 200);
    }
    const health = await (await fetch(`${url}/health`)).json();
    assert.deepEqual(health,{ok:true,ai_enabled:false});
    const missing = await fetch(`${url}/api/generate`, {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(missing.status,503);
    assert.deepEqual(await missing.json(),{error:'AI_NOT_CONFIGURED'});
  });
});

test('AI provider response is validated, filtered, and authorization header stays server-side', async () => {
  let captured;
  const mockFetch = async (url, options) => {
    captured = {url, options};
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({base:'snake',theme:'ocean',difficulty:'hard',title:'Deniz Yılanı!',duration:50,code:'malicious-code'})}}]})};
  };
  await withServer({env:fakeEnv,fetchImpl:mockFetch},async url=>{
    assert.deepEqual(await (await fetch(`${url}/api/status`)).json(),{ok:true,ai_enabled:true});
    const response = await fetch(`${url}/api/generate`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'Suda yılan oyunu',difficulty:'hard',theme:'ocean'})});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{source:'model',spec:{base:'snake',theme:'ocean',difficulty:'hard',title:'Deniz Yılanı!',duration:50}});
    assert.equal(captured.url,fakeEnv.AI_API_URL);
    assert.equal(captured.options.headers.Authorization,`Bearer ${fakeEnv.AI_API_KEY}`);
    assert.ok(!JSON.stringify(await (await fetch(`${url}/api/status`)).json()).includes(fakeEnv.AI_API_KEY));
  });
});

test('bad inputs, invalid model output, oversized requests, rate limit', async () => {
  const mockFetch = async ()=>({ok:true,json:async()=>({choices:[{message:{content:'{"base":"script","theme":"space","difficulty":"easy"}'}}]})});
  await withServer({env:fakeEnv,fetchImpl:mockFetch},async url=>{
    const post = body => fetch(`${url}/api/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body});
    assert.equal((await post('{')).status,400);
    assert.equal((await post('{}')).status,400);
    assert.equal((await post('x'.repeat(5000))).status,413);
    const valid=JSON.stringify({prompt:'Uzayda mayın tarlası',difficulty:'normal',theme:'auto'});
    assert.equal((await post(valid)).status,502);
    for(let i=0;i<4;i++)await post(valid);
    assert.equal((await post(valid)).status,429);
    const missing = await fetch(`${url}/unlisted.html`);
    assert.equal(missing.status,404);
    const method = await fetch(`${url}/index.html`,{method:'POST'});
    assert.equal(method.status,405);
  });
});
