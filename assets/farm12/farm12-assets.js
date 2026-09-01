// Farm 12 visual asset Source-of-Truth.
// This file is intentionally data-only. 12.html will consume it in a later step.
// `null` means that stage is not yet available and the renderer must fall back safely.

window.FARM12_ASSETS = {
  version: 1,
  crops: {
    sweetpotatoleaf: {
      mature: 'assets/farm12/crops/mature/sweetpotatoleaf.webp',
      seedling: 'assets/farm12/crops/seedling/sweetpotatoleaf.webp',
      preMature: null,
      legendary: false
    },
    bokchoy: {
      mature: 'assets/farm12/crops/mature/bokchoy.webp',
      seedling: 'assets/farm12/crops/seedling/bokchoy.webp',
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
      seedling: null,
      preMature: null,
      legendary: false
    },
    pomelo: {
      mature: 'assets/farm12/crops/mature/pomelo.webp',
      seedling: null,
      preMature: null,
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
      seedling: null,
      preMature: null,
      legendary: false
    },
    strawberry: {
      mature: 'assets/farm12/crops/mature/strawberry.webp',
      seedling: null,
      preMature: null,
      legendary: false
    },
    golden_peach: {
      mature: 'assets/farm12/crops/legendary/golden_peach.webp',
      seedling: null,
      preMature: null,
      legendary: true
    },
    crystal_melon: {
      mature: 'assets/farm12/crops/legendary/crystal_melon.webp',
      seedling: null,
      preMature: null,
      legendary: true
    },
    giant_pumpkin: {
      mature: 'assets/farm12/crops/legendary/giant_pumpkin.webp',
      seedling: null,
      preMature: null,
      legendary: true
    },
    white_strawberry: {
      mature: 'assets/farm12/crops/legendary/white_strawberry.webp',
      seedling: null,
      preMature: null,
      legendary: true
    }
  },
  tools: {
    wateringCan: 'assets/farm12/tools/watering-can.webp',
    sprinkler: 'assets/farm12/tools/sprinkler.webp',
    pruningShears: 'assets/farm12/tools/pruning-shears.webp',
    chiliSpray: 'assets/farm12/tools/chili-spray.webp'
  },
  field: {
    caterpillar: 'assets/farm12/pests/caterpillar.webp',
    weed: 'assets/farm12/pests/weed.webp'
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
