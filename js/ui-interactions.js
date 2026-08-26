// ── NAV
const nav=document.getElementById('nav');
window.addEventListener('scroll',()=>nav.classList.toggle('solid',scrollY>80));

// ── REVEAL
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.1});
document.querySelectorAll('.rv').forEach(el=>obs.observe(el));

// ── SERVICE CARDS DRAG (removed with servicios section)

// ── COUNTER ANIMATION
function animateCounter(el) {
  const target = parseInt(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();
  const ease = t => t < .5 ? 2*t*t : -1+(4-2*t)*t;
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(ease(p) * target) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(step);
}
// Trigger counters when band comes into view
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('[data-count]').forEach(animateCounter);
      counterObs.unobserve(e.target);
    }
  });
}, { threshold: 0.4 });
const band = document.querySelector('.band');
if (band) counterObs.observe(band);

// ── PARALLAX ON HERO
(function(){
  const hbg = document.querySelector('.hbg');
  if (!hbg) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        hbg.style.transform = `scale(1.06) translateY(${y * 0.25}px)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

// ── SCROLL TO TOP BUTTON
(function(){
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.style.opacity = window.scrollY > 600 ? '1' : '0';
    btn.style.pointerEvents = window.scrollY > 600 ? 'all' : 'none';
  }, { passive: true });
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
})();


// ── CAROUSEL FUNCTIONS ──
let carouselState = { activeZone: 'marina' };

// ═══════════════════════════════════════════════════════════════
// CASA DE CAMPO EDITORIAL — Scroll sync & navigation
// ═══════════════════════════════════════════════════════════════
function cdcScrollTo(zoneId) {
  const el = document.getElementById(zoneId);
  if (!el) return;
  
  // Smooth scroll with offset for fixed nav
  const navHeight = 80;
  const top = el.getBoundingClientRect().top + window.pageYOffset - navHeight;
  window.scrollTo({ top, behavior: 'smooth' });
  
  // Update progress indicators
  document.querySelectorAll('.cdc-prog-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === zoneId);
  });
}

function scrollToZoneSmooth(zoneId) { cdcScrollTo(zoneId); }
function selectZone(zoneId) { cdcScrollTo(zoneId); }
function carouselShift(dir) { /* legacy noop */ }

// ═══════════════════════════════════════════════════════════════
// PROGRESSIVE SCROLL TRACKING — Progress bar fills as user scrolls
// ═══════════════════════════════════════════════════════════════
(function(){
  const zones = ['marina', 'minitas', 'chavon'];
  let zoneEls = [];
  let progressFills = [];
  let progressItems = [];
  let ticking = false;
  
  function init() {
    zoneEls = zones.map(z => document.getElementById(z)).filter(Boolean);
    progressFills = document.querySelectorAll('.cdc-prog-fill');
    progressItems = document.querySelectorAll('.cdc-prog-item');
    if (zoneEls.length === 0) return;
    
    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateProgress);
  }
  
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
      });
      ticking = true;
    }
  }
  
  function updateProgress() {
    if (zoneEls.length < 3) return;
    
    const viewportCenter = window.innerHeight / 2;
    let activeIdx = 0;
    
    // Find which zone is most centered in viewport
    zoneEls.forEach((zone, idx) => {
      const rect = zone.getBoundingClientRect();
      if (rect.top < viewportCenter && rect.bottom > viewportCenter * 0.5) {
        activeIdx = idx;
      }
    });
    
    // Update active button
    progressItems.forEach((btn, i) => {
      btn.classList.toggle('active', i === activeIdx);
    });
    
    // Calculate fill progress between zones
    // Fill 0 = between Marina (0) and Minitas (1)
    // Fill 1 = between Minitas (1) and Chavón (2)
    
    progressFills.forEach((fill, fillIdx) => {
      const fromZone = zoneEls[fillIdx];
      const toZone = zoneEls[fillIdx + 1];
      if (!fromZone || !toZone) return;
      
      const fromRect = fromZone.getBoundingClientRect();
      const toRect = toZone.getBoundingClientRect();
      
      // Distance from start of fromZone to start of toZone
      const totalDistance = toRect.top - fromRect.top;
      // How far we've scrolled past fromZone
      const scrolledPast = viewportCenter - fromRect.top;
      
      let progress = 0;
      if (scrolledPast > 0 && totalDistance > 0) {
        progress = Math.min(1, Math.max(0, scrolledPast / totalDistance));
      } else if (scrolledPast >= totalDistance) {
        progress = 1;
      }
      
      fill.style.transform = `scaleX(${progress})`;
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

function scrollToZone(id, btn) {
  document.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// Highlight correct tab on scroll
(function(){
  const zones = ['marina','minitas','chavon'];
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        document.querySelectorAll('.rtab').forEach((b,i) => b.classList.toggle('active', zones[i] === id));
      }
    });
  }, { threshold: 0.3 });
  zones.forEach(id => { const el = document.getElementById(id); if(el) obs.observe(el); });
})();

// ── SMOOTH SCROLL
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const t=document.querySelector(a.getAttribute('href'));
    if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'})}
  });
});

// ── FORMS
async function onSend(e){
  e.preventDefault();
  const b=document.getElementById('subBtn');
  const form=e.target;
  const inputs=form.querySelectorAll('input,select,textarea');
  const nombre=inputs[0].value.trim();
  const apellido=inputs[1].value.trim();
  const email=inputs[2].value.trim();
  const interes=inputs[3].value;
  const llegada=inputs[4].value;
  const salida=inputs[5].value;
  const mensaje=inputs[6].value.trim();
  if(!nombre||!email){alert('Por favor completá al menos tu nombre y email.');return;}
  b.textContent='Enviando…';b.disabled=true;
  try{
    const params=new URLSearchParams({action:'contacto',nombre:nombre+' '+apellido,email,interes,llegada,salida,mensaje});
    await fetch(APPS_SCRIPT_URL+'?'+params.toString(),{method:'GET',mode:'no-cors'});
    b.textContent='✓ Enviado';b.style.background='#1D4D3A';b.style.color='#D4B89A';
    form.reset();
    setTimeout(()=>{b.textContent='Enviar →';b.style.background='';b.style.color='';b.disabled=false;},5000);
  }catch(err){
    b.textContent='Error — intentá de nuevo';b.disabled=false;
    setTimeout(()=>{b.textContent='Enviar →';},3000);
  }
}
function onNl(e){e.preventDefault();const b=document.getElementById('nlBtn');b.textContent='✓ Listo';setTimeout(()=>{b.textContent='Me apunto'},3000)}
