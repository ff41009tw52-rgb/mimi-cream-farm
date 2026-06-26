(() => {
  const buttonId = 'farm-home-button';
  const styleId = 'farm-home-button-style';

  const homeUrl = new URL('index.html', document.baseURI);
  const homeOnRight = document.body?.dataset.farmHomePosition === 'right';
  const isFarmHomeUrl = (value) => {
    if (!value) return false;
    try {
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
    if (element.id === buttonId) return false;

    if (element.matches('a[href]') && isFarmHomeUrl(element.getAttribute('href'))) {
      return true;
    }

    const label = `${element.textContent || ''} ${element.getAttribute('aria-label') || ''}`
      .replace(/\s+/g, '');
    const action = `${element.getAttribute('onclick') || ''} ${element.getAttribute('data-href') || ''}`;
    return /回.*(農場|首頁)|農場.*首頁/.test(label) && /index\.html|location\.href|window\.location/.test(action);
  };

  const removeLegacyHomeControls = () => {
    document.querySelectorAll('a[href], button[onclick], [role="button"][onclick]').forEach((element) => {
      if (isLegacyHomeControl(element)) element.remove();
    });
  };

  removeLegacyHomeControls();
  document.getElementById(buttonId)?.remove();

  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #${buttonId} {
        position: fixed;
        top: 16px;
        ${homeOnRight ? 'right: 16px; left: auto;' : 'left: 16px; right: auto;'}
        z-index: 2147483647;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 48px;
        padding: 10px 20px;
        box-sizing: border-box;
        border: 3px solid #FFFFFF;
        border-radius: 999px;
        background: linear-gradient(180deg, #FFA66B 0%, #FF8C42 100%);
        color: #FFFFFF;
        box-shadow: 0 5px 12px rgba(76, 45, 25, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.38);
        font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
        font-size: 18px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: 0.5px;
        text-decoration: none;
        text-shadow: 0 1px 1px rgba(110, 53, 16, 0.3);
        transition: transform 0.18s ease, filter 0.18s ease;
      }
      #${buttonId}:hover {
        filter: brightness(1.05);
        transform: translateY(-2px);
      }
      #${buttonId}:active {
        transform: translateY(1px) scale(0.98);
      }
      #${buttonId}:focus-visible {
        outline: 4px solid #2D7A2D;
        outline-offset: 3px;
      }
      #${buttonId} .farm-home-paw {
        font-size: 20px;
        line-height: 1;
        filter: saturate(0.85);
      }
      @media (max-width: 600px) {
        #${buttonId} {
          top: 10px;
          ${homeOnRight ? 'right: 10px; left: auto;' : 'left: 10px; right: auto;'}
          min-height: 44px;
          padding: 9px 16px;
          font-size: 16px;
        }
        #${buttonId} .farm-home-paw { font-size: 18px; }
      }
    `;
    document.head.appendChild(style);
  }

  const button = document.createElement('a');
  button.id = buttonId;
  button.href = 'index.html';
  button.setAttribute('aria-label', '回農場首頁');
  button.innerHTML = '<span class="farm-home-paw" aria-hidden="true">🐾</span><span>回農場</span>';
  document.body.appendChild(button);

  // Some React pages may render their old navigation after this script runs.
  // Watch briefly and remove only duplicate links that return to index.html.
  const observer = new MutationObserver(() => removeLegacyHomeControls());
  observer.observe(document.body, { childList: true, subtree: true });
})();
