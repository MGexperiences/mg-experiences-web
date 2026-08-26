  const valBtn    = document.getElementById('val-btn');
  const valTip    = document.getElementById('val-tip');
  const valDrawer = document.getElementById('val-drawer');
  const valIframe = document.getElementById('val-iframe');
  let valLoaded   = false;
  let tipTimer;

  // Show tooltip on hover (desktop)
  valBtn.addEventListener('mouseenter', () => {
    tipTimer = setTimeout(() => valTip.classList.add('show'), 400);
  });
  valBtn.addEventListener('mouseleave', () => {
    clearTimeout(tipTimer);
    valTip.classList.remove('show');
  });

  // Show tooltip briefly on page load (after 3s)
  setTimeout(() => {
    valTip.classList.add('show');
    setTimeout(() => valTip.classList.remove('show'), 3500);
  }, 3000);

  window.openAsistente = function openAsistente() {
    valTip.classList.remove('show');
    // Load iframe only once
    if (!valLoaded) {
      valIframe.src = 'https://bot.mg-experiences.com/';
      valLoaded = true;
    }
    valDrawer.classList.add('open');
    valBtn.style.display = 'none';
    document.body.style.overflow = '';
  }

  window.closeAsistente = function closeAsistente() {
    valDrawer.classList.remove('open');
    valBtn.style.display = 'flex';
  }

  window.minimizeAsistente = function minimizeAsistente() {
    valDrawer.classList.remove('open');
    valBtn.style.display = 'flex';
    // Keep iframe loaded for quick reopen
  }

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && valDrawer.classList.contains('open')) closeAsistente();
  });
