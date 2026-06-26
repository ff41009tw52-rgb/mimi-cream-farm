import pathlib

print('SITE_CUSTOMIZE_05_ACTIVE')
_original_write_text = pathlib.Path.write_text


def _patched_write_text(self, data, *args, **kwargs):
    if self.name == '05.html' and 'function updateAndDrawPouringSystem(ctx)' in data:
        data = data.replace(
            'if (beakerA.angle > targetAngle) beakerA.angle -= 0.012;',
            'if (beakerA.angle > targetAngle) beakerA.angle -= 0.028;'
        )
        data = data.replace(
            "const source = beakerA.particles.find(p => p.type === 'sand' && p.alpha > 0);\n            if (source) source.alpha = 0;",
            "for (let i = 0; i < 3; i++) {\n                const source = beakerA.particles.find(p => p.type === 'sand' && p.alpha > 0);\n                if (source) source.alpha = 0;\n            }"
        )
        start = data.find('if (step === 4 && b.angle < -0.5) {')
        end = data.find('                    } else {', start) if start >= 0 else -1
        if start < 0 or end < 0:
            raise RuntimeError('SITE_CUSTOMIZE could not locate source sand branch')
        replacement = '''if (step === 4 && b.angle < -0.5) {
                        // Source particles remain inside the tilted beaker. Only the separate
                        // falling stream travels toward the filter.
                        if (p.x < leftWallX) p.x = leftWallX;
                        if (p.x > rightWallX) p.x = rightWallX;
                        if (p.y < -h/2 + 4) p.y = -h/2 + 4;
                        if (p.y > bottomWallY) p.y = bottomWallY;
'''
        data = data[:start] + replacement + data[end:]
    return _original_write_text(self, data, *args, **kwargs)


pathlib.Path.write_text = _patched_write_text
