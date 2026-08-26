// ══════════════════════════════════════════════════════════════
// DATOS DE CADA ZONA DEL RESORT
// ══════════════════════════════════════════════════════════════
const resortZoneData = {
  marina: {
    label: 'Puerto deportivo',
    title: 'La Marina de Casa de Campo',
    img: 'img/marina-wide.jpg',
    desc: 'La marina más exclusiva del Caribe. Yates de bandera europea, restaurantes de autor y boutiques de firmas internacionales, todo a orillas del río Chavón dentro del resort. Un lugar donde la tarde puede extenderse indefinidamente sin ninguna razón para irse.',
    highlights: [
      'Amarradero para embarcaciones de hasta 250 pies',
      'La Piazzetta · La Casita · SBG · Causa — restaurantes de autor',
      'Boutiques exclusivas frente al río Chavón',
      'Salidas en barco privado desde la marina',
      'Entretenimiento y eventos durante todo el año',
    ],
    facts: [
      { n: '250\'', l: 'Eslora máxima' },
      { n: '5+', l: 'Restaurantes' },
      { n: '24h', l: 'Seguridad' },
      { n: 'Todo el año', l: 'Disponible' },
    ]
  },
  minitas: {
    label: 'Playa privada del resort',
    title: 'Minitas Beach Club',
    img: 'img/minitas-drone.jpg',
    desc: 'Arena blanca, agua turquesa cristalina y el primer Veuve Clicquot Sun Club del Caribe. Playa de acceso exclusivo para huéspedes del resort — sin vendedores, sin multitud, sin nada que interrumpa. Solo el mar, una copa fría y el ritmo que te impongas.',
    highlights: [
      'Acceso exclusivo para huéspedes del resort',
      'Primer Veuve Clicquot Sun Club del Caribe',
      'Kayak, paddleboard, snorkel y vela incluidos',
      'Gastronomía internacional con los pies en la arena',
      'Servicio de playa personalizado',
    ],
    facts: [
      { n: '100%', l: 'Privada' },
      { n: 'Veuve', l: 'Clicquot Sun Club' },
      { n: '9–18hs', l: 'Horario' },
      { n: '4+', l: 'Deportes acuáticos' },
    ]
  },
  chavon: {
    label: 'Pueblo artesanal · Siglo XVI',
    title: 'Altos de Chavón',
    img: 'img/chavon-aerial.jpg',
    desc: 'Un pueblo mediterráneo del siglo XVI construido en piedra coralina sobre un acantilado con vista al río Chavón. No es una recreación turística — es una comunidad artística viva con galerías, talleres de arte, boutiques de diseño y un anfiteatro que recibió a Frank Sinatra, Julio Iglesias y Shakira.',
    highlights: [
      'Anfiteatro para 5,000 espectadores — artistas de talla internacional',
      'Galerías de arte contemporáneo y talleres de artesanías locales',
      'La Piazzetta · Genesis · Onno\'s Bar · Café Marietta · Casa del Río',
      'Boutiques de diseño, joyería artesanal y souvenirs exclusivos',
      'Vistas panorámicas al cañón del río Chavón desde el acantilado',
    ],
    facts: [
      { n: '5,000', l: 'Aforo anfiteatro' },
      { n: '1976', l: 'Año de fundación' },
      { n: '5+', l: 'Restaurantes' },
      { n: 'Todo el año', l: 'Eventos culturales' },
    ]
  }
};

// ══════════════════════════════════════════════════════════════
// OPEN / CLOSE RESORT MODAL
// ══════════════════════════════════════════════════════════════
function openResortModal(zoneId) {
  const d = resortZoneData[zoneId];
  if (!d) return;

  const overlay = document.getElementById('resort-modal-overlay');
  const modal   = document.getElementById('resort-modal');
  const content = document.getElementById('resort-modal-content');

  const highlightsHtml = d.highlights.map(h => `
    <div class="rm-hl">
      <span class="rm-hl-bullet">◆</span>
      <span class="rm-hl-text">${h}</span>
    </div>
  `).join('');

  const factsHtml = d.facts.map(f => `
    <div class="rm-fact">
      <div class="rm-fact-n">${f.n}</div>
      <div class="rm-fact-l">${f.l}</div>
    </div>
  `).join('');

  const waText = encodeURIComponent(`Hola! Me interesa saber más sobre ${d.title} en Casa de Campo.`);

  content.innerHTML = `
    <div style="position:relative;flex-shrink:0">
      <img class="rm-hero-img" src="${d.img}" alt="${d.title}">
      <button class="rm-close-btn" onclick="closeResortModal()" aria-label="Cerrar">✕</button>
    </div>

    <div class="rm-body">
      <div class="rm-label">${d.label}</div>
      <h2 class="rm-title">${d.title}</h2>
      <p class="rm-desc">${d.desc}</p>

      <div class="rm-highlights">
        ${highlightsHtml}
      </div>

      <div class="rm-section-t">En números</div>
      <div class="rm-facts">
        ${factsHtml}
      </div>

      <div class="rm-ctas">
        <button class="rm-cta-main" onclick="closeResortModal();document.getElementById('tu-experiencia').scrollIntoView({behavior:'smooth',block:'start'})">
          Armá tu estadía ✦
        </button>
      </div>
    </div>
  `;

  overlay.classList.add('open');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeResortModal() {
  document.getElementById('resort-modal-overlay').classList.remove('open');
  document.getElementById('resort-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// Keyboard close
document.addEventListener('keydown', e => {
  const m = document.getElementById('resort-modal');
  if (m && m.classList.contains('open') && e.key === 'Escape') closeResortModal();
});
