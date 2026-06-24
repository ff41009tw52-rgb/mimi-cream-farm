from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = b"https://unpkg.com/@babel/standalone/babel.min.js"
NEW = b"https://unpkg.com/@babel/standalone@7.26.10/babel.min.js"
EXPECTED = {
    "one.html", "two.html", "three.html", "8.html", "11.html",
    "12.html", "14.html", "17.html", "23.html", "SV.html",
}

changed = []
for path in ROOT.rglob("*.html"):
    if ".git" in path.parts:
        continue
    original = path.read_bytes()
    if OLD in original:
        path.write_bytes(original.replace(OLD, NEW))
        changed.append(path.relative_to(ROOT).as_posix())

if set(changed) != EXPECTED:
    raise SystemExit(f"Unexpected target set: {sorted(changed)}")

print("Updated:", ", ".join(sorted(changed)))
