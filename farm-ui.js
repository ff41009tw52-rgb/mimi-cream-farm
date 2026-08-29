(() => {
  'use strict';

  const HOME_BUTTON_ID = 'farm-home-button';
  const HOME_SELECTOR = 'a[href], button[onclick], [role="button"][onclick]';
  const state = { observer: null };

  const getHomeUrl = () => new URL('index.html', document.baseURI);

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
    button.dataset.position = position === 'right' ? 'right' : 'left';
    button.setAttribute('aria-label', ariaLabel);
    button.querySelector('.farm-ui-home-label').textContent = label;
    return button;
  };

  const observeLateRenderedControls = () => {
    if (state.observer || typeof MutationObserver === 'undefined') return;

    state.observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => removeLegacyHomeControls(node));
      });
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
  };

  const init = (options = {}) => {
    const button = mountHomeButton(options);
    observeLateRenderedControls();
    return button;
  };

  const destroy = () => {
    state.observer?.disconnect();
    state.observer = null;
    document.getElementById(HOME_BUTTON_ID)?.remove();
  };

  window.FarmUI = Object.freeze({
    version: '0.1.0',
    init,
    mountHomeButton,
    removeLegacyHomeControls,
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
