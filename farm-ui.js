(() => {
  'use strict';

  const HOME_BUTTON_ID = 'farm-home-button';
  const MOBILE_FIX_STYLE_ID = 'farm-ui-mobile-fixes';
  const HOME_SELECTOR = 'a[href], button[onclick], [role="button"][onclick]';
  const HOME_POSITIONS = new Set(['left', 'center', 'right']);
  const state = { observer: null };

  const getHomeUrl = () => new URL('index.html', document.baseURI);
  const getPageName = () => (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const isFarmHomeUrl = (value) => {
    if (!value) return false;

    try {
      const homeUrl = getHomeUrl();
      const destination = new URL(value, document.baseURI);
      const homeDirectory = homeUrl.pathname.replace(/index\.html$/i, '');
      return destination.origin === homeUrl.origin && (
        destination.pathname === homeUrl.pathname ||
        destination.pathname === homeDirectory
      );
    } catch {
      return false;
    }
  };

  const isLegacyHomeControl = (element) => {
    if (element.id === HOME_BUTTON_ID) return false;

    if (element.matches('a[href]') && isFarmHomeUrl(element.getAttribute('href'))) {
      return true;
    }

    const label = `${element.textContent || ''} ${element.getAttribute('aria-label') || ''}`
      .replace(/\s+/g, '');
    const action = `${element.getAttribute('onclick') || ''} ${element.getAttribute('data-href') || ''}`;
    return /回.*(農場|首頁)|農場.*首頁/.test(label) &&
      /index\.html|location\.href|window\.location/.test(action);
  };

  const removeLegacyHomeControls = (root = document) => {
    const candidates = [];
    if (root.matches?.(HOME_SELECTOR)) candidates.push(root);
    if (root.querySelectorAll) candidates.push(...root.querySelectorAll(HOME_SELECTOR));

    candidates.forEach((element) => {
      if (isLegacyHomeControl(element)) element.remove();
    });
  };

  const syncHomeVisibility = () => {
    const button = document.getElementById(HOME_BUTTON_ID);
    if (!button || !document.body) return;

    const hidden = document.body.dataset.farmHomeHidden === 'true';
    button.hidden = hidden;
    button.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    if (hidden) button.setAttribute('tabindex', '-1');
    else button.removeAttribute('tabindex');
  };

  const mountHomeButton = (options = {}) => {
    if (!document.body) return null;

    removeLegacyHomeControls();

    const position = options.position ||
      document.body.dataset.farmHomePosition ||
      'left';
    const label = options.label || '回農場';
    const ariaLabel = options.ariaLabel || '回農場首頁';

    let button = document.getElementById(HOME_BUTTON_ID);
    if (!button) {
      button = document.createElement('a');
      button.id = HOME_BUTTON_ID;
      button.className = 'farm-ui-home-button';
      document.body.appendChild(button);
    }

    let text = button.querySelector('.farm-ui-home-label');
    if (!text) {
      button.replaceChildren();

      const paw = document.createElement('span');
      paw.className = 'farm-ui-home-paw';
      paw.setAttribute('aria-hidden', 'true');
      paw.textContent = '🐾';

      text = document.createElement('span');
      text.className = 'farm-ui-home-label';
      button.append(paw, text);
    }

    button.href = getHomeUrl().href;
    button.target = '_top';
    button.dataset.position = HOME_POSITIONS.has(position) ? position : 'left';
    button.setAttribute('aria-label', ariaLabel);
    button.querySelector('.farm-ui-home-label').textContent = label;
    syncHomeVisibility();
    return button;
  };

  const installMobileFixes = () => {
    if (!document.head || document.getElementById(MOBILE_FIX_STYLE_ID)) return;

    const page = getPageName();
    const rules = {
      '04.html': `
        @media (max-width: 700px) {
          body { min-height: 100svh !important; height: auto !important; overflow-y: auto !important; padding: 0 10px 24px !important; box-sizing: border-box !important; }
          h1 { margin: 70px 0 8px !important; font-size: 1.4rem !important; text-align: center !important; }
          .instructions { margin: 0 0 10px !important; padding: 8px 12px !important; font-size: .88rem !important; }
          .controls { flex-wrap: wrap !important; justify-content: center !important; gap: 8px !important; margin-bottom: 8px !important; }
          .toggle-btn { min-height: 44px !important; padding: 8px 12px !important; }
          .lab-area { width: 100% !important; max-width: 430px !important; height: auto !important; min-height: 650px !important; justify-content: flex-start !important; position: relative !important; }
          .dropper-bottle { top: 115px !important; left: 50% !important; }
          .bottle-label-text { left: 20px !important; font-size: 12px !important; }
          .beakers-container { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 18px 10px !important; width: min(100%, 300px) !important; padding: 270px 0 24px !important; margin: 0 auto !important; align-items: end !important; }
          .beaker-wrapper { width: 100% !important; min-width: 0 !important; }
          .beaker { width: 62px !important; height: 88px !important; }
          .beaker-label { width: auto !important; min-width: 70px !important; font-size: 12px !important; }
        }
      `,
      '05.html': `
        @media (max-width: 700px) {
          body { height: auto !important; min-height: 100svh !important; overflow-x: hidden !important; overflow-y: auto !important; touch-action: pan-y !important; }
          #ui-container { position: relative !important; top: auto !important; left: auto !important; width: calc(100% - 24px) !important; margin: 68px 12px 8px !important; padding: 12px !important; box-sizing: border-box !important; }
          canvas { display: block !important; width: 100% !important; height: 430px !important; min-height: 430px !important; touch-action: none !important; }
          #dialogue-area { position: relative !important; left: auto !important; bottom: auto !important; transform: none !important; width: 100% !important; margin: 0 auto 12px !important; padding: 8px !important; box-sizing: border-box !important; }
          .bubble-box { min-width: 0 !important; }
        }
      `,
      '07.html': `
        @media (max-width: 700px) {
          body { min-height: 100svh !important; height: auto !important; overflow-y: auto !important; align-items: stretch !important; }
          .dashboard-07 { margin: 66px 12px 6px !important; width: calc(100% - 24px) !important; grid-template-columns: repeat(2, minmax(0,1fr)) !important; box-sizing: border-box !important; }
          .main-container { min-height: 0 !important; height: auto !important; gap: 4px !important; padding-bottom: 20px !important; }
          .left-panel { width: calc(100% - 24px) !important; gap: 6px !important; }
          .stage { height: 365px !important; transform: scale(.76) !important; transform-origin: top center !important; margin-bottom: -70px !important; }
          .mission-box { padding: 10px 12px !important; }
        }
      `,
      '08.html': `
        @media (max-width: 700px) {
          html, body { min-height: 100%; }
          body { overflow-x: hidden !important; overflow-y: auto !important; touch-action: pan-y !important; }
          #root > div { min-height: 100svh !important; overflow: visible !important; }
          .circuit-header { margin-top: 64px !important; position: relative !important; }
          .circuit-toolbar { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .circuit-toolbar .power-button { grid-column: 1 / -1 !important; }
          .circuit-status { margin: 6px 10px !important; max-width: calc(100% - 20px) !important; box-sizing: border-box !important; }
          #root .relative.w-full.flex-grow { min-height: 520px !important; flex-grow: 0 !important; overflow: hidden !important; touch-action: none !important; }
          .guided-card-08 { position: relative !important; left: auto !important; bottom: auto !important; width: calc(100% - 20px) !important; max-height: none !important; margin: 8px 10px 18px !important; overflow: visible !important; box-sizing: border-box !important; }
        }
      `,
      '09.html': `
        @media (max-width: 700px) {
          body { width: 100% !important; min-height: 100svh !important; height: auto !important; overflow: auto !important; justify-content: flex-start !important; touch-action: none !important; }
          #game-container { width: 100vw !important; max-width: 100vw !important; height: min(720px, 100svh) !important; max-height: none !important; border-radius: 0 !important; box-shadow: none !important; }
          .hud-top { padding: 10px !important; gap: 6px !important; }
          .stat-box { padding: 6px 10px !important; font-size: 14px !important; border-radius: 18px !important; }
          .mission-container { top: 58px !important; }
          #current-mission { max-width: calc(100% - 28px) !important; box-sizing: border-box !important; padding: 7px 14px !important; border-width: 4px !important; font-size: 18px !important; line-height: 1.2 !important; }
          .mission-label { font-size: 11px !important; }
          #badge-tracker { top: 118px !important; gap: 4px !important; padding: 0 8px !important; box-sizing: border-box !important; }
          .badge-chip { font-size: 11px !important; padding: 4px 8px !important; }
          .overlay-screen { padding: 12px !important; box-sizing: border-box !important; overflow-y: auto !important; justify-content: flex-start !important; padding-top: 72px !important; }
          .overlay-screen h1, h1 { font-size: 28px !important; margin: 4px 0 8px !important; }
          .overlay-screen p, p { font-size: 15px !important; line-height: 1.45 !important; margin: 6px 0 !important; }
          .legend { margin: 8px 0 !important; padding: 10px !important; font-size: 14px !important; }
          button { min-height: 44px !important; margin-top: 10px !important; padding: 10px 26px !important; font-size: 18px !important; }
          #result-title { font-size: 30px !important; margin-bottom: 8px !important; }
          #final-score { font-size: 46px !important; margin: 6px 0 !important; }
          #result-msg { width: calc(100% - 28px) !important; box-sizing: border-box !important; padding: 12px !important; font-size: 15px !important; line-height: 1.5 !important; }
        }
      `,
      '17.html': `
        @media (max-width: 700px) {
          html, body, #root { min-height: 100%; }
          body { overflow-x: hidden !important; overflow-y: auto !important; touch-action: pan-y !important; }
          #root > div { min-height: 100svh !important; height: auto !important; overflow: visible !important; padding-top: 68px !important; }
          #root .fixed.inset-0 { overflow-y: auto !important; align-items: flex-start !important; padding-top: 68px !important; touch-action: pan-y !important; }
          [data-zone] { touch-action: none !important; }
        }
      `
    };

    const css = rules[page];
    if (!css) return;

    const style = document.createElement('style');
    style.id = MOBILE_FIX_STYLE_ID;
    style.dataset.page = page;
    style.textContent = css;
    document.head.appendChild(style);
  };

  const observeLateRenderedControls = () => {
    if (state.observer || typeof MutationObserver === 'undefined') return;

    state.observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === 'attributes') {
          syncHomeVisibility();
          return;
        }
        record.addedNodes.forEach((node) => removeLegacyHomeControls(node));
      });
      syncHomeVisibility();
    });
    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-farm-home-hidden']
    });
  };

  const init = (options = {}) => {
    installMobileFixes();
    const button = mountHomeButton(options);
    observeLateRenderedControls();
    syncHomeVisibility();
    return button;
  };

  const destroy = () => {
    state.observer?.disconnect();
    state.observer = null;
    document.getElementById(HOME_BUTTON_ID)?.remove();
    document.getElementById(MOBILE_FIX_STYLE_ID)?.remove();
  };

  window.FarmUI = Object.freeze({
    version: '0.4.0',
    init,
    mountHomeButton,
    removeLegacyHomeControls,
    syncHomeVisibility,
    installMobileFixes,
    destroy
  });

  const autoInit = () => {
    if (document.body?.dataset.farmUiAuto === 'false') return;
    init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit, { once: true });
  } else {
    autoInit();
  }
})();
