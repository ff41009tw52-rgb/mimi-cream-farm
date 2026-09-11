from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "picture" / "herb-game" / "ai-characters"
FILES = [
    ("01_小琳_mint_student.png", "1etFumWOsRzXMg8xLStUOEJjM112DSEYc"),
    ("02_小安_left_student.png", "1CT8-yIyZ-E7Jf90kSOXDBAJ-ducZoEL-"),
    ("03_小凱_lemongrass_student.png", "1o6NbWyrXWaHy2cfi12f_D4DmqhtjeW3X"),
    ("04_小樂_pandan_student.png", "1ENyYdS41HpWjSbqfozjIT4Fv_QKeEw2Y"),
    ("05_小希_mugwort_student.png", "1-CCw6whKxArcXbRC_Bf9IyF7aLaoHcVP"),
    ("06_小柏_fishmint_student.png", "1HCgoKTtemi2IF_7PCVCh6w_fEVP0nquz"),
    ("07_小杰_pricklyash_student.png", "1VCo2dmho8chozFOkshuzvWDJq4CNyqh2"),
    ("08_小羽_shellginger_student.png", "1KVgEvoCVpmH2wPM8-nOSGIrkfFwdeheS"),
    ("09_小森_teatree_student.png", "1PHwaFgbhkfxpZ7AMRCQP25tAxXHZCxbk"),
    ("10_小辰_turmeric_student.png", "100dlw2OoGsuvKGAsTvRObTb6rxYAmOcR"),
    ("11_小晴_marigold_student.png", "1jSNzmKn3gVXJSC3LxCGSoAjdY6kiyLOn"),
]

for filename, file_id in FILES:
    target = OUT / filename
    urls = [
        f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t",
        f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t",
    ]
    ok = False
    for url in urls:
        proc = subprocess.run([
            "curl", "-L", "--fail", "--silent", "--show-error", "--retry", "2",
            "-o", str(target), url,
        ])
        if proc.returncode == 0 and target.exists() and target.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n":
            ok = True
            break
    if not ok:
        prefix = target.read_bytes()[:100] if target.exists() else b""
        raise SystemExit(f"download failed for {filename}: {prefix!r}")
    print(f"downloaded {filename}: {target.stat().st_size} bytes")

Path(__file__).unlink()
