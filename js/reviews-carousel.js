// ── REVIEWS CAROUSEL
let revIdx = 0;
const revTotal = 5;
function getRevVisible() {
  return window.innerWidth <= 900 ? 1 : (window.innerWidth <= 1200 ? 2 : 3);
}
function goRev(n) {
  const visible = getRevVisible();
  const max = revTotal - visible;
  revIdx = Math.max(0, Math.min(n, max));
  const track = document.getElementById('revTrack');
  if (!track) return;
  const card = track.querySelector('.rev-card');
  if (!card) return;
  const gap = 24;
  const cardW = card.offsetWidth + gap;
  track.style.transform = `translateX(-${revIdx * cardW}px)`;
  document.querySelectorAll('.rev-dot').forEach((d,i) => d.classList.toggle('active', i === revIdx));
}
function shiftRev(dir) { goRev(revIdx + dir); }
// Auto-advance
let revTimer = setInterval(() => shiftRev(1), 5000);
document.getElementById('revTrack')?.addEventListener('mouseenter', () => clearInterval(revTimer));
document.getElementById('revTrack')?.addEventListener('mouseleave', () => { revTimer = setInterval(() => shiftRev(1), 5000); });
// Touch swipe
(function(){
  const el = document.getElementById('revTrack');
  if (!el) return;
  let startX = 0;
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive:true});
  el.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) shiftRev(diff > 0 ? 1 : -1);
  }, {passive:true});
})();


function setupScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => {
    if(!el.classList.contains('visible')) io.observe(el);
  });
}
document.addEventListener('DOMContentLoaded', setupScrollReveal);
