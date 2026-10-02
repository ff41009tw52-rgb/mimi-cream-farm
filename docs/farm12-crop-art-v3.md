# 12-2 crop artwork and opening page

The original tightly packed crop sheets allowed leaves from adjacent crops to appear in a sprite. The v3 sheets isolate each complete plant before packing into a regular 4 × 4 atlas, with transparent gutters. All three stages retain the same crop order and a square display area.

Assets:
- `assets/farm12/picturebook/crops-atlas-v3.webp`: 16 mature plants, regenerated with the built-in image generator.
- `assets/farm12/picturebook/sprouts-atlas-v3.webp`: existing 16 seedlings, isolated and repacked.
- `assets/farm12/picturebook/growth-atlas-v3.webp`: existing 16 growing plants, isolated and repacked.

Each sheet is 768 × 768; each cell is 192 × 192 with a maximum plant extent of 164 pixels. Connected sprite extraction preserves complete plants that crossed the old cell boundary and excludes unrelated neighbouring fragments. WebP compression preserves transparency. Crop indices and growth rules are unchanged.

All three URLs are preloaded before the game runtime and decoded on the opening screen. Shop, fields, seed bag, sales, quests and gallery share these same sheets. The first visit still requires a network download; subsequent uses reuse the browser cache. There are no Base64 images in the page.

## Generation prompt

Built-in image generation, transparent background, original mature crop sheet as reference:

> Use case: precise-object-edit. Asset type: production transparent sprite atlas for a watercolor farming game. Edit the supplied mature crop atlas, keeping the same 16 crops in exactly the same row-major order and the same gentle detailed watercolor/gouache style. CRITICAL FIX: square image with EXACT regular 4 by 4 invisible equal square cells. Each entire plant must be centered in its own cell and fit INSIDE the central 72% width and 72% height of that cell; leave at least 14% of the cell width TRANSPARENT padding on ALL FOUR sides. Absolutely no leaves, fruit, roots, shadows or fragments crossing into another cell. No stray marks. No grid lines, no labels, no ground, no background, actual transparent alpha. All plants approximately consistent visual size. Row1: sweet potato leafy plant, bok choy, fruiting guava small plant, water spinach. Row2: fruiting loofah vine, fruiting mango small plant, water bamboo shoots, taro with roots. Row3: fruiting pomelo small plant, white daikon radish with leaves, cabbage, red strawberry plant. Row4: golden peach small plant, green striped watermelon on compact vine, orange pumpkin on compact vine, white strawberry plant. Each subject is a separate isolated complete illustration. Keep leaf edges natural, no cropping. Request square 1024x1024 atlas.

The generated output required deterministic sprite packing to guarantee the requested gutters. A targeted alpha check confirms transparent cell edges for all 48 sprites.

The opening page now explains the buy–plant–care–harvest loop, sleep to advance time, the 365-day game period, and starting resources. It uses system Chinese sans-serif for explanatory text and Farm Rounded for the title. Artwork occupies its own layout space without overlapping text. No changes to save keys, economy, crop growth or 12-1.
