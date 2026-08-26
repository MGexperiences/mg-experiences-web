// ── LIGHTBOX ─────────────────────────────────────────
let lbImages = [], lbIdx = 0;

function buildLightboxSet(clickedEl, caption) {
  // Collect all gallery images on the page
  const all = Array.from(document.querySelectorAll('.cdc-img, .vi'));
  lbImages = all.map(el => ({ src: el.src || el.currentSrc, caption: el.alt || '' }));
  lbIdx = lbImages.findIndex(x => x.src === (clickedEl.src || clickedEl.currentSrc));
  if (lbIdx < 0) {
    lbImages = [{ src: clickedEl.src || clickedEl.currentSrc, caption: caption || clickedEl.alt || '' }];
    lbIdx = 0;
  }
}

function openLightbox(el, caption) {
  buildLightboxSet(el, caption);
  const overlay = document.getElementById('lb-overlay');
  const img = document.getElementById('lb-img');
  const cap = document.getElementById('lb-caption');
  const count = document.getElementById('lb-count');
  img.src = lbImages[lbIdx].src;
  cap.textContent = lbImages[lbIdx].caption || caption || '';
  count.textContent = lbImages.length > 1 ? (lbIdx + 1) + ' / ' + lbImages.length : '';
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  // Show/hide nav arrows
  document.getElementById('lb-prev').style.opacity = lbImages.length > 1 ? '1' : '0';
  document.getElementById('lb-next').style.opacity = lbImages.length > 1 ? '1' : '0';
}

function closeLightbox() {
  document.getElementById('lb-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function lbNav(dir) {
  lbIdx = (lbIdx + dir + lbImages.length) % lbImages.length;
  const img = document.getElementById('lb-img');
  img.style.opacity = '0';
  setTimeout(() => {
    img.src = lbImages[lbIdx].src;
    img.onload = () => { img.style.opacity = '1'; };
    document.getElementById('lb-caption').textContent = lbImages[lbIdx].caption;
    document.getElementById('lb-count').textContent = (lbIdx + 1) + ' / ' + lbImages.length;
  }, 200);
}

// Keyboard nav for lightbox
document.addEventListener('keydown', e => {
  const o = document.getElementById('lb-overlay');
  if (!o || !o.classList.contains('active')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') lbNav(1);
  if (e.key === 'ArrowLeft') lbNav(-1);
});

// Touch swipe for lightbox
let lbTouchX = 0;
document.getElementById('lb-overlay')?.addEventListener('touchstart', e => { lbTouchX = e.touches[0].clientX; }, { passive: true });
document.getElementById('lb-overlay')?.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - lbTouchX;
  if (Math.abs(dx) > 50) lbNav(dx < 0 ? 1 : -1);
});

// Make villa carousel images clickable for lightbox
function addVillaLightbox() {
  // After villa grid renders, make carousel images openable
  document.querySelectorAll('.vi').forEach(img => {
    if (!img.dataset.lbReady) {
      img.dataset.lbReady = '1';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', e => {
        e.stopPropagation();
        openLightbox(img, img.closest('.vc')?.querySelector('.vname')?.textContent || '');
      });
    }
  });
}

// ── ENHANCED SCROLL REVEAL ───────────────────────────
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const delay = el.dataset.delay ? el.dataset.delay * 80 : 0;
      setTimeout(() => {
        el.classList.add('anim-up');
        el.style.opacity = '1';
      }, delay);
      revealObs.unobserve(el);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.rv, [data-reveal]').forEach(el => {
  el.style.opacity = '0';
  revealObs.observe(el);
});

// ── STAGGERED STAT CARDS ─────────────────────────────
const statObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.cdc-stat').forEach((stat, i) => {
        setTimeout(() => {
          stat.style.opacity = '1';
          stat.style.transform = 'translateY(0)';
        }, i * 120);
      });
      statObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.cdc-grid').forEach(el => {
  el.querySelectorAll('.cdc-stat').forEach(s => {
    s.style.opacity = '0';
    s.style.transform = 'translateY(20px)';
    s.style.transition = 'opacity .5s ease, transform .5s ease';
  });
  statObs.observe(el);
});

// ── PARALLAX HERO ─────────────────────────────────────
window.addEventListener('scroll', () => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const y = window.scrollY;
  const hbg = hero.querySelector('.hbg');
  if (hbg) hbg.style.transform = 'translateY(' + (y * 0.35) + 'px) scale(1.08)';
}, { passive: true });

// ── COUNT-UP ANIMATION ────────────────────────────────
function animateCount(el, target, suffix, duration) {
  const isFloat = String(target).includes('.');
  let start = 0, startTime = null;
  const step = (ts) => {
    if (!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / duration, 1);
    const val = progress * target;
    el.textContent = isFloat ? val.toFixed(0) + suffix : Math.floor(val) + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  };
  requestAnimationFrame(step);
}

const countObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.cdc-stat-n').forEach(el => {
        const raw = el.textContent.replace(/[^0-9.]/g, '');
        const suffix = el.textContent.replace(/[0-9.]/g, '');
        if (raw) animateCount(el, parseFloat(raw), suffix, 1200);
      });
      countObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('#casa-de-campo').forEach(el => countObs.observe(el));

// Hook into villa grid render to add lightbox support
const _origRenderVillaGrid = window.renderVillaGrid;
if (_origRenderVillaGrid) {
  window.renderVillaGrid = function() {
    _origRenderVillaGrid();
    setTimeout(addVillaLightbox, 500);
  };
}
setTimeout(addVillaLightbox, 2000);

