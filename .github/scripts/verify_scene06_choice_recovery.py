from playwright.sync_api import sync_playwright
import json

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1755, "height": 878})
    page.route('https://**/*', lambda route: route.abort())
    page.goto('http://127.0.0.1:8765/herbgameai-formal.html', wait_until='domcontentloaded')
    page.wait_for_function('window.gameEngine && window.__HERBGAME_AI_VISUAL', timeout=10000)
    page.evaluate("""() => {
      const e=window.gameEngine;
      e.dom.screenHome.classList.remove('active');
      e.dom.screenIntro.classList.remove('active');
      e.dom.screenGame.classList.add('active');
      e.loadNode('scene06_02',{skipHistory:true});
    }""")
    page.wait_for_timeout(800)
    normal = page.evaluate("""() => {
      const e=window.gameEngine,c=e.dom.choicesContainer;
      return {node:e.currentNodeId, typing:e.isTyping, showing:e.isShowingChoices, count:c.querySelectorAll('.choice-btn').length, cls:c.className, icon:getComputedStyle(e.dom.continueIcon).opacity};
    }""")
    assert normal['node'] == 'scene06_02' and normal['typing'] is False
    assert normal['showing'] is True and normal['count'] == 3 and 'show' in normal['cls']
    assert normal['icon'] == '0'

    page.evaluate("""() => {
      const e=window.gameEngine,c=e.dom.choicesContainer;
      e.isShowingChoices=false;
      c.classList.remove('show');
      c.innerHTML='';
    }""")
    page.keyboard.press('Space')
    page.wait_for_timeout(100)
    recovered = page.evaluate("""() => {
      const e=window.gameEngine,c=e.dom.choicesContainer;
      return {node:e.currentNodeId, showing:e.isShowingChoices, count:c.querySelectorAll('.choice-btn').length, cls:c.className};
    }""")
    print('SCENE06_RECOVERY=' + json.dumps({'normal': normal, 'recovered': recovered}, ensure_ascii=False))
    assert recovered['node'] == 'scene06_02'
    assert recovered['showing'] is True and recovered['count'] == 3 and 'show' in recovered['cls']
    browser.close()
