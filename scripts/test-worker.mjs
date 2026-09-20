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
          parts: [{ text: '這是測試回答。' }]
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
  assert.equal(body.reply, '這是測試回答。');
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

console.log('Worker tests passed.');
