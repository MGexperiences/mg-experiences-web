// ══════════════════════════════════════════════════════
// VILLA GALLERY FULLSCREEN LIGHTBOX
// ══════════════════════════════════════════════════════

let _galleryFotos = [];
let _galleryCur   = 0;
const DRIVE_KEY_GALLERY = 'AIzaSyAe9IVx4R47OJlV9nkI2PLSdEBbdZclnuc';

window.openVillaGallery = async function openVillaGallery(villaId, villaName, carpetaUrl, fotoUrl) {
  const lb = document.getElementById('gallery-lb');
  const title = document.getElementById('gallery-lb-title');
  const img = document.getElementById('gallery-lb-img');
  const spinner = document.getElementById('gallery-lb-loading-spinner');
  const thumbs = document.getElementById('gallery-lb-thumbs');
  const counter = document.getElementById('gallery-lb-counter');

  // Show lightbox immediately
  lb.style.display = 'flex';
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';
  title.textContent = villaName;
  img.style.opacity = '0';
  spinner.classList.add('show');
  thumbs.innerHTML = '';
  counter.textContent = 'Cargando...';

  _galleryFotos = [];
  _galleryCur = 0;

  // Try to load from Drive folder
  const folderId = _extractFolderId(carpetaUrl);
  if (folderId) {
    try {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name)&orderBy=name&pageSize=50&key=${DRIVE_KEY_GALLERY}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        _galleryFotos = data.files.map(f => ({
          url: `https://drive.google.com/thumbnail?id=${f.id}&sz=w1600`,
          thumb: `https://drive.google.com/thumbnail?id=${f.id}&sz=w200`,
          name: f.name,
        }));
      }
    } catch(e) { console.warn('Gallery Drive error:', e); }
  }

  // Fallback: use portada if no folder photos
  if (_galleryFotos.length === 0 && fotoUrl) {
    _galleryFotos = [{ url: fotoUrl, thumb: fotoUrl, name: villaName }];
  }

  if (_galleryFotos.length === 0) {
    spinner.classList.remove('show');
    counter.textContent = 'Sin fotos disponibles';
    return;
  }

  _galleryRenderThumbs();
  _galleryShowImg(0);
}

