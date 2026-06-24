(() => {
  const buttonId = 'farm-home-button';
  if (document.getElementById(buttonId)) return;

  const hasExistingHomeLink = Array.from(document.querySelectorAll('a[href]')).some((link) => {
    const destination = new URL(link.getAttribute('href'), window.location.href);
    const label = (link.textContent || '').replace(/\s+/g, '');
    return destination.pathname.endsWith('/index.html') && /回到?農場首頁/.test(label);
  });
  if (hasExistingHomeLink) return;

  const style = document.createElement('style');
  style.textContent = `
    #${buttonId} {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 16px;
      border: 3px solid #FFFFFF;
      border-radius: 999px;
      background: #FF8C42;
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24);
      font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      text-decoration: none;
      transition: transform 0.18s ease, background-color 0.18s ease;
    }
    #${buttonId}:hover { background: #E8752E; transform: translateY(-2px); }
    #${buttonId}:focus-visible { outline: 4px solid #2D7A2D; outline-offset: 3px; }
    @media (max-width: 600px) {
      #${buttonId} { top: 8px; right: 8px; padding: 10px 13px; font-size: 14px; }
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement('a');
  button.id = buttonId;
  button.href = 'index.html';
  button.setAttribute('aria-label', '回到農場首頁');
  button.innerHTML = '<span aria-hidden="true">🏡</span><span>回到農場首頁</span>';
  document.body.appendChild(button);
})();
