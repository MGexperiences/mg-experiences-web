(function(){
  const fab = document.getElementById('floatingBudgetBtn');
  const config = document.getElementById('tu-experiencia');
  if (!fab) return;
  
  // Show FAB once user scrolls past 60% of viewport height
  function checkVisibility(){
    const scrolled = window.scrollY;
    const threshold = window.innerHeight * 0.6;
    
    // Check if configurator is in view
    const configInView = config ? (() => {
      const r = config.getBoundingClientRect();
      return r.top < window.innerHeight * 0.8 && r.bottom > window.innerHeight * 0.2;
    })() : false;
    
    if (scrolled > threshold && !configInView) {
      fab.classList.add('visible');
      fab.classList.remove('in-config');
    } else if (configInView) {
      fab.classList.add('in-config');
    } else {
      fab.classList.remove('visible');
      fab.classList.remove('in-config');
    }
  }
  
  window.addEventListener('scroll', checkVisibility, {passive:true});
  window.addEventListener('resize', checkVisibility);
  checkVisibility();
})();
