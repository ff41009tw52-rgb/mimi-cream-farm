"""Create printer artwork and the exact silhouette masks from the four source PNGs."""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

species = ('clown', 'butterfly', 'puffer', 'shark')
parser = argparse.ArgumentParser(description=__doc__)
for name in species:
    parser.add_argument(f'--{name}', type=Path, required=True)
args = parser.parse_args()
base = Path(__file__).resolve().parent.parent
artwork = base / 'templates' / 'artwork'
artwork.mkdir(exist_ok=True)
geometry = {}

for name in species:
    with Image.open(getattr(args, name)) as original:
        image = original.convert('L')
    pixels = np.asarray(image)
    ink = (pixels < 200).astype(np.uint8)
    contours, _ = cv2.findContours(ink, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    silhouette = max(contours, key=cv2.contourArea)
    if cv2.contourArea(silhouette) < pixels.size * .19:
        raise ValueError(f'{name}: expected a closed outline')
    # Include the anti-aliased edge of the ink without tracing interior details.
    mask = np.zeros_like(ink)
    cv2.drawContours(mask, [silhouette], -1, 1, cv2.FILLED)
    edge = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    contours, _ = cv2.findContours(edge, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contour = max(contours, key=cv2.contourArea)
    points = cv2.approxPolyDP(contour, .68, True)[:, 0]
    x, y, w, h = cv2.boundingRect(contour)
    crop = image.crop((x, y, x+w, y+h))
    crop.save(artwork / f'{name}.png', optimize=True)
    geometry[name] = {
        'width': w,
        'height': h,
        'outline': (points - [x, y]).tolist(),
    }

(base / 'tools' / 'artwork.json').write_text(
    json.dumps(geometry, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8'
)