// ── VILLA DETAIL DATA ────────────────────────────────────────────────────────
const villaData = {
  townhouse: {
    name: 'Townhouse Marina',
    label: 'Frente al puerto deportivo · Marina',
    img: 'https://img1.wsimg.com/isteam/ip/28e700c9-c37b-485d-b636-01fcfc9acb86/Mar-y-Palma_-Ocean-Front_villa.webp',
    hab: 3, banos: '3.5', huespedes: 8, precio: 300,
    servicio: 'Incluye empleada doméstica lun–vie 8am–4pm (limpiar, lavar, planchar)',
    descripcion: 'Te sentís libre, relajado y de vacaciones en el momento en que entrás. Los espacios abiertos y ventilados y una gran vista al puerto deportivo te dan la bienvenida. A poca distancia a pie del supermercado (5 min), salón de belleza y tiendas de la Marina. Incluye ropa de cama y toallas (personal y playa) para 8 huéspedes. Lavavajillas, microondas, cafetera, congelador, tostadora y barbacoa incluidos.',
    notas: 'Nuestro personal NO está incluido durante estadías de fin de semana, pero puede coordinarse lun–vie 8am–1pm por cargo adicional. Todos los huéspedes abonan tarifa de limpieza obligatoria de $50 por semana o fin de semana. Supermercado, cine, tiendas y restaurantes a pocos minutos a pie.',
    amenities: ['Pileta privada','Vista al puerto deportivo','Wi-Fi en todas las habitaciones','Smart TV','Cocina totalmente equipada','Barbacoa exterior','Ropa de cama y toallas incluidas','Aire acondicionado','Lavavajillas y microondas','A 5 min del supermercado','2 cocheras'],
    habitaciones: [
      { nombre: 'Dormitorio principal', desc: '1 cama king, aire acondicionado, Wi-Fi, vestidor amplio y baño privado en suite.' },
      { nombre: 'Dormitorio secundario', desc: '2 camas queen, mesa de noche, Wi-Fi y baño privado.' },
      { nombre: 'Tercer dormitorio', desc: '1 cama full, mesa de noche, Wi-Fi y baño privado.' },
      { nombre: 'Cocina', desc: 'Totalmente equipada con heladera, estufa con horno, cafetera, vajilla y utensilios.' },
      { nombre: 'Sala de estar y comedor', desc: 'Salón amplio, Smart TV, Wi-Fi, comedor y área de lectura adicional.' },
      { nombre: 'Terraza', desc: 'Sala de estar exterior, barbacoa y vista al puerto deportivo.' },
    ]
  },
  vistamar: {
    name: 'Vista Mar',
    label: 'Barrio Vista Mar · Cerca de playa',
    img: null, bgcolor: '#0d2b22',
    hab: 7, banos: 12, huespedes: 18, precio: 2500,
    servicio: 'Incluye empleada doméstica 8–4pm, cocinera y conserje dedicado. 2 cocheras.',
    descripcion: 'Disfrutá una estadía como ninguna otra en la impresionante Villa Vista Mar, ubicada en el pintoresco barrio de Vista Mar, muy cerca de la playa. Esta lujosa propiedad ofrece 7 habitaciones, 12 baños y tiene capacidad para 18 huéspedes. Cuenta con una hermosa piscina con jacuzzi, el entorno perfecto para relajarse y disfrutar del clima cálido. En el interior combina a la perfección el lujo contemporáneo con el encanto tradicional. Los amplios ventanales permiten que la luz natural ilumine los espacios, creando una atmósfera luminosa y acogedora.',
    notas: 'Servicios de limpieza diaria (lun–vie 9am–5pm; sáb 9am–12pm). Toque adicional de atención y conserjería. Una vez reservada, nuestro Asistente de Villa organizará todo lo que necesitás.',
    amenities: ['Piscina con jacuzzi','Vista al mar','2 cocheras','Wi-Fi','Smart TV','Cocina gourmet','Barbacoa','Aire acondicionado','Staff completo (limpieza, cocina, conserje)','12 baños completos','Terrazas amuebladas'],
    habitaciones: [
      { nombre: '7 habitaciones en suite', desc: 'Todas elegantemente decoradas con baño privado, garantizando privacidad y confort a cada huésped.' },
      { nombre: 'Áreas de entretenimiento', desc: 'Espaciosas salas de estar con luz natural, comedor amplio y terrazas para disfrutar al aire libre.' },
      { nombre: 'Exterior', desc: 'Amplias terrazas amuebladas perfectas para comidas al aire libre. Piscina con jacuzzi para momentos de relax.' },
    ]
  },
  catalina: {
    name: 'La Catalina',
    label: 'Vistas al mar y a la Isla Catalina',
    img: null, bgcolor: '#1a3a50',
    hab: 8, banos: 10, huespedes: 20, precio: 4500,
    servicio: 'Incluye empleada doméstica 8–4pm y cocinera. 2 cocheras.',
    descripcion: 'Sumérgete en esta impresionante villa con vistas al mar y a la Isla Catalina, de donde proviene su nombre. Ubicada en amplios terrenos bellamente ajardinados, a solo 7 minutos de la renovada Marina de Casa de Campo. La Catalina ofrece una generosa piscina al aire libre, gran patio, gimnasio, salón de belleza, sauna, bar, mesa de billar y un ascensor para moverse entre pisos. Las ocho habitaciones únicas están diseñadas con estilo propio, completamente amuebladas con detalles de Coralina, Larimar y decoración moderna.',
    notas: 'Servicios de limpieza (lun–vie 9am–5pm; sáb 9am–12pm). Conserjería incluida. Nuestro Asistente de Villa puede organizar cualquier cosa tras la reserva.',
    amenities: ['Piscina al aire libre','Vista al mar','Gimnasio privado','Sauna','Salón de belleza','Bar interior','Mesa de billar','Ascensor','Wi-Fi','Smart TV','Cocina gourmet','Staff completo','2 cocheras','10 baños'],
    habitaciones: [
      { nombre: '8 suites únicas', desc: 'Diseñadas individualmente con detalles de Coralina y Larimar. Decoración moderna y elegante.' },
      { nombre: 'Amenities premium', desc: 'Gimnasio, sauna, salón de belleza y bar en la propiedad para uso exclusivo de los huéspedes.' },
      { nombre: 'Exterior', desc: 'Generosa piscina, gran patio y jardines ajardinados. A 7 min de la Marina.' },
    ]
  },
  cacique: {
    name: 'Du Cacique',
    label: 'Barrio Cacique · Moderna y luminosa',
    img: null, bgcolor: '#3a2510',
    hab: 8, banos: '6+3 medios', huespedes: 14, precio: 3000,
    servicio: 'Incluye empleada doméstica 8–4pm y conserje. 2 cocheras.',
    descripcion: 'Viví como un ícono en la hermosa Villa Du Cacique. Este luminoso y moderno alquiler vacacional está en el tranquilo barrio Cacique de Casa de Campo. Un refugio chic con interiores elegantes, 6 dormitorios, 6 baños completos, 3 medios baños y excelente ubicación céntrica cerca de la playa. Detrás de sus encantadoras puertas de entrada de madera hay un gran patio de entrada de piedra que se abre a pasillos de arcos blancos adornados con arte y orquídeas. El comedor combina asientos para hasta 16 personas con una selección única de vajilla, adyacente a la cocina gourmet francesa totalmente equipada.',
    notas: 'Minitas Beach Club y Altos de Chavón a corto trayecto en carrito. Conserjería incluida — nuestro Asistente de Villa puede organizar cualquier cosa. Limpieza lun–vie 9am–5pm; sáb 9am–12pm.',
    amenities: ['Pileta privada','Patio de entrada de piedra','Cocina gourmet francesa','Comedor para 16','Arte y orquídeas','Wi-Fi','Smart TV','Barbacoa','Aire acondicionado','Conserje incluido','2 cocheras','Cerca de Minitas Beach'],
    habitaciones: [
      { nombre: 'Habitación 1', desc: '1 cama king · 2 huéspedes' },
      { nombre: 'Habitación 2', desc: '1 cama king · 2 huéspedes' },
      { nombre: 'Habitación 3', desc: '1 cama king · 2 huéspedes' },
      { nombre: 'Habitación 4', desc: '1 cama queen · 2 huéspedes' },
      { nombre: 'Habitación 5', desc: '1 cama queen · 2 huéspedes' },
      { nombre: 'Habitación 6', desc: '4 camas matrimoniales · 4 huéspedes' },
    ]
  },
  miralejos: {
    name: 'Miralejos',
    label: 'Diseño award-winning · Playa privada',
    img: null, bgcolor: '#1a1a2e',
    hab: 6, banos: '6.5', huespedes: 16, precio: 3500,
    servicio: 'Incluye empleada doméstica 8–4pm y conserje. 2 cocheras.',
    descripcion: 'Casa Miralejos, también conocida como Bahía Chavón 1, tiene diseño tradicional de 5 habitaciones más una adicional, para un total de 6, en la Perla de Casa de Campo. Miralejos es un destino en sí mismo: piscina acogedora, jardines exuberantes, arboleda de palmeras, playa privada y vistas panorámicas al mar sin obstrucciones. Diseñada por el arquitecto Hugh Newell Jacobsen, ganador del Premio de Honor del Instituto Americano de Arquitectos. Destacada en las revistas American Elle, Town & Country y House & Garden.',
    notas: 'A 10 min del hotel, 4 min de la Marina, 10 min de Playa Minitas, 9 min de Altos de Chavón. Chef disponible los 365 días del año. Acceso ilimitado a actividades del resort.',
    amenities: ['Playa privada','Piscina','Arboleda de palmeras','Vista panorámica al mar','Chef disponible 365 días','Wi-Fi','Smart TV','Cocina equipada','Barbacoa','Conserje incluido','Diseño premiado','2 cocheras'],
    habitaciones: [
      { nombre: '5 habitaciones principales + 1 adicional', desc: 'Diseño caribeño clásico con interiores espaciosos y luz natural. Espacios elegantes que reflejan la pasión por lo abierto.' },
      { nombre: 'Comedor al aire libre', desc: 'Cena con vistas al mar desde la mesa principal, cocina dominicana e internacional disponible los 365 días del año.' },
      { nombre: 'Exterior', desc: 'Piscina, jardines exuberantes, palmeras y playa privada con aguas cristalinas.' },
    ]
  },
  canaria: {
    name: 'Canaria',
    label: 'Jardín tropical · 4 habitaciones',
    img: null, bgcolor: '#1f0d23',
    hab: 4, banos: '4.5', huespedes: 8, precio: 2500,
    servicio: 'Incluye empleada doméstica y conserje. 2 cocheras.',
    descripcion: 'Villa de cuatro habitaciones con pileta privada, jardines tropicales y espacios generosos. Diseñada para el disfrute y la privacidad total, con todas las comodidades del resort a disposición.',
    notas: 'Servicios de limpieza lun–vie 9am–5pm; sáb 9am–12pm. Conserjería — nuestro Asistente de Villa puede organizar cualquier cosa.',
    amenities: ['Pileta privada','Jardín tropical','Wi-Fi','Smart TV','Cocina equipada','Barbacoa','Aire acondicionado','Conserje incluido','2 cocheras','4.5 baños'],
    habitaciones: [
      { nombre: '4 habitaciones privadas', desc: 'Cada habitación equipada con todas las comodidades necesarias para una estadía placentera.' },
      { nombre: 'Áreas comunes', desc: 'Sala de estar y comedor amplios, cocina totalmente equipada.' },
      { nombre: 'Exterior', desc: 'Pileta privada rodeada de jardines tropicales con terrazas para relajarse.' },
    ]
  },
  laplaya: {
    name: 'La Playa',
    label: 'Bahía Minitas · Playa privada · Frente al mar',
    img: null, bgcolor: '#200d00',
    hab: 4, banos: '4.5', huespedes: 8, precio: 3500,
    servicio: 'Incluye empleada doméstica, chef y conserje. 2 cocheras.',
    descripcion: 'Descubrí Casa La Playa, un espectacular escape privado de 6.975 pies cuadrados ubicado en Bahía Minitas. Esta elegante villa de cuatro dormitorios y cinco baños tiene vista espectacular frente al mar y excelente ubicación cerca de la Marina, Playa Minitas y todo lo que deseás explorar en Casa de Campo. Cuenta con generosa piscina, múltiples espacios acogedores y playa privada con aguas cristalinas. Con múltiples comedores al aire libre, lleva la cena al siguiente nivel con cocina dominicana e internacional disponible los 365 días del año.',
    notas: 'Despertás en Casa de Campo con vista impresionante al mar — es sublime. Playa privada de arena blanca con libertad total. Cerca de Minitas Beach Club y Altos de Chavón. Disponible para alquiler a corto plazo y escapadas vacacionales.',
    amenities: ['Playa privada de arena blanca','Vista directa al mar','Piscina generosa','Chef incluido','Comedores al aire libre','Wi-Fi','Smart TV','Cocina equipada','Barbacoa','Conserje incluido','2 cocheras','0.77 acres de terreno'],
    habitaciones: [
      { nombre: 'Suite principal', desc: 'Frente al mar, baño en suite de lujo.' },
      { nombre: 'Habitación 2', desc: 'Vista al mar, baño privado.' },
      { nombre: 'Habitación 3', desc: 'Amplia y luminosa, baño privado.' },
      { nombre: 'Habitación 4', desc: 'Cómoda y privada, baño compartido.' },
      { nombre: 'Exterior', desc: 'Playa privada, piscina y múltiples terrazas con vista al océano. Parrilla exterior.' },
    ]
  },
  royale: {
    name: 'Clara Royale',
    label: 'La más exclusiva del resort · 10 habitaciones',
    img: null, bgcolor: '#0a2016',
    hab: 10, banos: 12, huespedes: 20, precio: 15000,
    servicio: 'Incluye empleada doméstica, chef y conserje. 2 cocheras.',
    descripcion: 'Esta excepcional villa de 10 habitaciones es la base perfecta para explorar todo lo que la costa de República Dominicana tiene para ofrecer. Además de disfrutar de una casa privada con familia y amigos, tenés acceso a todas las maravillosas características del resort. La ubicación privilegiada, piscina privada, jardín verde, fogón moderno y vista a la playa completan el diseño arquitectónico único. El diseño interior combina lo contemporáneo chic con la elegancia moderna, con piezas de arte y mobiliario de lujo en todo el hogar.',
    notas: 'Todo lo que necesitás está provisto en Casa de Campo. Lo único que queda por hacer es relajarte y disfrutar del sol. Un paraíso a tu disposición, rodeado de océano y naturaleza con clima tropical que da una atmósfera de calma y tranquilidad. Limpieza lun–vie 9am–5pm; sáb 9am–12pm.',
    amenities: ['Piscina privada','Jardín verde amplio','Fogón moderno','Vista a la playa','Arte y mobiliario de lujo','Wi-Fi','Smart TV','Cocina gourmet','Barbacoa','Chef incluido','Conserje incluido','2 cocheras','12 baños'],
    habitaciones: [
      { nombre: '10 habitaciones únicas', desc: 'Cada una diseñada con elegancia. Combinación de contemporáneo chic y modernidad.' },
      { nombre: 'Áreas de entretenimiento', desc: 'Amplias salas de estar, comedor principal y terrazas con vista al entorno natural.' },
      { nombre: 'Exterior', desc: 'Piscina privada, jardín verde, fogón moderno y vistas privilegiadas al resort y al mar.' },
    ]
  },
  ranchos: {
    name: 'Villa Los Ranchos',
    label: 'Moderna · Piscina · Jacuzzi · Jardín',
    img: null, bgcolor: '#0d1a2e',
    hab: 6, banos: '6.5', huespedes: 12, precio: 2700,
    servicio: 'Incluye empleada doméstica, chef y conserje. 2 cocheras.',
    descripcion: 'Villa moderna de 6 habitaciones con características elegantes. Cuenta con piscina, jacuzzi y amplio jardín, el lugar perfecto para un baño de sol perfecto.',
    notas: 'Staff altamente capacitado y dedicado a la hospitalidad. Limpieza lun–vie 9am–5pm; sáb 9am–12pm.',
    amenities: ['Piscina','Jacuzzi','Jardín amplio','Wi-Fi','Smart TV','Cocina equipada','Barbacoa','Aire acondicionado','Staff completo','2 cocheras'],
    habitaciones: [
      { nombre: '6 habitaciones modernas', desc: 'Villa de diseño contemporáneo con características elegantes y confort premium.' },
      { nombre: 'Exterior', desc: 'Piscina, jacuzzi y gran jardín. El lugar ideal para relajarse bajo el sol caribeño.' },
    ]
  },
  faro: {
    name: 'Townhouse Faro',
    label: 'Frente a la Marina · Vistas panorámicas',
    img: null, bgcolor: '#1a2e1a',
    hab: 4, banos: '4.5', huespedes: 10, precio: 1300,
    servicio: 'Incluye empleada doméstica y conserje. 2 cocheras.',
    descripcion: 'Sumérgete en el paraíso en este cautivador townhouse de 4 habitaciones, ubicado idealmente en la marina. La sala de estar de concepto abierto integra perfectamente la cocina, el comedor y la sala. Las puertas corredizas de vidrio se abren a un balcón con vistas panorámicas a la marina resplandeciente. El dormitorio principal es un santuario de tranquilidad con cama king y baño privado con tocador doble. Piscina privada y parrilla al aire libre bajo el cielo estrellado.',
    notas: 'Vistas a la marina desde el balcón. Exploración fácil de la comunidad Marina Faro: tiendas, restaurantes y entretenimiento a pasos.',
    amenities: ['Piscina privada','Vista a la marina','Balcón con puertas de vidrio','Parrilla (BBQ)','Wi-Fi','Smart TV','Cocina con electrodomésticos de acero inoxidable','Aire acondicionado','Encimeras de granito','Conserje incluido','2 cocheras'],
    habitaciones: [
      { nombre: 'Habitación 1 (principal)', desc: 'Cama king, baño privado con tocador doble y ducha a ras de suelo.' },
      { nombre: 'Habitación 2', desc: 'Dos camas queen.' },
      { nombre: 'Habitación 3', desc: 'Dos camas queen.' },
      { nombre: 'Habitación 4', desc: 'Dos camas queen — flexible para huéspedes adicionales.' },
    ]
  },
  loslagos: {
    name: 'Villa Los Lagos',
    label: 'Frente al lago · Pileta privada',
    img: null, bgcolor: '#111b0e',
    hab: 5, banos: 5, huespedes: 10, precio: 1120,
    servicio: 'Empleada doméstica y conserje incluidos',
    descripcion: 'Villa de cinco habitaciones frente al lago con acceso directo al agua y pileta privada. Amplio jardín tropical y espacios de entretenimiento al aire libre. Ideal para familias o grupos que disfrutan la naturaleza y el relax total.',
    notas: 'Personal de servicio incluido lun–vie. Acceso privado al lago.',
    amenities: ['Pileta privada','Frente al lago','Jardín tropical','Wi-Fi','Smart TV','Cocina equipada','Barbacoa','Aire acondicionado','Staff incluido'],
    habitaciones: [
      { nombre: 'Suite principal', desc: '1 cama king, baño en suite, vista al lago.' },
      { nombre: 'Habitaciones 2 y 3', desc: '1 cama king c/u, baño privado.' },
      { nombre: 'Habitaciones 4 y 5', desc: '2 camas twin c/u, baño privado.' },
    ]
  },
  lagos94: {
    name: 'Villa Lagos 94',
    label: '5 habitaciones · Zona Lagos',
    img: null, bgcolor: '#1c1400',
    hab: 5, banos: 5, huespedes: 10, precio: 1440,
    servicio: 'Empleada doméstica incluida lun–vie',
    descripcion: 'Generosa villa de cinco habitaciones en la zona de Lagos, con gran pileta y jardín cuidado. Distribución ideal para grupos que buscan comodidad y espacio. Totalmente equipada para una estadía perfecta.',
    notas: 'Tarifa de limpieza aplicable en estadías de fin de semana.',
    amenities: ['Pileta privada','Jardín amplio','Wi-Fi','Smart TV','Cocina equipada','Barbacoa','Aire acondicionado','Servicio de limpieza'],
    habitaciones: [
      { nombre: 'Suite principal', desc: '1 cama king, baño en suite, vestidor.' },
      { nombre: 'Habitaciones 2 y 3', desc: '1 cama king c/u, baño privado.' },
      { nombre: 'Habitaciones 4 y 5', desc: '1 cama queen c/u, baño privado.' },
    ]
  },
  laguna: {
    name: 'Villa Laguna',
    label: 'Con acceso a laguna privada',
    img: null, bgcolor: '#003535',
    hab: 5, banos: '5.5', huespedes: 10, precio: 2240,
    servicio: 'Staff completo incluido',
    descripcion: 'Una de las villas más exclusivas del resort, con acceso directo a laguna privada. La arquitectura integra interiores y paisaje acuático de manera única.',
    notas: 'Kayaks y equipo acuático disponibles. Chef privado bajo consulta.',
    amenities: ['Acceso a laguna privada','Pileta','Kayaks','Wi-Fi','Smart TV','Cocina equipada','Barbacoa','Aire acondicionado','Staff completo'],
    habitaciones: [
      { nombre: 'Suite principal', desc: '1 cama king, vista a la laguna, baño en suite con tina.' },
      { nombre: 'Habitaciones 2, 3 y 4', desc: '1 cama king o queen c/u, baño privado.' },
      { nombre: 'Habitación 5', desc: '2 camas twin, baño privado.' },
    ]
  },
  colinas21: {
    name: 'Villa Colinas 21',
    label: 'Vistas panorámicas al resort',
    img: null, bgcolor: '#0c1f0c',
    hab: 4, banos: 4, huespedes: 10, precio: 2640,
    servicio: 'Staff completo incluido',
    descripcion: 'Villa de cuatro habitaciones posicionada en las colinas del resort, con vistas panorámicas al mar, los campos de golf y la vegetación. Amplias terrazas para disfrutar del amanecer y el atardecer caribeño.',
    notas: 'Staff completo incluido.',
    amenities: ['Vista panorámica','Pileta','Terrazas amplias','Wi-Fi','Smart TV','Cocina gourmet','Barbacoa','Aire acondicionado','Staff completo'],
    habitaciones: [
      { nombre: 'Suite principal', desc: '1 cama king, terraza con vista al mar, baño en suite.' },
      { nombre: 'Habitaciones 2 y 3', desc: '1 cama king c/u, baño privado.' },
      { nombre: 'Habitación 4', desc: '2 camas queen, baño privado.' },
    ]
  },
  bali: {
    name: 'Villa Bali',
    label: 'Jardines · Chimenea · Piscina dos niveles',
    img: null, bgcolor: '#1a0f00',
    hab: 6, banos: 6, huespedes: 12, precio: 3200,
    servicio: 'Empleada doméstica 8–4pm y staff completo',
    descripcion: 'Villa Bali es una de las más hermosas del resort, con jardines increíbles, pileta espectacular de dos niveles y una chimenea que invita a las noches afuera. El espacio exterior está dividido en dos niveles donde los árboles, la terraza y las áreas verdes dan una sensación de calma absoluta. La piscina tiene vistas a la terraza donde está el fuego, el lugar perfecto para tomar un vino mientras disfrutás del atardecer. El comedor exterior tiene mesa para 12 personas con vista al Caribe.',
    notas: 'Incluye servicio diario de empleada doméstica 8–4pm. Chef privado disponible. Los propietarios se enorgullecen de contar con staff debidamente capacitado.',
    amenities: ['Piscina dos niveles','Chimenea exterior','Jardines tropicales exuberantes','Comedor exterior para 12','Vista al Caribe','Wi-Fi alta velocidad','Smart TV','Cocina de chef','Barbacoa premium','Aire acondicionado','Staff completo'],
    habitaciones: [
      { nombre: 'Suite master', desc: '1 cama king, baño en suite con tina, terraza privada con jardín.' },
      { nombre: 'Habitaciones 2 y 3', desc: '1 cama king c/u, baño en suite.' },
      { nombre: 'Habitaciones 4 y 5', desc: '1 cama queen c/u, baño privado.' },
      { nombre: 'Habitación 6', desc: '2 camas twin, baño privado.' },
    ]
  },
  naranjos: {
    name: 'Villa Naranjos',
    label: 'Jardín y pileta privada',
    img: null, bgcolor: '#1a1000',
    hab: 6, banos: 6, huespedes: 12, precio: 3200,
    servicio: 'Empleada doméstica y staff incluidos',
    descripcion: 'Villa de seis habitaciones con arquitectura caribeña clásica. Jardín generoso con pileta privada y amplias terrazas cubiertas. Ideal para grupos que valoran el espacio y la privacidad.',
    notas: 'Staff incluido lun–sáb.',
    amenities: ['Pileta privada','Jardín amplio','Terrazas cubiertas','Wi-Fi','Smart TV','Cocina equipada','Barbacoa','Aire acondicionado','Staff incluido'],
    habitaciones: [
      { nombre: 'Suite principal', desc: '1 cama king, baño en suite, terraza privada.' },
      { nombre: 'Habitaciones 2 y 3', desc: '1 cama king c/u, baño privado.' },
      { nombre: 'Habitaciones 4 y 5', desc: '1 cama queen c/u, baño privado.' },
      { nombre: 'Habitación 6', desc: '2 camas twin, baño privado.' },
    ]
  },
  puntaminitas: {
    name: 'Punta Minitas',
    label: 'Frente al mar · Playa privada',
    img: null, bgcolor: '#001a2e',
    hab: 6, banos: 6, huespedes: 12, precio: 4400,
    servicio: 'Staff completo premium incluido',
    descripcion: 'Villa con acceso privado a la playa, literalmente al borde del Mar Caribe, con el sonido de las olas como banda de sonido permanente. La experiencia más exclusiva del resort.',
    notas: 'Acceso privado a playa de arena blanca. Equipo de snorkeling incluido. Chef privado disponible.',
    amenities: ['Acceso privado a playa','Vista al mar','Pileta','Equipo de snorkeling','Wi-Fi','Smart TV','Cocina gourmet','Barbacoa','Staff completo premium'],
    habitaciones: [
      { nombre: 'Suite master', desc: '1 cama king, terraza directa a la playa, baño en suite con tina.' },
      { nombre: 'Habitaciones 2 y 3', desc: '1 cama king c/u, baño en suite, vista al mar.' },
      { nombre: 'Habitaciones 4, 5 y 6', desc: '1 cama queen c/u, baño privado.' },
    ]
  },
  altosChavon: {
    name: 'Altos de Chavón',
    label: 'Vista al río Chavón · Pueblo medieval',
    img: null, bgcolor: '#0f1f17',
    hab: 2, banos: 2, huespedes: 4, precio: 280,
    servicio: 'Servicio de limpieza incluido',
    descripcion: 'Villa íntima ubicada en el icónico pueblo medieval de Altos de Chavón, con vistas al río Chavón y la selva tropical. Perfecta para parejas o grupos pequeños que buscan privacidad y una experiencia cultural única dentro del resort.',
    notas: 'Acceso a pie a galerías de arte, anfiteatro y restaurantes de Altos de Chavón.',
    amenities: ['Vista al río Chavón','Pileta','Wi-Fi','Aire acondicionado','Cocina equipada','Acceso a galerías y anfiteatro','Ambiente colonial'],
    habitaciones: [
      { nombre: 'Dormitorio principal', desc: '1 cama king, baño privado, vista al río.' },
      { nombre: 'Segundo dormitorio', desc: '1 cama queen, baño privado.' },
    ]
  },
};

