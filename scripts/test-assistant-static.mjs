import assert from 'node:assert/strict';
import fs from 'node:fs';

const assistant = fs.readFileSync('ai-assistant/ai-assistant.js', 'utf8');
const config = fs.readFileSync('ai-assistant/ai-assistant-config.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('worker/src/index.js', 'utf8');

assert.match(assistant, /\['3-4', '三、四年級', '橘咪咪'\]/);
assert.match(assistant, /\['5-6', '五、六年級', '白奶油'\]/);
assert.doesNotMatch(assistant, /不需要輸入姓名/);
assert.doesNotMatch(index, /不需要輸入姓名/);

assert.match(config, /apiEndpoint:\s*'https:\/\/mimi-cream-ai\.ff41009tw52\.workers\.dev\/'/);
assert.match(config, /'3-4':\s*\[/);
assert.match(config, /'5-6':\s*\[/);

assert.match(assistant, /responseToken/);
assert.match(assistant, /activeController/);
assert.match(assistant, /showGradeScreen\(\);\s*setOpen\(true\)/);

assert.match(worker, /env\.GEMINI_API_KEY/);
assert.doesNotMatch(worker, /AIza[0-9A-Za-z_-]{20,}/);

console.log('Assistant static checks passed.');

const engineSource = fs.readFileSync('ai-assistant/assistant-engine.js', 'utf8');
assert.match(engineSource, /input-guard/);
assert.match(engineSource, /containsExplicitProfanity/);
assert.match(engineSource, /isClearlyOffTopic/);
