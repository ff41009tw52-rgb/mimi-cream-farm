/* 12-2 care rules. Kept separate from presentation for save compatibility. */
(function (root) {
  'use strict';
  const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const SAVE_KEY = 'farm_tycoon_save_v2_12_2_standard';
  const startingInventory = () => ({ nets: 0, windbreaks: 0, fert_leaf: 0, fert_root: 0, fert_fruit: 0, scissors: 10, chili: 10, seeds: {}, crops: {}, eggs: 0 });
  function normalizeInventory(saved = {}) {
    const inventory = startingInventory();
    for (const key of Object.keys(inventory)) {
      if (key === 'seeds' || key === 'crops') inventory[key] = Object.fromEntries(Object.entries(saved[key] || {}).map(([id, value]) => [id, count(value)]));
      else inventory[key] = saved[key] === undefined ? inventory[key] : count(saved[key]);
    }
    return inventory;
  }
  const seasonForDay = day => day <= 90 ? 'SPRING' : day <= 180 ? 'SUMMER' : day <= 270 ? 'AUTUMN' : 'WINTER';
  const rainy = weather => weather === 'rainy' || weather === 'typhoon';
  function weatherForDay(day, random = Math.random) {
    if (day <= 3) return 'sunny';
    const season = seasonForDay(day);
    if ((season === 'SUMMER' || season === 'AUTUMN') && random() < .08) return 'typhoon';
    return random() < ({ SPRING: .35, SUMMER: .45, AUTUMN: .25, WINTER: .20 })[season] ? 'rainy' : 'sunny';
  }
  const emptySlot = id => ({ id, crop: null, growth: 0, isWatered: false, isFertilized: false, hasBug: false, hasWeed: false, hazardDays: 0 });
  function advanceFields(plots, weather, nextWeather, random = Math.random) {
    let typhoonDamageCount = 0, hasDeadCrops = false;
    const nextPlots = plots.map(plot => {
      if (!plot.isUnlocked) return plot;
      const slots = plot.slots.map(slot => {
        if (!slot.crop) return slot;
        const mature = slot.growth >= slot.crop.days;
        // Today's weather is resolved tonight; tomorrow's weather never damages today's crop.
        if (!mature && weather === 'typhoon' && !plot.isWindbreaked && random() < .5) {
          typhoonDamageCount++;
          return emptySlot(slot.id);
        }
        const affected = !mature && (slot.hasBug || slot.hasWeed);
        if (affected && (slot.hazardDays || 0) >= 1) {
          hasDeadCrops = true;
          return emptySlot(slot.id);
        }
        // Settle care already performed today before introducing tomorrow's hazards.
        const growth = Math.min(slot.crop.days, slot.growth + (!mature && !affected && (slot.isWatered || rainy(weather)) ? 1 : 0));
        let bug = mature ? false : slot.hasBug, weed = mature ? false : slot.hasWeed;
        if (growth < slot.crop.days && !affected) {
          if (!plot.isNetted && random() < .15) bug = true;
          if (random() < .20) weed = true;
        }
        return { ...slot, growth, isWatered: rainy(nextWeather), isFertilized: false, hasBug: bug, hasWeed: weed, hazardDays: affected ? 1 : 0 };
      });
      return { ...plot, slots, isNetted: slots.some(slot => slot.crop && slot.growth >= slot.crop.days) ? false : plot.isNetted };
    });
    return { nextPlots, typhoonDamageCount, hasDeadCrops };
  }
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
  const api = { count, SAVE_KEY, startingInventory, normalizeInventory, seasonForDay, rainy, weatherForDay, advanceFields, makeHen, normalizeCoop, advanceCoopDay, feedCoop, treatPlot, questDuration, normalizeQuest, cropStage, stageLabel, upgradePrice };
  root.Farm12Care = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
