import pathlib

_original_write_text = pathlib.Path.write_text


def _patched_write_text(self, data, *args, **kwargs):
    if self.name == '05.html' and 'function updateAndDrawPouringSystem(ctx)' in data:
        # Speed up the initial tip so replay visibly starts within a few seconds.
        data = data.replace('if (beakerA.angle > targetAngle) beakerA.angle -= 0.012;', 'if (beakerA.angle > targetAngle) beakerA.angle -= 0.028;')

        # A released grain represents several dots in the source beaker, so the source empties
        # while the retained sand pile grows. Keep all remaining source dots inside the glass.
        data = data.replace(
            "const source = beakerA.particles.find(p => p.type === 'sand' && p.alpha > 0);\n            if (source) source.alpha = 0;",
            "for (let i = 0; i < 3; i++) {\n                const source = beakerA.particles.find(p => p.type === 'sand' && p.alpha > 0);\n                if (source) source.alpha = 0;\n            }",
        )

        start = data.find('if (step === 4 && b.angle < -0.5) {')
        if start >= 0:
            end = data.find('                    } else {', start)
            if end >= 0:
                replacement = '''if (step === 4 && b.angle < -0.5) {
                        // Remaining source particles stay inside the tilted beaker.
                        // The separately generated grains are the only sand that travels to the filter.
                        if (p.x < leftWallX) p.x = leftWallX;
                        if (p.x > rightWallX) p.x = rightWallX;
                        if (p.y < -h/2 + 4) p.y = -h/2 + 4;
                        if (p.y > bottomWallY) p.y = bottomWallY;
'''
                data = data[:start] + replacement + data[end:]
    return _original_write_text(self, data, *args, **kwargs)


pathlib.Path.write_text = _patched_write_text
