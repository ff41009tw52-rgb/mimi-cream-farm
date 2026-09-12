from playwright.sync_api import sync_playwright
import json

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width":1366,"height":768})
    page_errors = []
    page.on('pageerror', lambda err: page_errors.append(str(err)))
    page.route('https://**/*', lambda route: route.abort())
    page.goto('http://127.0.0.1:8765/herbgameai-formal.html', wait_until='domcontentloaded')
    page.wait_for_function('window.gameEngine && window.__HERBGAME_MEMBER_PORTRAIT_VIEWER', timeout=10000)

    page.evaluate("""() => {
      const e = window.gameEngine;
      e.dom.screenHome.classList.remove('active');
      e.dom.screenIntro.classList.remove('active');
      e.dom.screenGame.classList.add('active');
      e.gameState.unlockedStudents.add('mint_student');
      e.gameState.unlockedStudents.delete('left_student');
      e.gameState.discoveredHerbNames.add('薄荷');
      e.openPlayerPanel();
      e.switchPanelTab('members');
      const body = document.querySelector('.player-panel-body');
      body.scrollTop = 220;
    }""")
    page.wait_for_timeout(150)

    portrait = page.locator('.member-avatar-img[data-student-id="mint_student"]')
    assert portrait.count() == 1
    assert page.locator('.member-avatar-img[data-student-id="left_student"]').count() == 0

    thumb = page.evaluate("""() => {
      const img=document.querySelector('.member-avatar-img[data-student-id="mint_student"]');
      return {src:img.getAttribute('src'), expected:STUDENT_INFO.mint_student.avatar, cursor:getComputedStyle(img).cursor};
    }""")
    assert thumb['src'] == thumb['expected']
    assert thumb['cursor'] == 'zoom-in'

    scroll_before = page.eval_on_selector('.player-panel-body', 'el => el.scrollTop')
    portrait.click()
    page.wait_for_timeout(100)

    opened = page.evaluate("""() => {
      const v=document.getElementById('member-portrait-viewer');
      const img=document.getElementById('member-portrait-viewer-image');
      const r=img.getBoundingClientRect();
      return {
        active:v.classList.contains('active'),
        id:v.dataset.studentId,
        src:img.getAttribute('src'),
        expected:STUDENT_INFO.mint_student.avatar,
        fit:getComputedStyle(img).objectFit,
        maxHeight:getComputedStyle(img).maxHeight,
        name:document.getElementById('member-portrait-viewer-name').textContent,
        plant:document.getElementById('member-portrait-viewer-plant').textContent,
        imageWithinViewport:r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
        panelActive:window.gameEngine.dom.playerPanel.classList.contains('active'),
        membersActive:document.querySelector('[data-panel-tab="members"]').classList.contains('active')
      };
    }""")
    assert opened['active'] and opened['id'] == 'mint_student'
    assert opened['src'] == opened['expected']
    assert opened['fit'] == 'contain'
    assert opened['name'] == '小琳'
    assert opened['plant'] == '代表植物｜薄荷'
    assert opened['imageWithinViewport']
    assert opened['panelActive'] and opened['membersActive']

    # Clicking the portrait itself must not close the viewer.
    page.locator('#member-portrait-viewer-image').click()
    assert page.locator('#member-portrait-viewer').evaluate('el => el.classList.contains("active")')

    # Space must do nothing while the viewer is open.
    before_space = page.evaluate("""() => ({
      active:document.getElementById('member-portrait-viewer').classList.contains('active'),
      node:window.gameEngine.currentNodeId,
      text:window.gameEngine.dom.dialogueText.textContent
    })""")
    page.keyboard.press('Space')
    page.wait_for_timeout(50)
    after_space = page.evaluate("""() => ({
      active:document.getElementById('member-portrait-viewer').classList.contains('active'),
      node:window.gameEngine.currentNodeId,
      text:window.gameEngine.dom.dialogueText.textContent
    })""")
    assert after_space == before_space

    # Backdrop closes while panel/tab and scroll position stay intact.
    page.locator('#member-portrait-viewer').evaluate('el => el.click()')
    assert not page.locator('#member-portrait-viewer').evaluate('el => el.classList.contains("active")')
    assert page.locator('#player-panel').evaluate('el => el.classList.contains("active")')
    assert page.locator('[data-panel-tab="members"]').evaluate('el => el.classList.contains("active")')
    assert abs(page.eval_on_selector('.player-panel-body', 'el => el.scrollTop') - scroll_before) <= 2

    # Undiscovered plant remains hidden.
    page.evaluate("window.gameEngine.gameState.discoveredHerbNames.delete('薄荷')")
    portrait.click()
    assert page.locator('#member-portrait-viewer-plant').inner_text() == '代表植物｜？？？'

    # Esc closes only the viewer, not the player panel.
    page.keyboard.press('Escape')
    assert not page.locator('#member-portrait-viewer').evaluate('el => el.classList.contains("active")')
    assert page.locator('#player-panel').evaluate('el => el.classList.contains("active")')

    # Close button closes and must not leave hidden viewer focus behind.
    portrait.click()
    page.locator('#member-portrait-viewer-close').click()
    focus_state = page.evaluate("""() => ({
      active:document.getElementById('member-portrait-viewer').classList.contains('active'),
      focusInside:document.getElementById('member-portrait-viewer').contains(document.activeElement),
      panelActive:window.gameEngine.dom.playerPanel.classList.contains('active'),
      membersActive:document.querySelector('[data-panel-tab="members"]').classList.contains('active'),
      cardText:document.querySelector('.member-avatar-img[data-student-id="mint_student"]').closest('.member-card').innerText
    })""")
    assert not focus_state['active'] and not focus_state['focusInside']
    assert focus_state['panelActive'] and focus_state['membersActive']
    for label in ['代表植物','喜歡的地方','目前印象','故事進度','相處進度']:
        assert label in focus_state['cardText']

    assert page_errors == [], page_errors
    print('MEMBER_VIEWER_OK=' + json.dumps({'thumb':thumb,'opened':opened,'focus':focus_state}, ensure_ascii=False))
    browser.close()
