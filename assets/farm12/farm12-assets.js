// Farm 12 visual-edition asset Source-of-Truth and integrity-check manifest.
// This file is intentionally data-only; scripts/check-farm12-assets.mjs validates it.
// `null` means that stage is not available and the renderer must fall back safely.

window.FARM12_ASSETS = {
  version: 2,
  critical: [
    'assets/farm12/ui/raster/question.webp',
    'assets/farm12/ui/raster/sun.webp',
    'assets/farm12/ui/raster/rain.webp',
    'assets/farm12/ui/raster/storm.webp',
    'assets/farm12/ui/raster/inbox.webp',
    'assets/farm12/tools/watering-can.webp',
    'assets/farm12/tools/sprinkler.webp',
    'assets/farm12/tools/pruning-shears.webp',
    'assets/farm12/tools/chili-spray.webp',
    'assets/farm12/crops/seedling/sweetpotatoleaf.webp'
  ],
  crops: {
    sweetpotatoleaf: {
      mature: 'assets/farm12/crops/mature/sweetpotatoleaf.webp',
      seedling: 'assets/farm12/crops/seedling/sweetpotatoleaf.webp',
      preMature: null,
      legendary: false
    },
    bokchoy: {
      mature: 'assets/farm12/crops/mature/bokchoy.webp',
      seedling: 'assets/farm12/pilot/bokchoy-just-germinated.webp',
      preMature: null,
      legendary: false
    },
    guava: {
      mature: 'assets/farm12/crops/mature/guava.webp',
      seedling: 'assets/farm12/crops/seedling/guava.webp',
      preMature: 'assets/farm12/crops/pre-mature/guava.webp',
      legendary: false
    },
    waterspinach: {
      mature: 'assets/farm12/crops/mature/waterspinach.webp',
      seedling: 'assets/farm12/crops/seedling/waterspinach.webp',
      preMature: null,
      legendary: false
    },
    loofah: {
      mature: 'assets/farm12/crops/mature/loofah.webp',
      seedling: 'assets/farm12/crops/seedling/loofah.webp',
      preMature: 'assets/farm12/crops/pre-mature/loofah.webp',
      legendary: false
    },
    mango: {
      mature: 'assets/farm12/crops/mature/mango.webp',
      seedling: 'assets/farm12/crops/seedling/mango.webp',
      preMature: 'assets/farm12/crops/pre-mature/mango.webp',
      legendary: false
    },
    waterbamboo: {
      mature: 'assets/farm12/crops/mature/waterbamboo.webp',
      seedling: 'assets/farm12/crops/seedling/waterbamboo.webp',
      preMature: null,
      legendary: false
    },
    taro: {
      mature: 'assets/farm12/crops/mature/taro.webp',
      seedling: 'assets/farm12/crops/seedling/taro.webp',
      preMature: 'assets/farm12/crops/pre-mature/taro.webp',
      legendary: false
    },
    pomelo: {
      mature: 'assets/farm12/crops/mature/pomelo.webp',
      seedling: 'assets/farm12/crops/seedling/pomelo.webp',
      preMature: 'assets/farm12/crops/pre-mature/pomelo.webp',
      legendary: false
    },
    whiteradish: {
      mature: 'assets/farm12/crops/mature/whiteradish.webp',
      seedling: 'assets/farm12/crops/seedling/whiteradish.webp',
      preMature: null,
      legendary: false
    },
    cabbage: {
      mature: 'assets/farm12/crops/mature/cabbage.webp',
      seedling: 'assets/farm12/crops/seedling/cabbage.webp',
      preMature: 'assets/farm12/crops/pre-mature/cabbage.webp',
      legendary: false
    },
    strawberry: {
      mature: 'assets/farm12/crops/mature/strawberry.webp',
      seedling: 'assets/farm12/crops/seedling/strawberry.webp',
      preMature: 'assets/farm12/crops/pre-mature/strawberry.webp',
      legendary: false
    },
    golden_peach: {
      mature: 'assets/farm12/crops/legendary/golden_peach.webp',
      seedling: 'assets/farm12/crops/legendary/golden_peach-seedling.webp',
      preMature: 'assets/farm12/crops/legendary/golden_peach-pre-mature.webp',
      legendary: true
    },
    crystal_melon: {
      mature: 'assets/farm12/crops/legendary/crystal_melon.webp',
      seedling: 'assets/farm12/crops/legendary/crystal_melon-seedling.webp',
      preMature: 'assets/farm12/crops/legendary/crystal_melon-pre-mature.webp',
      legendary: true
    },
    giant_pumpkin: {
      mature: 'assets/farm12/crops/legendary/giant_pumpkin.webp',
      seedling: 'assets/farm12/crops/legendary/giant_pumpkin-seedling.webp',
      preMature: 'assets/farm12/crops/legendary/giant_pumpkin-pre-mature.webp',
      legendary: true
    },
    white_strawberry: {
      mature: 'assets/farm12/crops/legendary/white_strawberry.webp',
      seedling: 'assets/farm12/crops/legendary/white_strawberry-seedling.webp',
      preMature: 'assets/farm12/crops/legendary/white_strawberry-pre-mature.webp',
      legendary: true
    }
  },
  tools: {
    wateringCan: 'assets/farm12/tools/watering-can.webp',
    sprinkler: 'assets/farm12/tools/sprinkler.webp',
    pruningShears: 'assets/farm12/tools/pruning-shears.webp',
    chiliSpray: 'assets/farm12/tools/chili-spray.webp'
  },
  fertilizer: {
    leaf: 'assets/farm12/fertilizer/nitrogen.webp',
    root: 'assets/farm12/fertilizer/phosphorus.webp',
    fruit: 'assets/farm12/fertilizer/potassium.webp'
  },
  protection: {
    insectNet: 'assets/farm12/protection/insect-net.webp',
    windbreak: 'assets/farm12/protection/windbreak.webp'
  },
  field: {
    caterpillar: 'assets/farm12/pests/pest-caterpillar.webp',
    weed: 'assets/farm12/field/weed-field.webp'
  },
  ui: {
    announcement: 'assets/farm12/ui/raster/announcement.webp',
    book: 'assets/farm12/ui/raster/book.webp',
    cart: 'assets/farm12/ui/raster/cart.webp',
    celebrate: 'assets/farm12/ui/raster/celebrate.webp',
    checkEmpty: 'assets/farm12/ui/raster/check-empty.webp',
    check: 'assets/farm12/ui/raster/check.webp',
    close: 'assets/farm12/ui/raster/close.webp',
    education: 'assets/farm12/ui/raster/education.webp',
    farmer: 'assets/farm12/ui/raster/farmer.webp',
    folder: 'assets/farm12/ui/raster/folder.webp',
    gift: 'assets/farm12/ui/raster/gift.webp',
    grave: 'assets/farm12/ui/raster/grave.webp',
    hourglass: 'assets/farm12/ui/raster/hourglass.webp',
    idea: 'assets/farm12/ui/raster/idea.webp',
    inbox: 'assets/farm12/ui/raster/inbox.webp',
    lock: 'assets/farm12/ui/raster/lock.webp',
    medal: 'assets/farm12/ui/raster/medal.webp',
    moon: 'assets/farm12/ui/raster/moon.webp',
    question: 'assets/farm12/ui/raster/question.webp',
    rain: 'assets/farm12/ui/raster/rain.webp',
    sad: 'assets/farm12/ui/raster/sad.webp',
    save: 'assets/farm12/ui/raster/save.webp',
    school: 'assets/farm12/ui/raster/school.webp',
    shield: 'assets/farm12/ui/raster/shield.webp',
    soil: 'assets/farm12/ui/raster/soil.webp',
    sparkle: 'assets/farm12/ui/raster/sparkle.webp',
    storm: 'assets/farm12/ui/raster/storm.webp',
    sun: 'assets/farm12/ui/raster/sun.webp',
    tractor: 'assets/farm12/ui/raster/tractor.webp',
    warning: 'assets/farm12/ui/raster/warning.webp',
    water: 'assets/farm12/ui/raster/water.webp',
    weather: 'assets/farm12/ui/raster/weather.webp',
    wilt: 'assets/farm12/ui/raster/wilt.webp'
  },
  legacy: {
    pilotAtlas: 'assets/farm12/pilot/pilot-atlas.webp',
    svgSprite: 'assets/farm12/ui/farm12-icons.svg'
  }
};

window.getFarm12CropStageAsset = function getFarm12CropStageAsset(cropId, growth, totalDays) {
  const asset = window.FARM12_ASSETS?.crops?.[cropId];
  if (!asset) return null;

  const progress = totalDays > 0 ? Math.max(0, Math.min(1, growth / totalDays)) : 1;
  if (progress >= 1) return asset.mature || null;

  // Three-stage crops: dedicated seedling -> pre-mature -> mature.
  if (asset.preMature) {
    if (progress < 0.38) return asset.seedling || null;
    return asset.preMature;
  }

  // Two-stage crops: dedicated seedling until maturity.
  return asset.seedling || null;
};
