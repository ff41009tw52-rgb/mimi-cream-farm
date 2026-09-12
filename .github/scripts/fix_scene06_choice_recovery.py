from pathlib import Path

p = Path('herbgameai-formal.html')
s = p.read_text(encoding='utf-8')

old = "    const originalFinishTyping = engine.finishTyping.bind(engine);\n    engine.finishTyping = function(node) {\n      const result = originalFinishTyping(node);\n      if (node?.plantCardReveal && !plantCardActive) {"
new = "    const originalFinishTyping = engine.finishTyping.bind(engine);\n    engine.finishTyping = function(node) {\n      const result = originalFinishTyping(node);\n      // Choice nodes must never end up as a blank dialogue state. The base engine\n      // already renders choices; this is a narrow self-healing invariant for the\n      // AI trial in case a transition leaves the choice container desynchronised.\n      if (node?.choices?.length) {\n        const expectedCount = node.choices.length;\n        const choices = this.dom?.choicesContainer;\n        requestAnimationFrame(() => {\n          if (!choices) return;\n          const renderedCount = choices.querySelectorAll(\".choice-btn\").length;\n          if (!this.isShowingChoices || !choices.classList.contains(\"show\") || renderedCount !== expectedCount) {\n            this.showChoices(node.choices);\n          }\n        });\n      }\n      if (node?.plantCardReveal && !plantCardActive) {"
if s.count(old) != 1:
    raise SystemExit(f'finishTyping patch match count: {s.count(old)}')
s = s.replace(old, new, 1)

old = "      if (hasInteractiveKeyboardFocus(event.target) || hasInteractiveKeyboardFocus(doc.activeElement)) return;\n      if (engine.isShowingChoices || engine.dom?.choicesContainer?.classList.contains(\"show\")) return;\n      if (engine.dom?.playerPanel?.classList.contains(\"active\")) return;"
new = "      if (hasInteractiveKeyboardFocus(event.target) || hasInteractiveKeyboardFocus(doc.activeElement)) return;\n\n      // A choice node must not be skipped by Space. If the choice UI ever becomes\n      // desynchronised, Space repairs/reveals the choices instead of appearing dead.\n      const currentStoryNode = getStoryRef()?.nodes?.[engine.currentNodeId];\n      if (currentStoryNode?.choices?.length && !engine.isTyping) {\n        const choices = engine.dom?.choicesContainer;\n        const expectedCount = currentStoryNode.choices.length;\n        const renderedCount = choices?.querySelectorAll(\".choice-btn\").length || 0;\n        const choiceUIReady = Boolean(engine.isShowingChoices && choices?.classList.contains(\"show\") && renderedCount === expectedCount);\n        if (!choiceUIReady) {\n          event.preventDefault();\n          engine.showChoices(currentStoryNode.choices);\n        }\n        return;\n      }\n      if (engine.isShowingChoices || engine.dom?.choicesContainer?.classList.contains(\"show\")) return;\n      if (engine.dom?.playerPanel?.classList.contains(\"active\")) return;"
if s.count(old) != 1:
    raise SystemExit(f'Space choice recovery match count: {s.count(old)}')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
