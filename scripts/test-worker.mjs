import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const { default: worker } = await import('../worker/src/index.js');

const readJson = async (response) => JSON.parse(await response.text());

{
  const response = await worker.fetch(
    new Request('https://example.test/', { method: 'GET' }),
    { GEMINI_API_KEY: 'test-key' }
  );
  assert.equal(response.status, 200);
  const body = await readJson(response);
  assert.equal(body.ok, true);
  assert.equal(body.service, 'mimi-cream-ai');
  assert.equal(body.geminiConfigured, true);
}

{
  const response = await worker.fetch(
    new Request('https://example.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '測試', grade: '3-4', character: 'mimi' })
    }),
    {}
  );
  assert.equal(response.status, 503);
}


{
  const response = await worker.fetch(
    new Request('https://example.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '靠北', grade: '3-4', character: 'mimi' })
    }),
    { GEMINI_API_KEY: 'test-key' }
  );
  assert.equal(response.status, 400);
  const body = await readJson(response);
  assert.equal(body.blocked, true);
  assert.equal(body.policy, 'profanity');
  assert.match(body.reply, /不要使用髒話/);
}

{
  const response = await worker.fetch(
    new Request('https://example.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '你最喜歡吃什麼？', grade: '3-4', character: 'mimi' })
    }),
    { GEMINI_API_KEY: 'test-key' }
  );
  assert.equal(response.status, 400);
  const body = await readJson(response);
  assert.equal(body.blocked, true);
  assert.equal(body.policy, 'off_topic');
}

try {
  globalThis.fetch = async (_url, options) => {
    const requestBody = JSON.parse(options.body);
    assert.match(requestBody.systemInstruction.parts[0].text, /三、四年級/);
    assert.match(requestBody.systemInstruction.parts[0].text, /橘咪咪/);
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{ text: '**這是測試回答**! 請看重點。' }]
        }
      }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const response = await worker.fetch(
    new Request('https://example.test/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://ff41009tw52-rgb.github.io'
      },
      body: JSON.stringify({
        message: '植物為什麼需要陽光？',
        grade: '3-4',
        character: 'mimi',
        history: []
      })
    }),
    { GEMINI_API_KEY: 'test-key' }
  );

  assert.equal(response.status, 200);
  const body = await readJson(response);
  assert.equal(body.ok, true);
  assert.equal(body.reply, '這是測試回答！ 請看重點。');
  assert.equal(body.grade, '3-4');
  assert.equal(body.character, 'mimi');
} finally {
  globalThis.fetch = originalFetch;
}

try {
  globalThis.fetch = async (_url, options) => {
    const requestBody = JSON.parse(options.body);
    assert.match(requestBody.systemInstruction.parts[0].text, /五、六年級/);
    assert.match(requestBody.systemInstruction.parts[0].text, /白奶油/);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '高年級測試回答。' }] } }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const response = await worker.fetch(
    new Request('https://example.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '動滑輪為什麼省力？',
        grade: '5-6',
        character: 'cream',
        history: []
      })
    }),
    { GEMINI_API_KEY: 'test-key' }
  );

  assert.equal(response.status, 200);
  const body = await readJson(response);
  assert.equal(body.grade, '5-6');
  assert.equal(body.character, 'cream');
} finally {
  globalThis.fetch = originalFetch;
}


try {
  let callCount = 0;
  const calledModels = [];
  globalThis.fetch = async (url, options) => {
    callCount += 1;
    const match = String(url).match(/models\/([^:]+):generateContent/);
    calledModels.push(match?.[1] || '');

    if (callCount === 1) {
      return new Response(JSON.stringify({
        error: { message: 'temporary quota test' }
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestBody = JSON.parse(options.body);
    assert.match(requestBody.systemInstruction.parts[0].text, /橘咪咪/);

    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{ text: '備援模型回答成功。' }]
        }
      }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const response = await worker.fetch(
    new Request('https://example.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '乾冰冒出的白煙是什麼？',
        grade: '3-4',
        character: 'mimi',
        history: []
      })
    }),
    { GEMINI_API_KEY: 'fallback-test-key' }
  );

  assert.equal(response.status, 200);
  const body = await readJson(response);
  assert.equal(body.ok, true);
  assert.equal(body.reply, '備援模型回答成功。');
  assert.equal(callCount, 2);
  assert.equal(calledModels[0], 'gemini-3.5-flash-lite');
  assert.equal(calledModels[1], 'gemini-3.1-flash-lite');
  assert.equal(body.model, 'gemini-3.1-flash-lite');
} finally {
  globalThis.fetch = originalFetch;
}

const scienceRequest = () => new Request('https://example.test/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: '彩虹怎麼形成的', grade: '3-4', history: [] })
});

// Permanent configuration errors stop after one attempt; rate limits try both models.
for (const [status, code, expectedCalls] of [
  [400, 'AI_REQUEST', 1],
  [403, 'AI_AUTH', 1],
  [429, 'AI_RATE_LIMIT', 2],
  [404, 'AI_MODEL_UNAVAILABLE', 2],
  [503, 'AI_PROVIDER_UNAVAILABLE', 2]
]) {
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ error: { message: 'upstream-private-detail' } }), { status });
    };
    const response = await worker.fetch(scienceRequest(), { GEMINI_API_KEY: 'test-key' });
    const body = await readJson(response);
    assert.equal(response.status, 502);
    assert.equal(body.code, code);
    assert.equal(calls, expectedCalls);
    assert.equal(body.fallbackFailures.length, expectedCalls);
    assert.ok(!JSON.stringify(body).includes('upstream-private-detail'), 'only server logs contain upstream details');
    assert.ok(body.fallbackFailures.every((failure) => failure.model !== 'gemini-2.5-flash-lite'));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// A stalled response body must also trigger fallback, even after headers arrived.
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
try {
  const timeouts = [];
  globalThis.setTimeout = (fn, delay) => { timeouts.push(delay); queueMicrotask(fn); return timeouts.length; };
  globalThis.clearTimeout = () => {};
  globalThis.fetch = async (_url, { signal }) => ({
    ok: true,
    status: 200,
    json: () => new Promise((_resolve, reject) => {
      const abort = () => { const error = new Error('aborted while reading body'); error.name = 'AbortError'; reject(error); };
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    })
  });
  const response = await worker.fetch(scienceRequest(), { GEMINI_API_KEY: 'test-key' });
  const body = await readJson(response);
  assert.equal(response.status, 502);
  assert.equal(body.code, 'AI_UPSTREAM_TIMEOUT');
  assert.deepEqual(timeouts, [14000, 14000]);
  assert.ok(timeouts.reduce((sum, delay) => sum + delay, 0) < 35000, 'backend attempts finish before frontend deadline');
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
}

console.log('Worker tests passed: primary model, fallback, permanent failures, safe diagnostics, response-body deadline.');
