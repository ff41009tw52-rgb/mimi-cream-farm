from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = b"https://unpkg.com/@babel/standalone/babel.min.js"
NEW = b"https://unpkg.com/@babel/standalone@7.26.10/babel.min.js"

changed = []
for path in ROOT.rglob("*.html"):
    if ".git" in path.parts:
        continue
    original = path.read_bytes()
    if OLD not in original:
        continue
    updated = original.replace(OLD, NEW)
    path.write_bytes(updated)
    changed.append(path.relative_to(ROOT).as_posix())

expected = {
    "one.html", "two.html", "three.html", "8.html", "11.html",
    "12.html", "14.html", "17.html", "23.html", "SV.html",
}
if set(changed) != expected:
    missing = sorted(expected - set(changed))
    unexpected = sorted(set(changed) - expected)
    raise SystemExit(f"Unexpected Babel-pin targets. Missing: {missing}; unexpected: {unexpected}")

print("Pinned Babel 7.26.10 in:")
for item in changed:
    print(f"- {item}")
