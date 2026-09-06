from pathlib import Path
import re

p = Path('herbgame.html')
s = p.read_text(encoding='utf-8')

# Keep dialogue and choices where they are; move the teacher portrait to the right.
old = '''            left: 50%;
            bottom: calc(100% + 1.5vh);
            transform: translateX(-50%);
            width: clamp(260px, 30vw, 430px);
            max-height: 54vh;
            object-fit: contain;'''
new = '''            left: auto;
            right: -6vw;
            bottom: calc(100% - 1vh);
            transform: none;
            width: clamp(220px, 22vw, 340px);
            max-height: 52vh;
            object-fit: contain;
            object-position: bottom center;'''
if old not in s:
    raise SystemExit('desktop portrait CSS target not found')
s = s.replace(old, new, 1)

old_mobile = '''                width: clamp(230px, 52vw, 340px);
                max-height: 50vh;
                bottom: calc(100% + 1vh);'''
new_mobile = '''                right: -3vw;
                width: clamp(170px, 35vw, 250px);
                max-height: 44vh;
                bottom: calc(100% - 0.5vh);'''
if old_mobile not in s:
    raise SystemExit('mobile portrait CSS target not found')
s = s.replace(old_mobile, new_mobile, 1)

# Explicit portrait mapping for the agreed story nodes / choice responses.
replacements = [
    ('"scene09_05": { type: "dialogue", speaker: "陳冠瑋老師", speakerType: "npc", text: "那邊那位同學。", next: "scene09_06" },',
     '"scene09_05": { type: "dialogue", speaker: "陳冠瑋老師", speakerType: "npc", text: "那邊那位同學。", portrait: "picture/herb-game/chen-guanwei-normal.png", next: "scene09_06" },'),
    ('type: "dialogue", speaker: "陳冠瑋老師", speakerType: "npc", text: "你是不是剛到？",',
     'type: "dialogue", speaker: "陳冠瑋老師", speakerType: "npc", text: "你是不是剛到？", portrait: "picture/herb-game/chen-guanwei-normal.png",'),
    ('response: { speaker: "陳冠瑋老師", speakerType: "npc", text: "是嗎？", next: "scene09_07_A2" }',
     'response: { speaker: "陳冠瑋老師", speakerType: "npc", text: "是嗎？", portrait: "picture/herb-game/chen-guanwei-thinking.png", next: "scene09_07_A2" }'),
    ('response: { speaker: "陳冠瑋老師", speakerType: "npc", text: "至少你有趕過來。", next: "scene09_07_B2" }',
     'response: { speaker: "陳冠瑋老師", speakerType: "npc", text: "至少你有趕過來。", portrait: "picture/herb-game/chen-guanwei-surprised.png", next: "scene09_07_B2" }'),
    ('response: { speaker: "陳冠瑋老師", speakerType: "npc", text: "……巡視校園？", next: "scene09_07_C2" }',
     'response: { speaker: "陳冠瑋老師", speakerType: "npc", text: "……巡視校園？", portrait: "picture/herb-game/chen-guanwei-thinking.png", next: "scene09_07_C2" }'),
    ('"scene09_07_C2": { type: "dialogue", speaker: "陳冠瑋老師", speakerType: "npc", text: "好。", next: "scene09_07_C3" },',
     '"scene09_07_C2": { type: "dialogue", speaker: "陳冠瑋老師", speakerType: "npc", text: "好。", portrait: "picture/herb-game/chen-guanwei-thinking.png", next: "scene09_07_C3" },'),
    ('"scene09_07_C3": { type: "dialogue", speaker: "陳冠瑋老師", speakerType: "npc", text: "那你等等就順便巡視一下香草園。", next: "scene09_end" },',
     '"scene09_07_C3": { type: "dialogue", speaker: "陳冠瑋老師", speakerType: "npc", text: "那你等等就順便巡視一下香草園。", portrait: "picture/herb-game/chen-guanwei-thinking.png", next: "scene09_end" },'),
    ('response: { speaker: "陳冠瑋老師", speakerType: "npc", text: "等等——", next: "bad_end_01" }',
     'response: { speaker: "陳冠瑋老師", speakerType: "npc", text: "等等——", portrait: "picture/herb-game/chen-guanwei-surprised.png", next: "bad_end_01" }'),
]
for old_text, new_text in replacements:
    if old_text not in s:
        raise SystemExit('node mapping target not found: ' + old_text[:70])
    s = s.replace(old_text, new_text, 1)

# Use explicit node mapping only. Other teacher dialogue does not show a portrait.
pattern = re.compile(r'            getPortraitForNode\(node\) \{.*?\n            \}\n\n            updateSpeakerPortrait\(node\) \{', re.S)
replacement = '''            getPortraitForNode(node) {
                if (!node || node.speaker !== "陳冠瑋老師") return null;
                return node.portrait || null;
            }

            updateSpeakerPortrait(node) {'''
s, count = pattern.subn(replacement, s, count=1)
if count != 1:
    raise SystemExit('portrait function target not found')

p.write_text(s, encoding='utf-8')
print('trial right-side portrait patch complete')