function _extractFolderId(url) {
  if (!url) return null;
  // formats: /folders/ID, /drive/folders/ID, ?id=ID
  const m = url.match(/folders\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return m2[1];
  // If it's already a folder ID (no slashes)
  if (url.match(/^[a-zA-Z0-9_-]{20,}$/)) return url;
  return null;
}

function _galleryShowImg(idx) {
  const img = document.getElementById('gallery-lb-img');
  const counter = document.getElementById('gallery-lb-counter');
  const spinner = document.getElementById('gallery-lb-loading-spinner');
  const thumbs = document.getElementById('gallery-lb-thumbs');

  if (!_galleryFotos[idx]) return;
  _galleryCur = idx;

  img.style.opacity = '0';
  spinner.classList.add('show');

  const newImg = new Image();
  newImg.onload = () => {
    img.src = newImg.src;
    img.style.opacity = '1';
    spinner.classList.remove('show');
  };
  newImg.onerror = () => {
    img.style.opacity = '1';
    spinner.classList.remove('show');
  };
  newImg.src = _galleryFotos[idx].url;

  // Update counter
  const prev = document.getElementById('gallery-lb-prev');
  const next = document.getElementById('gallery-lb-next');
  counter.textContent = (_galleryCur + 1) + ' / ' + _galleryFotos.length;
  prev.style.display = _galleryFotos.length > 1 ? '' : 'none';
  next.style.display = _galleryFotos.length > 1 ? '' : 'none';

  // Update active thumb
  thumbs.querySelectorAll('.gallery-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });

  // Scroll thumb into view
  const activeThumb = thumbs.querySelector('.gallery-thumb.active');
  if (activeThumb) activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function _galleryRenderThumbs() {
  const thumbs = document.getElementById('gallery-lb-thumbs');
  thumbs.innerHTML = _galleryFotos.map((f, i) => `
    <img class="gallery-thumb ${i === 0 ? 'active' : ''}" 
         src="${f.thumb}" 
         alt="foto ${i+1}"
         loading="lazy"
         onclick="galleryLbNav(${i} - _galleryCur)"
         title="${f.name || ''}">
  `).join('');

  // Hide thumbs strip if only 1 photo
  thumbs.style.display = _galleryFotos.length > 1 ? '' : 'none';
}

window.galleryLbNav = function galleryLbNav(dir) {
  const next = (_galleryCur + dir + _galleryFotos.length) % _galleryFotos.length;
  _galleryShowImg(next);
}

window.closeGalleryLb = function closeGalleryLb() {
  const _lb = document.getElementById('gallery-lb');
  _lb.classList.remove('active');
  _lb.style.display = 'none';
  document.body.style.overflow = '';
  _galleryFotos = [];
}

// Keyboard navigation
document.addEventListener('keydown', e => {
  const lb = document.getElementById('gallery-lb');
  if (!lb || !lb.classList.contains('active')) return;
  if (e.key === 'Escape') closeGalleryLb();
  if (e.key === 'ArrowRight') galleryLbNav(1);
  if (e.key === 'ArrowLeft')  galleryLbNav(-1);
});

// Touch swipe
let _galTouchX = 0;
document.getElementById('gallery-lb')?.addEventListener('touchstart', e => {
  _galTouchX = e.touches[0].clientX;
}, { passive: true });
document.getElementById('gallery-lb')?.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - _galTouchX;
  if (Math.abs(dx) > 50) galleryLbNav(dx < 0 ? 1 : -1);
});



// ── MOBILE NAV ───────────────────────────────────────
window.toggleMobileNav = function toggleMobileNav() {
  const overlay = document.getElementById('mobile-nav-overlay');
  const hamburger = document.getElementById('nav-hamburger');
  if (!overlay) return;
  const isOpen = overlay.style.display !== 'flex';
  overlay.style.display = isOpen ? 'flex' : 'none';
  document.body.style.overflow = isOpen ? 'hidden' : '';
  if (hamburger) {
    const spans = hamburger.querySelectorAll('span');
    if (isOpen) {
      if(spans[0]) spans[0].style.transform = 'translateY(7px) rotate(45deg)';
      if(spans[1]) spans[1].style.opacity = '0';
      if(spans[2]) spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
      spans.forEach(s => { s.style.transform=''; s.style.opacity=''; });
    }
  }
}

// ── SHOW HAMBURGER ON MOBILE ─────────────────────────
window.checkMobileNav = function checkMobileNav() {
  const hamburger = document.getElementById('nav-hamburger');
  if (hamburger) hamburger.style.display = window.innerWidth <= 520 ? 'flex' : 'none';
}
window.checkMobileNav();
window.addEventListener('resize', window.checkMobileNav);

// ── CLOSE MOBILE NAV ON ESCAPE ───────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('mobile-nav-overlay');
    if (overlay && overlay.classList.contains('open')) toggleMobileNav();
  }
});

// ── MOBILE: MAKE ACT CARDS TAPPABLE (show info) ──────
if ('ontouchstart' in window) {
  document.querySelectorAll('.act-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.querySelector('.act-name')?.textContent || '';
      const tooltip = card.querySelector('.act-tooltip');
      if (!tooltip) return;
      // Build a simple bottom sheet
      const existing = document.getElementById('act-mobile-sheet');
      if (existing) existing.remove();
      const sheet = document.createElement('div');
      sheet.id = 'act-mobile-sheet';
      sheet.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9000;background:rgba(18,20,16,.98);border:.5px solid rgba(174,133,96,.3);border-bottom:none;border-radius:16px 16px 0 0;padding:1.8rem 1.4rem;transform:translateY(100%);transition:transform .3s cubic-bezier(.22,1,.36,1)';
      sheet.innerHTML = tooltip.innerHTML + '<button onclick="document.getElementById(\'act-mobile-sheet\').remove()" style="position:absolute;top:1rem;right:1rem;background:none;border:none;color:rgba(253,250,246,.5);font-size:1.3rem;cursor:pointer">×</button>';
      document.body.appendChild(sheet);
      requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
      // Close on outside tap
      sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
    });
  });
}
