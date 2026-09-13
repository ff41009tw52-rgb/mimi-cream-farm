import json
from playwright.sync_api import sync_playwright

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1366, "height": 768})
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.goto('http://127.0.0.1:8765/herbgameai-formal.html', wait_until='domcontentloaded')
    page.wait_for_function('window.gameEngine && window.__HERBGAME_MEMBER_PORTRAIT_VIEWER')

    page.evaluate('''() => {
      const e = window.gameEngine;
      document.getElementById('screen-home')?.classList.remove('active');
      document.getElementById('screen-intro')?.classList.remove('active');
      document.getElementById('screen-game')?.classList.add('active');
      e.gameState.unlockedStudents = new Set(['mint_student']);
      e.gameState.unlockedChars = new Set(['陳冠瑋老師','許恒維老師','校長']);
      e.gameState.discoveredHerbNames = new Set(['薄荷']);
      e.renderPlayerPanel();
      e.openPlayerPanel();
      e.switchPanelTab('members');
    }''')

    xiaolin = page.locator('.member-avatar-img[data-character-id="mint_student"]')
    chen = page.locator('.member-avatar-img[data-character-id="teacher_chen"]')
    assert xiaolin.count() == 1
    assert chen.count() == 1
    assert page.locator('.member-avatar-img[data-character-id="teacher_xu"]').count() == 0
    assert page.locator('.member-avatar-img[data-character-id="principal"]').count() == 0
    assert page.locator('.member-avatar-img[data-character-id="left_student"]').count() == 0

    xiaolin.click()
    page.wait_for_function("document.getElementById('member-portrait-viewer').classList.contains('active')")
    xiaolin_view = page.evaluate('''() => ({
      active: document.getElementById('member-portrait-viewer').classList.contains('active'),
      id: window.__HERBGAME_MEMBER_PORTRAIT_VIEWER.activeCharacterId,
      src: document.getElementById('member-portrait-viewer-image').getAttribute('src'),
      expected: STUDENT_INFO.mint_student.avatar,
      name: document.getElementById('member-portrait-viewer-name').textContent,
      meta: document.getElementById('member-portrait-viewer-meta').textContent,
      fit: getComputedStyle(document.getElementById('member-portrait-viewer-image')).objectFit,
      panelActive: document.getElementById('player-panel').classList.contains('active'),
      membersVisible: !document.getElementById('panel-members').classList.contains('hidden')
    })''')
    assert xiaolin_view['active'] and xiaolin_view['id'] == 'mint_student'
    assert xiaolin_view['src'] == xiaolin_view['expected']
    assert xiaolin_view['name'] == '小琳'
    assert xiaolin_view['meta'] == '代表植物｜薄荷'
    assert xiaolin_view['fit'] == 'contain'
    assert xiaolin_view['panelActive'] and xiaolin_view['membersVisible']

    page.locator('#member-portrait-viewer-image').click()
    before_space = page.evaluate('window.gameEngine.currentNodeId')
    page.keyboard.press('Space')
    assert page.evaluate("document.getElementById('member-portrait-viewer').classList.contains('active')")
    assert page.evaluate('window.gameEngine.currentNodeId') == before_space
    page.keyboard.press('Escape')
    assert not page.evaluate("document.getElementById('member-portrait-viewer').classList.contains('active')")
    assert page.evaluate("document.getElementById('player-panel').classList.contains('active')")
    assert page.evaluate("!document.getElementById('panel-members').classList.contains('hidden')")

    page.evaluate("window.gameEngine.gameState.discoveredHerbNames.delete('薄荷')")
    xiaolin.click()
    assert page.locator('#member-portrait-viewer-meta').inner_text() == '代表植物｜？？？'
    page.evaluate("document.getElementById('member-portrait-viewer').click()")
    assert not page.evaluate("document.getElementById('member-portrait-viewer').classList.contains('active')")

    chen.click()
    chen_view = page.evaluate('''() => {
      const info = MEMBER_INFO['陳冠瑋老師'];
      return {
        active: document.getElementById('member-portrait-viewer').classList.contains('active'),
        id: window.__HERBGAME_MEMBER_PORTRAIT_VIEWER.activeCharacterId,
        src: document.getElementById('member-portrait-viewer-image').getAttribute('src'),
        expected: info.avatar,
        name: document.getElementById('member-portrait-viewer-name').textContent,
        meta: document.getElementById('member-portrait-viewer-meta').textContent
      };
    }''')
    assert chen_view['active'] and chen_view['id'] == 'teacher_chen'
    assert chen_view['src'] == chen_view['expected']
    assert chen_view['name'] == '陳冠瑋老師'
    assert chen_view['meta'] == '身分｜香草服務隊老師'
    page.locator('#member-portrait-viewer-close').click()
    assert not page.evaluate("document.getElementById('member-portrait-viewer').classList.contains('active')")
    assert page.evaluate("!document.getElementById('member-portrait-viewer').contains(document.activeElement)")

    response_cases = page.evaluate('''() => Object.entries(STORY_DATA.nodes)
      .flatMap(([nodeId,node]) => (node.choices || []).map((choice,index) => ({nodeId,index,id:choice.id,hasResponse:Boolean(choice.response)})))
      .filter(item => item.hasResponse)''')
    assert response_cases, 'No choice.response cases found'
    assert sum(1 for case in response_cases if case['nodeId'] == 'scene14_02') == 3, response_cases

    for case in response_cases:
        page.evaluate('''({nodeId}) => {
          const e = window.gameEngine;
          e.dom.playerPanel.classList.remove('active');
          e.loadNode(nodeId, {skipHistory:true});
          e.finishTyping(STORY_DATA.nodes[nodeId]);
        }''', {"nodeId": case['nodeId']})
        buttons = page.locator('.choice-btn')
        assert buttons.count() > case['index']
        buttons.nth(case['index']).click()
        page.wait_for_timeout(430)
        result = page.evaluate('''() => ({
          nodeId: window.gameEngine.currentNodeId,
          type: STORY_DATA.nodes[window.gameEngine.currentNodeId]?.type,
          activeClass: document.activeElement?.className || ''
        })''')
        assert result['nodeId'].startswith('_tempResponse_'), (case, result)
        assert result['type'] == 'dialogue', (case, result)
        assert 'choice-btn' not in result['activeClass'], (case, result)

    scene14_results = []
    expected_next = {0:'scene14_wrong', 1:'scene14_correct_xu', 2:'scene14_c_wrong'}
    for index in range(3):
        page.evaluate('''() => {
          const e = window.gameEngine;
          e.loadNode('scene14_02', {skipHistory:true});
          e.finishTyping(STORY_DATA.nodes.scene14_02);
        }''')
        page.locator('.choice-btn').nth(index).click()
        page.wait_for_timeout(430)
        page.wait_for_function('!window.gameEngine.isTyping')
        assert page.evaluate("document.activeElement?.classList?.contains('choice-btn') || false") is False
        page.keyboard.press('Space')
        page.wait_for_timeout(80)
        after_space = page.evaluate('window.gameEngine.currentNodeId')
        assert after_space == expected_next[index], (index, after_space)
        returned = None
        if index in (0, 2):
            page.evaluate('''() => {
              const e = window.gameEngine;
              e.finishTyping(STORY_DATA.nodes[e.currentNodeId]);
            }''')
            page.keyboard.press('Space')
            page.wait_for_timeout(80)
            assert page.evaluate('window.gameEngine.currentNodeId') == 'scene14_02'
            page.evaluate("window.gameEngine.finishTyping(STORY_DATA.nodes.scene14_02)")
            returned = page.evaluate('window.gameEngine.isShowingChoices')
            assert returned is True
        scene14_results.append({"choice": 'ABC'[index], "next": after_space, "returnedChoices": returned})

    browser.close()

assert not errors, errors
print('CHOICE_VIEWER_OK=' + json.dumps({
    'xiaolin': xiaolin_view,
    'chen': chen_view,
    'responseCases': len(response_cases),
    'responseCaseIds': response_cases,
    'scene14': scene14_results,
    'pageErrors': errors,
}, ensure_ascii=False))
