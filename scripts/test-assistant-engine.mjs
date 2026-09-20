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
assert.equal(engine.stylizeCatReply('找到答案了。', ['喵！'], 0), '找到答案了，喵！');
assert.equal(
  engine.stylizeCatReply('慢慢找就好。', ['喵嗚～', '讓本喵陪你慢慢找～'], 1),
  '慢慢找就好，讓本喵陪你慢慢找～'
);
assert.equal(engine.stylizeCatReply('已經知道了喵！', ['喵！'], 0), '已經知道了喵！');

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
assert.match(publishedGame.text, /流水搬運小實驗/);
assert.doesNotMatch(publishedGame.text, /41 號/);
assert.equal(publishedGame.links?.[0]?.href, 'play.html?game=41');

const unlistedGame = answer('13 號遊戲在哪裡？');
assert.equal(unlistedGame.policy, 'unlisted');
assert.equal(unlistedGame.action, undefined);
assert.match(unlistedGame.text, /沒有在首頁發布/);
assert.doesNotMatch(unlistedGame.text, /13 號/);

const teacherResource = answer('37 號遊戲在哪裡？');
assert.equal(teacherResource.policy, 'teacher-resource');
assert.equal(teacherResource.action, undefined);
assert.match(teacherResource.text, /教師資源/);
assert.doesNotMatch(teacherResource.text, /37 號/);

const gradeGames = answer('推薦四年級的遊戲');
assert.equal(gradeGames.intent, 'grade_games');
assert.equal(gradeGames.action?.kind, 'grade');
assert.doesNotMatch(gradeGames.text, /\d+ 號/);
assert(gradeGames.links?.some((link) => /流水搬運小實驗/.test(link.label)));

const topicGames = answer('有沒有跟流水有關的遊戲？');
assert.equal(topicGames.intent, 'game_search');
assert.doesNotMatch(topicGames.text, /\d+ 號/);
assert(topicGames.links?.some((link) => /流水搬運小實驗/.test(link.label)));

// A subject/topic with no matching published game should invite feedback/new-game suggestions.
const missingSubjectGame = answer('有沒有跟音樂課相關的遊戲？', '3-4');
assert.equal(missingSubjectGame.intent, 'game_search');
assert.match(missingSubjectGame.text, /目前還沒有/);
assert.equal(missingSubjectGame.links?.[0]?.href, 'feedback.html');
assert.match(missingSubjectGame.links?.[0]?.label || '', /推薦小遊戲/);
assert.doesNotMatch(missingSubjectGame.text, /\d+ 號/);

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


const genericGameList = answer('有什麼遊戲？', '3-4');
assert.equal(engine.classifyQuestion('有什麼遊戲?', '3-4').type, 'grade_games');
assert.equal(engine.classifyQuestion('有哪些遊戲！', '5-6').type, 'grade_games');
assert.equal(genericGameList.intent, 'grade_games');
assert.match(genericGameList.text, /三、四年級/);

const genericUpperList = answer('有哪些遊戲可以玩？', '5-6');
assert.equal(genericUpperList.intent, 'grade_games');
assert.match(genericUpperList.text, /五、六年級/);

const groupedLower = answer('有什麼適合這個年級的遊戲？', '3-4');
assert.equal(groupedLower.intent, 'grade_games');
assert.equal(groupedLower.action, null);
assert.match(groupedLower.text, /三、四年級/);
assert.doesNotMatch(groupedLower.text, /\d+ 號/);
assert(groupedLower.links?.some((link) => /流水搬運小實驗/.test(link.label)));
assert(groupedLower.links.every((link) => !/\d+\s*號/.test(link.label)));
assert.doesNotMatch(groupedLower.text, /按下面按鈕可篩選首頁/);

const groupedUpper = answer('有什麼適合這個年級的遊戲？', '5-6');
assert.equal(groupedUpper.intent, 'grade_games');
assert.equal(groupedUpper.action, null);
assert.match(groupedUpper.text, /五、六年級/);
assert.doesNotMatch(groupedUpper.text, /\d+ 號/);
assert(groupedUpper.links?.some((link) => /操作動滑輪/.test(link.label)));

assert.equal(engine.classifyQuestion('有什麼三、四年級遊戲？', '5-6').entities.grade, '3-4');
assert.equal(engine.classifyQuestion('推薦五六年級遊戲', '3-4').entities.grade, '5-6');

const groupedSearch = engine.searchGames('肌肉遊戲', siteKnowledge, {
  grade: '5-6',
  recommendableOnly: true,
  gradeOnly: true
});
assert(groupedSearch.length >= 1);
assert(groupedSearch.every((result) =>
  result.game.recommendable
  && result.game.grades.some((grade) => grade === '5' || grade === '6')
));

const groupedCurriculum = answer('流水怎麼改變地表？', '3-4');
assert.equal(groupedCurriculum.intent, 'curriculum');
assert.equal(groupedCurriculum.conceptId, 'flowing-water-action');

const missingGame = answer('99 號遊戲在哪裡？', '3-4');
assert.notEqual(missingGame.intent, 'game_lookup');


console.log('Assistant engine tests passed.');
console.log('  Classification: game lookup / recommendation / curriculum / site help / unknown');
console.log('  Search: published games and Grade 4 Unit 1 curriculum');
console.log('  Policies: unlisted and teacher resources are never linked');
