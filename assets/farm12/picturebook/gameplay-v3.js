/* 12-2 care rules. Kept separate from presentation for save compatibility. */
(function (root) {
  'use strict';
  const count = value => Math.max(0, Math.floor(Number(value) || 0));
  const makeHen = index => ({ id: 'hen-' + (index + 1), name: ['小米', '栗子', '芝麻'][index], color: index, fedToday: false, greetedDay: 0, affection: 0 });
  function normalizeCoop(saved = {}) {
    const built = !!saved.built;
    const hens = built ? (Array.isArray(saved.hens) && saved.hens.length ? saved.hens.slice(0, 3) : [{ ...makeHen(0), fedToday: !!saved.fedToday }]).map((hen, i) => ({
      ...makeHen(i), name: String(hen.name || makeHen(i).name).slice(0, 8),
      fedToday: !!hen.fedToday, greetedDay: count(hen.greetedDay), affection: Math.min(10, count(hen.affection))
    })) : [];
    return { built, feed: count(saved.feed), eggs: count(saved.eggs), hens };
  }
  function advanceCoopDay(coop) {
    return { ...coop, eggs: coop.eggs + coop.hens.filter(hen => hen.fedToday).length, hens: coop.hens.map(hen => ({ ...hen, fedToday: false })) };
  }
  function feedCoop(coop) {
    let feed = coop.feed, used = 0;
    const hens = coop.hens.map(hen => {
      if (hen.fedToday || feed < 1) return hen;
      feed--; used++;
      return { ...hen, fedToday: true };
    });
    return { coop: { ...coop, hens, feed }, used, remaining: hens.filter(hen => !hen.fedToday).length };
  }
  function treatPlot(plot, kind, stock) {
    const flag = kind === 'weed' ? 'hasWeed' : 'hasBug';
    const affected = plot.slots.filter(slot => slot.crop && slot[flag]).sort((a, b) => (b.hazardDays || 0) - (a.hazardDays || 0));
    const chosen = new Set(affected.slice(0, count(stock)).map(slot => slot.id));
    return {
      plot: { ...plot, slots: plot.slots.map(slot => {
        if (!chosen.has(slot.id)) return slot;
        const next = { ...slot, [flag]: false };
        return { ...next, hazardDays: next.hasBug || next.hasWeed ? slot.hazardDays : 0 };
      }) }, used: chosen.size, remaining: affected.length - chosen.size
    };
  }
  const questDuration = crop => count(crop.days) + 3;
  function normalizeQuest(quest) {
    if (!quest || !quest.crop) return null;
    if (quest.deadlineVersion === 2) return quest;
    const durationDays = questDuration(quest.crop);
    return { ...quest, daysLeft: Math.max(1, count(quest.daysLeft) + durationDays - 5), durationDays, deadlineVersion: 2 };
  }
  const cropStage = (crop, growth) => growth >= crop.days ? 'mature' : growth >= Math.max(1, Math.ceil(crop.days * .4)) ? 'growing' : 'seedling';
  const stageLabel = stage => ({ seedling: '幼苗', growing: '成長中', mature: '成熟' })[stage];
  const upgradePrice = coop => coop.hens.length === 1 ? 3000 : coop.hens.length === 2 ? 5000 : 0;
  const api = { makeHen, normalizeCoop, advanceCoopDay, feedCoop, treatPlot, questDuration, normalizeQuest, cropStage, stageLabel, upgradePrice };
  root.Farm12Care = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