// ── OPEN / CLOSE MODAL ───────────────────────────────────────────────────────
function openVModal(id) {
  // Use Sheet data if available, fall back to hardcoded villaData
  const d = villaDataFromSheet[id] || villaData[id];
  if (!d) return;
  // Normalize amenities (Sheet uses array, hardcoded uses array too)
  if(d.amenities && typeof d.amenities[0] === 'string' && !d.amenities.some) d.amenities = [];
  const overlay = document.getElementById('vmodal-overlay');
  const modal   = document.getElementById('vmodal');
  const content = document.getElementById('vmodal-content');

  // Normalize: amenities always array of strings
  const amenities = Array.isArray(d.amenities) ? d.amenities : [];
  // Normalize: habitaciones always array of {nombre, desc}
  const habitaciones = Array.isArray(d.habitaciones) ? d.habitaciones : [];
  // Normalize: precio
  const precio = d.precio_noche || d.precio || 0;

  // Build image or placeholder
  const fotoUrl = d.foto_url || d.img;
  const imgHtml = fotoUrl
    ? `<img class="vm-img" src="${fotoUrl}" alt="${d.name}">`
    : `<div class="vm-img-placeholder" style="background:${d.bgcolor||'#0f1f17'}">
         <svg viewBox="0 0 300 240" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="position:absolute;inset:0;width:100%;height:100%">
           <rect width="300" height="240" fill="${d.bgcolor||'#0f1f17'}"/>
           <text x="150" y="130" font-family="Cinzel,serif" font-size="14" fill="rgba(174,133,96,.3)" text-anchor="middle" letter-spacing="6">${d.name.toUpperCase()}</text>
         </svg>
       </div>`;

  // PDF button if available - REMOVED (all contact through Asistente Virtual)
  const pdfBtn = '';

  // Extraer folder ID de la URL de carpeta Drive
  const folderUrl = d.carpeta_url || d.pdf_url || '';
  const folderMatch = folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
  const folderId = folderMatch ? folderMatch[1] : null;

  // Imagen inicial (portada)
  const portadaUrl = d.foto_url || d.img;

  content.innerHTML = `
    <div style="position:relative;flex-shrink:0">
      <div class="vm-carousel" id="vmCarousel">
        <div class="vm-carousel-loading">Cargando fotos...</div>
      </div>
      <button class="vm-close-btn" onclick="closeVModal()" style="position:absolute;top:.7rem;right:.7rem;z-index:10" aria-label="Cerrar">✕</button>
      <!-- Botón ver galería completa -->
      <button id="vm-gallery-btn" onclick="openGalleryFromModal()" style="
        position:absolute;bottom:.8rem;right:.8rem;z-index:10;
        background:rgba(10,12,8,.75);backdrop-filter:blur(6px);
        border:.5px solid rgba(174,133,96,.5);color:var(--vl);
        font-family:'Cinzel',serif;font-size:.42rem;letter-spacing:.15em;
        text-transform:uppercase;padding:.5rem 1rem;cursor:pointer;
        display:flex;align-items:center;gap:.5rem;transition:all .2s ease">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Ver todas las fotos
      </button>
    </div>
    <div class="vm-body">
      <div class="vm-label">${d.label||''}</div>
      <h2 class="vm-title">${d.name}</h2>
      <div class="vm-stats">
        <div class="vm-stat"><div class="vm-stat-n">${d.hab||''}</div><div class="vm-stat-l">Habitaciones</div></div>
        <div class="vm-stat"><div class="vm-stat-n">${d.huespedes||d.guests||''}</div><div class="vm-stat-l">Huéspedes</div></div>
      </div>
      <div class="vm-price-box">
        <div><div class="vm-price-from">Precio por noche</div><div class="vm-price-night">${d.servicio||''}</div></div>
        <div><div class="vm-price-val">$${precio.toLocaleString()}</div><div class="vm-price-night">USD / noche</div></div>
      </div>
      ${d.descripcion?`<div class="vm-section-t">Descripción</div><p class="vm-desc">${d.descripcion}</p>`:''}
      ${d.notas?`<p class="vm-note">${d.notas}</p>`:''}
      ${amenities.length?`<div class="vm-section-t">Amenities</div><div class="vm-amenities">${amenities.map(a=>`<div class="vm-am">${a}</div>`).join('')}</div>`:''}
      ${habitaciones.length?`<div class="vm-section-t">Habitaciones</div><div class="vm-rooms">${habitaciones.map(h=>`<div class="vm-room"><div class="vm-room-n">${h.nombre}</div><div class="vm-room-d">${h.desc}</div></div>`).join('')}</div>`:''}
      <div class="vm-ctas">
        <button class="vm-cta-main" onclick="selectVillaFromModal('${id}')">Armar presupuesto ✦</button>
        <button class="vm-cta-gallery" onclick="openGalleryFromModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Ver todas las fotos
        </button>
        ${pdfBtn}
      </div>
    </div>`;

  // Guardar referencias globales para galería
  window._currentVillaFolderId = folderId;
  window._currentVillaPortada  = portadaUrl;
  window._currentVillaName     = d.name;

  // Cargar fotos del carrusel
  initCarousel(folderId, portadaUrl);

  overlay.classList.add('open');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Abre la galería fullscreen desde el modal
window.openGalleryFromModal = function openGalleryFromModal() {
  const folderId  = window._currentVillaFolderId;
  const portada   = window._currentVillaPortada;
  const name      = window._currentVillaName || '';
  const carpetaUrl = folderId ? 'https://drive.google.com/drive/folders/' + folderId : '';
  // Call openVillaGallery — defined later in the page
  if (typeof openVillaGallery === 'function') {
    openVillaGallery('modal', name, carpetaUrl, portada);
  } else {
    // Fallback: open portada in lightbox
    if (portada) {
      window._galleryFotos = [{ url: portada, thumb: portada, name: name }];
      window._galleryCur = 0;
      const lb = document.getElementById('gallery-lb');
      const img = document.getElementById('gallery-lb-img');
      const title = document.getElementById('gallery-lb-title');
      const counter = document.getElementById('gallery-lb-counter');
      const thumbs = document.getElementById('gallery-lb-thumbs');
      const prev = document.getElementById('gallery-lb-prev');
      const next = document.getElementById('gallery-lb-next');
      if (lb && img) {
        title.textContent = name;
        img.src = portada;
        counter.textContent = '1 / 1';
        if (thumbs) thumbs.style.display = 'none';
        if (prev) prev.style.display = 'none';
        if (next) next.style.display = 'none';
        lb.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }
  }
}

// ── CARRUSEL DE FOTOS ────────────────────────────────────────────────────────
const DRIVE_KEY = 'AIzaSyAe9IVx4R47OJlV9nkI2PLSdEBbdZclnuc';

async function initCarousel(folderId, portadaUrl) {
  const el = document.getElementById('vmCarousel');
  if(!el) return;

  let fotos = [];

  if(folderId) {
    try {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name)&orderBy=name&pageSize=100&key=${DRIVE_KEY}`;
      const res  = await fetch(url);
      const data = await res.json();
      if(data.files && data.files.length > 0) {
        fotos = data.files.map(f => `https://drive.google.com/thumbnail?id=${f.id}&sz=w1200`);
      }
    } catch(e) { console.log('Drive folder error:', e); }
  }

  // Fallback: si no hay fotos de carpeta, usar solo la portada
  if(fotos.length === 0 && portadaUrl) fotos = [portadaUrl];
  if(fotos.length === 0) {
    el.innerHTML = '<div class="vm-carousel-loading">Sin fotos disponibles</div>';
    return;
  }

  let cur = 0;
  const render = () => {
    el.innerHTML = `
      <div class="vm-carousel-track" id="vmTrack" style="transform:translateX(-${cur*100}%)">
        ${fotos.map(u => `<img src="${u}" loading="lazy" alt="foto villa">`).join('')}
      </div>
      ${fotos.length > 1 ? `
        <button class="vm-carousel-btn prev" onclick="carouselMove(-1)">‹</button>
        <button class="vm-carousel-btn next" onclick="carouselMove(1)">›</button>
        <div class="vm-carousel-counter">${cur+1} / ${fotos.length}</div>
      ` : ''}`;
  };

  window._carouselFotos = fotos;
  window._carouselCur   = 0;
  render();
  window._carouselRender = render;
}

function carouselMove(dir) {
  const fotos = window._carouselFotos || [];
  window._carouselCur = (window._carouselCur + dir + fotos.length) % fotos.length;
  const track = document.getElementById('vmTrack');
  if(track) {
    track.style.transform = `translateX(-${window._carouselCur * 100}%)`;
    const counter = document.querySelector('.vm-carousel-counter');
    if(counter) counter.textContent = `${window._carouselCur+1} / ${fotos.length}`;
  }
}

function closeVModal() {
  document.getElementById('vmodal-overlay').classList.remove('open');
  document.getElementById('vmodal').classList.remove('open');
  document.body.style.overflow = '';
}

function selectVillaFromModal(id) {
  closeVModal();
  // Preselect villa in state
  state.villaId = id;
  // Scroll to configurator
  const conf = document.getElementById('tu-experiencia');
  if(conf) conf.scrollIntoView({behavior:'smooth', block:'start'});
  setTimeout(()=>{
    if(state.dateIn && state.dateOut && state.nights > 0){
      // Dates set → go straight to villa step
      goStep(3);
      renderVillas();
    } else {
      // No dates yet → start from step 1, villa already preselected for later
      goStep(1);
    }
  }, 700);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeVModal();
});
