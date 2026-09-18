import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {} };
const engineSource = fs.readFileSync(path.join(repoRoot, 'ai-assistant', 'assistant-engine.js'), 'utf8');
vm.runInNewContext(engineSource, sandbox, { filename: 'assistant-engine.js' });

const engine = sandbox.window.SCIENCE_ASSISTANT_ENGINE;
const siteKnowledge = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'site-knowledge.json'), 'utf8'));
const curriculum = [
  JSON.parse(fs.readFileSync(path.join(repoRoot, 'knowledge', 'grade4', 'unit1-earth-surface.json'), 'utf8'))
];
const answer = (question, grade = '4') => engine.answerQuestion({
  question,
  grade,
  siteKnowledge,
  curriculum,
  fallbackText: '測試用保守回答'
});

assert(engine, 'engine must be exposed on window');

const lookupIntent = engine.classifyQuestion('41 號遊戲在哪裡？', '4');
assert.equal(lookupIntent.type, 'game_lookup');
assert.equal(lookupIntent.entities.gameNumber, '41');

const recommendationIntent = engine.classifyQuestion('推薦四年級的遊戲', '3');
assert.equal(recommendationIntent.type, 'grade_games');
assert.equal(recommendationIntent.entities.grade, '4');
assert.equal(engine.classifyQuestion('四年級有什麼遊戲？', '3').type, 'grade_games');

const siteHelpIntent = engine.classifyQuestion('網站畫面卡住了', '4');
assert.equal(siteHelpIntent.type, 'site_help');
assert.equal(engine.classifyQuestion('卡住了怎麼辦？', '4').type, 'site_help');

const publishedGame = answer('41 號遊戲在哪裡？');
assert.equal(publishedGame.intent, 'game_lookup');
assert.equal(publishedGame.action?.href, 'play.html?game=41');
assert.match(publishedGame.text, /流水搬運小實驗/);

const unlistedGame = answer('13 號遊戲在哪裡？');
assert.equal(unlistedGame.policy, 'unlisted');
assert.equal(unlistedGame.action, undefined);
assert.match(unlistedGame.text, /沒有在首頁發布/);

const teacherResource = answer('37 號遊戲在哪裡？');
assert.equal(teacherResource.policy, 'teacher-resource');
assert.equal(teacherResource.action, undefined);
assert.match(teacherResource.text, /教師資源/);

const gradeGames = answer('推薦四年級的遊戲');
assert.equal(gradeGames.intent, 'grade_games');
assert.equal(gradeGames.action?.kind, 'grade');
assert.match(gradeGames.text, /41 號/);
assert.doesNotMatch(gradeGames.text, /13 號/);

const topicGames = answer('有沒有跟流水有關的遊戲？');
assert.equal(topicGames.intent, 'game_search');
assert.equal(topicGames.action?.href, 'play.html?game=41');
assert.match(topicGames.text, /41 號/);

const earthquakeTerms = answer('震源和震央有什麼不同？');
assert.equal(earthquakeTerms.intent, 'curriculum');
assert.equal(earthquakeTerms.conceptId, 'earthquake-report-terms');
assert.match(earthquakeTerms.text, /第 25 頁/);

const magnitude = answer('規模和震度一樣嗎？');
assert.equal(magnitude.intent, 'curriculum');
assert.equal(magnitude.conceptId, 'magnitude-and-intensity');
assert.match(magnitude.text, /規模/);
assert.match(magnitude.text, /震度/);

const flowingWater = answer('流水怎麼改變地表？');
assert.equal(flowingWater.intent, 'curriculum');
assert.equal(flowingWater.conceptId, 'flowing-water-action');
assert.equal(flowingWater.action?.href, 'play.html?game=41');

const siteHelp = answer('網頁畫面卡住了');
assert.equal(siteHelp.intent, 'site_help');
assert.match(siteHelp.text, /重新整理/);

const unknown = answer('你最喜歡哪一種罐頭？');
assert.equal(unknown.intent, 'unknown');
assert.equal(unknown.source, 'fallback');
assert.equal(unknown.text, '測試用保守回答');

const gameResults = engine.searchGames('肌肉遊戲', siteKnowledge, {
  grade: '5',
  recommendableOnly: true,
  gradeOnly: true
});
assert(gameResults.length >= 1);
assert(gameResults.every((result) => result.game.recommendable && result.game.grades.includes('5')));

console.log('Assistant engine tests passed.');
console.log('  Classification: game lookup / recommendation / curriculum / site help / unknown');
console.log('  Search: published games and Grade 4 Unit 1 curriculum');
console.log('  Policies: unlisted and teacher resources are never linked');
