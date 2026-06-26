from pathlib import Path

path = Path('05.html')
s = path.read_text(encoding='utf-8')

old = '''                    if (step === 4 && b.angle < -0.5) {
                        // Remaining source grains stay inside the glass while moving grains are
                        // represented by the separate visible stream below.
                        if (p.x < leftWallX) p.x = leftWallX;
                        if (p.x > rightWallX) p.x = rightWallX;
                        if (p.y < -h/2 + 4) p.y = -h/2 + 4;
                        if (p.y > bottomWallY) p.y = bottomWallY;
                    } else {
                                if (p.x < leftWallX - 25) {
                                    if (b.isPouring) p.alpha = 0; 
                                    else p.x = leftWallX - 25; 
                                }
                            }
                        }
                        
                        if (p.x < leftWallX && p.y < spoutOpeningY && b.isPouring) {
                             if (p.type === 'sand' && Math.random() < 0.15) p.alpha = 0; 
                        }
                    } else {
                        if (p.x < leftWallX) p.x = leftWallX;
                        if (p.x > rightWallX) p.x = rightWallX;
                        if (p.y > bottomWallY) p.y = bottomWallY;
                    }'''

new = '''                    if (step === 4 && b.angle < -0.5) {
                        // Remaining source grains stay inside the glass while moving grains are
                        // represented by the separate visible stream below.
                        if (p.x < leftWallX) p.x = leftWallX;
                        if (p.x > rightWallX) p.x = rightWallX;
                        if (p.y < -h/2 + 4) p.y = -h/2 + 4;
                        if (p.y > bottomWallY) p.y = bottomWallY;
                    } else {
                        if (p.x < leftWallX) p.x = leftWallX;
                        if (p.x > rightWallX) p.x = rightWallX;
                        if (p.y > bottomWallY) p.y = bottomWallY;
                    }'''

if old not in s:
    raise RuntimeError('Could not find the malformed source-particle branch')
s = s.replace(old, new, 1)
path.write_text(s, encoding='utf-8')
print('Repaired source-particle branch.')
