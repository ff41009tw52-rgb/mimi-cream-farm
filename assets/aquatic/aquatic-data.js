export const AQUATIC_CLASSES = Object.freeze(['307', '309', '310', '311', '312', '313', '314']);

export const AQUATIC_PLANTS = Object.freeze([
  {
    id: 'water-lettuce',
    name: '大萍',
    category: '漂浮植物',
    textbook: '根漂浮在水裡，葉漂浮在水面上。',
    page: 48,
    referenceImage: 'assets/aquatic/textbook-page-48.png',
    crop: { width: 1854, height: 245, x: 0, y: 34, viewWidth: 456, viewHeight: 142 },
    clues: ['葉片層層排列', '根垂在水中', '整株漂浮']
  },
  {
    id: 'duckweed',
    name: '浮萍',
    category: '漂浮植物',
    textbook: '根漂浮在水裡，葉漂浮在水面上。',
    page: 48,
    referenceImage: 'assets/aquatic/textbook-page-48.png',
    crop: { width: 1854, height: 245, x: 457, y: 34, viewWidth: 502, viewHeight: 142 },
    clues: ['葉片很小', '常成群漂浮', '根沒有固定在泥土中']
  },
  {
    id: 'water-hyacinth',
    name: '布袋蓮',
    category: '漂浮植物',
    textbook: '根漂浮在水裡，葉漂浮在水面上。',
    page: 48,
    referenceImage: 'assets/aquatic/textbook-page-48.png',
    crop: { width: 1854, height: 245, x: 963, y: 34, viewWidth: 486, viewHeight: 142 },
    clues: ['葉柄可能膨大', '根垂在水中', '整株能漂浮']
  },
  {
    id: 'hydrilla',
    name: '水蘊草',
    category: '沉水植物',
    textbook: '根生長在水底的泥土裡，莖和葉在水中。',
    page: 48,
    referenceImage: 'assets/aquatic/textbook-page-48.png',
    crop: { width: 1854, height: 245, x: 1451, y: 34, viewWidth: 403, viewHeight: 142 },
    clues: ['莖和葉浸在水中', '葉片細長', '根固定在水底']
  },
  {
    id: 'water-lily',
    name: '睡蓮',
    category: '浮葉植物',
    textbook: '根和地下莖生長在水底的泥土裡，葉平貼在水面，花挺出水面。',
    page: 50,
    referenceImage: 'assets/aquatic/textbook-page-50.png',
    crop: { width: 1451, height: 272, x: 0, y: 37, viewWidth: 456, viewHeight: 141 },
    clues: ['葉片平貼水面', '花挺出水面', '根固定在水底']
  },
  {
    id: 'yellow-water-lily',
    name: '臺灣萍蓬草',
    category: '浮葉植物',
    textbook: '根和地下莖生長在水底的泥土裡，葉平貼在水面，花挺出水面。',
    page: 50,
    referenceImage: 'assets/aquatic/textbook-page-50.png',
    crop: { width: 1451, height: 272, x: 458, y: 37, viewWidth: 505, viewHeight: 141 },
    clues: ['葉片平貼水面', '花朵黃色', '根固定在水底']
  },
  {
    id: 'lotus',
    name: '荷花',
    category: '挺水植物',
    textbook: '根和地下莖生長在水底的泥土裡，葉和花挺出水面。',
    page: 50,
    referenceImage: 'assets/aquatic/textbook-page-50.png',
    crop: { width: 1451, height: 272, x: 965, y: 37, viewWidth: 486, viewHeight: 141 },
    clues: ['葉片挺出水面', '花朵挺出水面', '根固定在水底']
  }
]);

export const CATEGORY_OPTIONS = Object.freeze([
  { id: '漂浮植物', hint: '整株漂浮，根沒有固定在水底泥土裡。' },
  { id: '沉水植物', hint: '大部分莖和葉都在水中。' },
  { id: '浮葉植物', hint: '根固定水底，葉片平貼水面。' },
  { id: '挺水植物', hint: '根固定水底，莖、葉或花挺出水面。' }
]);

export const OBSERVATION_QUESTIONS = Object.freeze([
  {
    id: 'location',
    label: '你在什麼位置找到它？',
    type: 'choice',
    options: ['水面上', '水中', '水邊或泥土中']
  },
  {
    id: 'leaf_position',
    label: '它的葉主要在哪裡？',
    type: 'choice',
    options: ['漂浮在水面', '浸在水中', '挺出水面']
  },
  {
    id: 'root_position',
    label: '從現場觀察或課本圖判斷，它的根可能在哪裡？',
    type: 'choice',
    options: ['漂浮在水裡', '固定在水底泥土裡']
  }
]);

export const WATER_FLOW_OPTIONS = Object.freeze([
  { value: 'fast', label: '水流急速' },
  { value: 'slow', label: '水流緩慢' },
  { value: 'still', label: '靜止不動' }
]);

export const plantById = (id) => AQUATIC_PLANTS.find((plant) => plant.id === id);
