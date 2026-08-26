// ── STATE
let state = {step:1, nights:0, guests:8, villaId:null, svcs:{}, barcoId:null, barcos:{}, golfId:null, aeropuertoId:null, openAccordion:null};

// ── VILLA CATALOG: select and jump to configurator
function selectVillaAndGo(villaId){
  state.villaId = villaId;
  document.getElementById('tu-experiencia').scrollIntoView({behavior:'smooth', block:'start'});
  // If already past step 1, jump to step 3
  if(state.dateIn && state.dateOut && state.nights > 0){
    setTimeout(()=>{ goStep(3); renderVillas(); }, 600);
  }
}

// ── VILLA FILTER
window.filtVillas = function filtVillas(size, btn){
  document.querySelectorAll('.vfb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#villaCatalog .vc').forEach(card=>{
    if(size==='all'){ card.classList.remove('hidden'); }
    else { card.classList.toggle('hidden', card.dataset.size !== size); }
  });
}
function goStep(n){
  // Step 0 = intent, step 1 = fechas, 2 = personas, 3 = villas, 4 = servicios, 5 = resumen
  if(n>1){
    if(!state.dateIn||!state.dateOut){alert('Seleccioná las fechas de tu estadía.');return}
    if(state.nights<=0){alert('La salida debe ser posterior a la llegada.');return}
  }
  if(n>3&&!state.villaId){alert('Seleccioná una casa para continuar.');return}
  document.getElementById('panel'+state.step).classList.remove('active');
  state.step=n;
  document.getElementById('panel'+n).classList.add('active');
  updateStepBar();
  if(n===3) renderVillas();
  if(n===4) renderServices();
  if(n===5) {
    renderSummary();
    // Track presupuesto visto
    const total = calculateTotal();
    trackPresupuestoViewed(total);
  }
  
  // Track cuando entra al configurador (paso 1)
  if(n===1) {
    trackViewConfigurador();
  }
  
  // Clase en body para ocultar secciones y fijar el configurador arriba
  if(n===5){
    document.body.classList.add('showing-summary');
    // Doble requestAnimationFrame: garantiza que el DOM se repintó con display:none
    // antes de hacer el scroll, evitando que se vea la sección de villas
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        window.scrollTo({ top: 0, behavior:'instant' });
      });
    });
  } else {
    document.body.classList.remove('showing-summary');
    document.getElementById('tu-experiencia').scrollIntoView({behavior:'smooth',block:'start'});
  }
}

function selectIntent(type){
  state.intent = type;
  document.querySelectorAll('.intent-card').forEach(c => c.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  setTimeout(() => goStep(1), 350);
}


function updateStepBar(){
  for(let i=0;i<=5;i++){
    const dot=document.getElementById('dot'+i);
    const lbl=document.getElementById('lbl'+i);
    if(!dot) continue;
    dot.classList.remove('active','done');
    lbl.classList.remove('active','done');
    if(i<state.step){dot.classList.add('done');dot.textContent='✓';lbl.classList.add('done')}
    else if(i===state.step){dot.classList.add('active');dot.textContent=i+1;lbl.classList.add('active')}
    else{dot.textContent=i+1}
  }
}


function calcNights(){ /* legacy noop — handled by calendar */ }

// ── GUESTS
function changeGuests(d){
  state.guests=Math.max(1,Math.min(50,state.guests+d));
  document.getElementById('guestNum').textContent=state.guests;
  state.villaId=null;
}

// ── STEP 3: VILLAS
function renderVillas(){
  const g=state.guests;
  const grid=document.getElementById('villaGrid');
  const note=document.getElementById('filterNote');

  // Filter: only villas that fit the group, sorted cheapest first
  const allVillas=getVillas();
  const getPrice = v => {
    const p = Number(v.precio_noche || v.price || 0);
    return isNaN(p) ? 999999 : p; // las villas sin precio van al final
  };
  const suitable=allVillas
    .filter(v=>Number(v.guests||v.huespedes||0)>=g)
    .sort((a,b)=>getPrice(a)-getPrice(b));
  const toShow=suitable.length>0?suitable:[...allVillas].sort((a,b)=>getPrice(a)-getPrice(b));

  if(suitable.length>0){
    note.textContent=`${suitable.length} casa${suitable.length>1?'s':''} sugerida${suitable.length>1?'s':''} para ${g} personas — confirmamos disponibilidad para tus fechas`;
  } else {
    note.textContent='Mostrando todas las casas — nos contactamos para confirmar qué está disponible';
  }

  grid.innerHTML=toShow.map(v=>`
    <div class="villa-opt ${v.id===state.villaId?'selected':''} ${v.guests<g?'villa-opt-insuf':''}"
         onclick="selectVilla('${v.id}')">
      <div class="vo-name">${v.name}</div>
      <div class="vo-spec">${v.hab} hab · hasta ${v.guests} pers.</div>
      <div class="vo-price">desde USD $${(v.precio_noche||v.price||0).toLocaleString()}/noche</div>
    </div>`).join('');

  // Scroll to preselected villa if coming from modal
  if(state.villaId){
    setTimeout(()=>{
      const sel=grid.querySelector('.villa-opt.selected');
      if(sel) sel.scrollIntoView({behavior:'smooth',block:'nearest'});
    },200);
  }
  // If a villa was preselected but doesn't appear (filtered out by guests), show warning
  if(state.villaId && !toShow.find(v=>v.id===state.villaId)){
    state.villaId=null;
    const n=note.textContent;
    note.textContent=n+' — La villa que habías elegido no tiene capacidad suficiente para tu grupo.';
  }
}

function selectVilla(id){
  state.villaId=id;
  document.querySelectorAll('.villa-opt').forEach(el=>{
    el.classList.toggle('selected',el.getAttribute('onclick').includes("'"+id+"'"));
  });
  
  // Track villa seleccionada (de forma segura, sin romper si falla)
  try {
    if(typeof fbq !== 'undefined' && villaDataFromSheet && villaDataFromSheet[id]) {
      const v = villaDataFromSheet[id];
      const precio = v.precio_noche || v.price || 0;
      fbq('track', 'ViewContent', {
        content_name: 'Villa: ' + (v.name || id),
        content_type: 'product',
        value: precio,
        currency: 'USD'
      });
    }
  } catch(e) {
    // Si falla el tracking, no rompe el flujo
    console.log('Tracking villa error:', e);
  }
}

// ── STEP 4: SERVICES — renderizado dinámico con datos reales
function renderServices(){
  const panel=document.getElementById('svcOptsContainer');
  if(!panel) return;
  const nights=state.nights||1;
  const guests=state.guests||1;
  const cdcTotal=feeCDC*guests*nights;

  // Helper: section header
  const secHeader = (label, hint) =>
    `<div style="grid-column:span 2;margin:1.4rem 0 .6rem;padding-bottom:.6rem;border-bottom:.5px solid rgba(174,133,96,.18)">
      <span style="font-family:'Cinzel',serif;font-size:.5rem;letter-spacing:.3em;color:rgba(212,184,154,.55);text-transform:uppercase">${label}</span>
      ${hint?`<div style="font-size:.78rem;color:rgba(253,250,246,.4);font-style:italic;margin-top:.3rem">${hint}</div>`:''}
    </div>`;

  // Helper: radio-style card (single select)
  const radioCard = (id, name, desc, price, unit, selectedId, onclick) =>
    `<div class="svc-opt ${selectedId===id?'selected':''}" onclick="${onclick}">
      <div class="svc-check"></div>
      <div>
        <div class="svc-opt-name">${name}</div>
        ${desc?`<div class="svc-opt-desc">${desc}</div>`:''}
        <div class="svc-opt-price">USD $${price.toLocaleString()}${unit?' / '+unit:''}</div>
      </div>
    </div>`;

  // Helper: checkbox-style card (multi select)
  const checkCard = (id, name, desc, price, unit, onclick) =>
    `<div class="svc-opt ${state.svcs[id]?'selected':''}" onclick="${onclick}">
      <div class="svc-check"></div>
      <div>
        <div class="svc-opt-name">${name}</div>
        ${desc?`<div class="svc-opt-desc">${desc}</div>`:''}
        <div class="svc-opt-price">USD $${price.toLocaleString()} / ${unit}</div>
      </div>
    </div>`;

  // Accordion toggle helper
  const accHeader = (key, label, emoji) => {
    const open = state.openAccordion === key;
    return `<div style="grid-column:span 2;margin:.4rem 0">
      <button onclick="toggleAccordion('${key}')" style="width:100%;background:rgba(253,250,246,.03);border:.5px solid rgba(174,133,96,${open?'.45':'.18'});padding:.9rem 1.2rem;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:all .3s">
        <span style="font-family:'Cinzel',serif;font-size:.56rem;letter-spacing:.2em;color:${open?'var(--vl)':'rgba(253,250,246,.55)'};text-transform:uppercase">${emoji} ${label}</span>
        <span style="color:var(--v);font-size:.9rem">${open?'−':'+'}</span>
      </button>
    </div>`;
  };

  const accBody = (key, content) => {
    const open = state.openAccordion === key;
    return open ? `<div class="acc-body-wrapper" style="grid-column:span 2">${content}</div>` : '';
  };

  let html = '';

  // ── EMBARCACIONES (Grouped by boat type, responsive layout)
  html += secHeader('Embarcaciones', 'El barco es exclusivo para tu grupo · 9 a 18 hs · Capitán, marinero, aguas y cervezas incluidos');
  html += `<div style="grid-column:span 2;display:grid;grid-template-columns:1fr;gap:1rem">`;
  
  const boatGroups = {};
  barcos.forEach(b => {
    const boatType = b.name.split(' — ')[0];
    if(!boatGroups[boatType]) boatGroups[boatType] = [];
    boatGroups[boatType].push(b);
  });
  
  Object.entries(boatGroups).forEach(([boatType, boats]) => {
    const anySelected = boats.some(b => state.barcos[b.id]);
    const rep = boats[0]; // datos del barco (mismo para todos los destinos)
    
    html += `<div style="border:1px solid rgba(174,133,96,.18);padding:1.4rem;border-radius:12px;background:${anySelected?'rgba(29,77,58,.22)':'rgba(255,255,255,.03)'};transition:all .3s">
      <div style="margin-bottom:1rem">
        <div style="font-family:'Cinzel',serif;font-size:.8rem;letter-spacing:.15em;color:var(--wh);text-transform:uppercase;margin-bottom:.3rem">${boatType}</div>
        <div style="font-size:.82rem;color:rgba(253,250,246,.55);margin-bottom:.25rem">${rep.tipo||''}</div>
        <div style="font-size:.8rem;color:rgba(253,250,246,.4)">hasta ${rep.pax} pasajeros</div>
      </div>

      <div style="font-size:.78rem;color:rgba(253,250,246,.38);margin-bottom:.9rem;font-style:italic">Elegí destino — podés sumar más de uno</div>

      <div style="display:grid;grid-template-columns:${boats.length === 1 ? '1fr' : boats.length === 2 ? '1fr 1fr' : 'repeat(auto-fit,minmax(130px,1fr))'};gap:.7rem;margin-bottom:${anySelected?'1rem':'0'}">
        ${boats.map(b => {
          const destName = b.name.split(' — ')[1] || 'General';
          const sel = state.barcos[b.id];
          return `<button style="padding:.9rem .7rem;text-align:left;background:${sel?'var(--vl)':'rgba(174,133,96,.1)'};color:${sel?'var(--bk)':'rgba(253,250,246,.8)'};border:1px solid ${sel?'var(--vl)':'rgba(174,133,96,.22)'};border-radius:10px;cursor:pointer;transition:all .2s;line-height:1.5" onclick="selectBarco('${b.id}')">
            <div style="font-family:'Cinzel',serif;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.35rem">${destName}</div>
            <div style="font-size:.72rem;opacity:.75;margin-bottom:.4rem">${b.destDesc||''}</div>
            <div style="font-size:.7rem;opacity:.6;margin-bottom:.5rem">⏱ ${b.duracion||''} desde el resort</div>
            <div style="font-size:.82rem;font-weight:600;${sel?'':'color:var(--vl)'}">USD $${b.price.toLocaleString()}<span style="font-size:.65rem;font-weight:400;opacity:.7"> /salida</span></div>
          </button>`;
        }).join('')}
      </div>
      
      ${boats.filter(b => state.barcos[b.id]).map(b => {
        const days = state.barcos[b.id].qty || 1;
        const destName = b.name.split(' — ')[1] || 'General';
        return `<div style="display:flex;align-items:center;gap:.6rem;background:rgba(174,133,96,.1);padding:.7rem 1rem;border-radius:8px;margin-top:.4rem">
          <span style="font-weight:600;color:var(--vl);font-size:.82rem;min-width:90px">${destName}</span>
          <span style="font-size:.78rem;color:rgba(253,250,246,.5)">Salidas:</span>
          <button style="background:rgba(174,133,96,.3);border:none;width:26px;height:26px;cursor:pointer;color:var(--vl);font-size:1rem;border-radius:4px;flex-shrink:0" onclick="changeBoatDays('${b.id}',-1)">−</button>
          <span style="min-width:18px;text-align:center;font-size:.9rem;color:var(--wh);flex-shrink:0">${days}</span>
          <button style="background:rgba(174,133,96,.3);border:none;width:26px;height:26px;cursor:pointer;color:var(--vl);font-size:1rem;border-radius:4px;flex-shrink:0" onclick="changeBoatDays('${b.id}',1)">+</button>
          <span style="margin-left:auto;font-size:.88rem;color:var(--vl);font-weight:600;flex-shrink:0">USD $${(b.price * days).toLocaleString()}</span>
        </div>`;
      }).join('')}
    </div>`;
  });
  
  html += `</div>`;

  // ── TRASLADOS (Permitir múltiples vehículos)
  html += secHeader('Traslados', 'Aeropuerto de Punta Cana ↔ Casa de Campo · Precio cubre ida y vuelta');
  html += `<div style="grid-column:span 2;display:grid;grid-template-columns:1fr 1fr;gap:1rem">`;
  html += traslados.map(t => {
    const key = `traslado_${t.id}`;
    const selected = state.svcs[key] ? true : false;
    const qty = selected ? (state.svcs[key].qty || 1) : 1;
    return `<div style="border:1px solid rgba(174,133,96,.18);padding:1.2rem;border-radius:12px;background:${selected?'rgba(29,77,58,.22)':'rgba(255,255,255,.03)'};transition:all .3s">
      <div style="display:flex;align-items:flex-start;gap:.8rem;margin-bottom:.6rem;cursor:pointer" onclick="toggleTransladoMulti('${t.id}','${t.name}',${t.price},'${t.pax}')">
        <div style="width:18px;height:18px;border:1px solid rgba(174,133,96,.35);border-radius:2px;background:${selected?'var(--teal)':'transparent'};flex-shrink:0;margin-top:.15rem;display:flex;align-items:center;justify-content:center">
          ${selected?'<span style="color:var(--bk);font-size:.8rem">✓</span>':''}
        </div>
        <div style="flex:1">
          <div style="font-family:'Cinzel',serif;font-size:.75rem;letter-spacing:.12em;color:var(--wh);text-transform:uppercase;margin-bottom:.25rem">${t.name}</div>
          <div style="font-size:.82rem;color:rgba(253,250,246,.5);margin-bottom:.2rem">hasta ${t.pax}</div>
          <div style="font-size:.85rem;color:var(--vl);font-weight:500">USD $${t.price.toLocaleString()} <span style="font-size:.72rem;color:rgba(253,250,246,.35);font-weight:400">ida + vuelta</span></div>
        </div>
      </div>
      ${selected?`<div style="display:flex;align-items:center;gap:.6rem;background:rgba(174,133,96,.1);padding:.6rem .9rem;border-radius:8px;margin-top:.5rem">
        <span style="font-size:.78rem;color:rgba(253,250,246,.5)">Vehículos:</span>
        <button style="background:rgba(174,133,96,.3);border:none;width:26px;height:26px;cursor:pointer;color:var(--vl);font-size:1rem;border-radius:4px" onclick="event.stopPropagation();changeTransladoQty('${t.id}',-1)">−</button>
        <span style="min-width:20px;text-align:center;font-size:.9rem;color:var(--wh)">${qty}</span>
        <button style="background:rgba(174,133,96,.3);border:none;width:26px;height:26px;cursor:pointer;color:var(--vl);font-size:1rem;border-radius:4px" onclick="event.stopPropagation();changeTransladoQty('${t.id}',1)">+</button>
        <span style="margin-left:auto;font-size:.88rem;color:var(--vl);font-weight:500">USD $${(t.price*qty).toLocaleString()}</span>
      </div>`:''}
    </div>`;
  }).join('');
  html += `</div>`;

  // ── CARRITOS (Permitir múltiples)
  html += secHeader('Carritos de golf', 'Para moverse dentro del resort · precio por día');
  html += `<div style="grid-column:span 2;display:grid;grid-template-columns:1fr 1fr;gap:1rem">`;
  html += carritos.map(c => {
    const selected = state.svcs[c.id] ? true : false;
    const qty = selected ? (state.svcs[c.id].qty || 1) : 1;
    return `<div style="border:1px solid rgba(174,133,96,.18);padding:1.2rem;border-radius:12px;background:${selected?'rgba(29,77,58,.22)':'rgba(255,255,255,.03)'};transition:all .3s;cursor:pointer" onclick="toggleGolfQty('${c.id}','${c.name}',${c.price},'${c.unit}')">
      <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:${selected?'.8rem':'0'}">
        <div style="width:18px;height:18px;border:1px solid rgba(174,133,96,.35);border-radius:2px;background:${selected?'var(--teal)':'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${selected?'<span style="color:var(--bk);font-size:.8rem">✓</span>':''}
        </div>
        <div>
          <div style="font-family:'Cinzel',serif;font-size:.7rem;letter-spacing:.15em;color:var(--wh);text-transform:uppercase">${c.name}</div>
          <div style="font-size:.8rem;color:rgba(253,250,246,.4)">USD $${c.price.toLocaleString()} / ${c.unit}</div>
        </div>
      </div>
      ${selected?`<div style="display:flex;align-items:center;gap:.5rem;background:rgba(174,133,96,.1);padding:.5rem .8rem;border-radius:8px;font-size:.75rem;color:rgba(253,250,246,.7)" onclick="event.stopPropagation()">
        <button style="background:rgba(174,133,96,.3);border:none;width:24px;height:24px;cursor:pointer;color:var(--vl)" onclick="changeGolfQty('${c.id}',-1)">−</button>
        <span style="min-width:20px;text-align:center">${qty}</span>
        <button style="background:rgba(174,133,96,.3);border:none;width:24px;height:24px;cursor:pointer;color:var(--vl)" onclick="changeGolfQty('${c.id}',1)">+</button>
      </div>`:''}
    </div>`;
  }).join('');
  html += `</div>`;

  // ── AEROPUERTO VIP (Cantidad de personas)
  html += secHeader('Migración VIP', 'Aeropuerto de Punta Cana · Fast Track y Sala VIP · precio por persona');
  html += `<div style="grid-column:span 2;display:grid;grid-template-columns:1fr 1fr;gap:1rem">`;
  html += aeropuerto.map(a => {
    const key = `aeropuerto_${a.id}`;
    const selected = state.svcs[key] ? true : false;
    const qty = selected ? (state.svcs[key].qty || 1) : 1;
    return `<div style="border:1px solid rgba(174,133,96,.18);padding:1.2rem;border-radius:12px;background:${selected?'rgba(29,77,58,.22)':'rgba(255,255,255,.03)'};transition:all .3s;cursor:pointer" onclick="toggleAeropuertoQty('${a.id}','${a.name}',${a.price})">
      <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:${selected?'.8rem':'0'}">
        <div style="width:18px;height:18px;border:1px solid rgba(174,133,96,.35);border-radius:2px;background:${selected?'var(--teal)':'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${selected?'<span style="color:var(--bk);font-size:.8rem">✓</span>':''}
        </div>
        <div>
          <div style="font-family:'Cinzel',serif;font-size:.7rem;letter-spacing:.15em;color:var(--wh);text-transform:uppercase">${a.name}</div>
          <div style="font-size:.8rem;color:rgba(253,250,246,.4)">USD $${a.price.toLocaleString()} / persona</div>
        </div>
      </div>
      ${selected?`<div style="display:flex;align-items:center;gap:.5rem;background:rgba(174,133,96,.1);padding:.5rem .8rem;border-radius:8px;font-size:.75rem;color:rgba(253,250,246,.7)" onclick="event.stopPropagation()">
        <button style="background:rgba(174,133,96,.3);border:none;width:24px;height:24px;cursor:pointer;color:var(--vl)" onclick="changeAeropuertoQty('${a.id}',-1)">−</button>
        <span style="min-width:20px;text-align:center">${qty}</span>
        <button style="background:rgba(174,133,96,.3);border:none;width:24px;height:24px;cursor:pointer;color:var(--vl)" onclick="changeAeropuertoQty('${a.id}',1)">+</button>
        <span style="margin-left:auto">USD $${(a.price*qty).toLocaleString()}</span>
      </div>`:''}
    </div>`;
  }).join('');
  html += `</div>`;

  // ── SERVICIOS EN VILLA
  html += secHeader('Servicios en la casa', 'Opcional · cocinero, limpieza, niñera. Ninguno incluye ingredientes');
  html += villaServices.map(s => {
    const sel = !!state.svcs[s.id];
    if(s.perHour){
      const horas = sel ? (state.svcs[s.id].horas || s.minHoras || 3) : (s.minHoras || 3);
      const subtotal = s.price * horas;
      const hourSelector = sel ? `
        <div onclick="event.stopPropagation()" style="margin-top:.7rem;display:flex;flex-direction:column;gap:.5rem">
          <div style="display:flex;align-items:center;gap:.5rem">
            <span style="font-size:.7rem;color:rgba(253,250,246,.5);min-width:60px">Horas</span>
            <button onclick="changeNineraHoras('${s.id}',-1)" style="width:24px;height:24px;border:1px solid rgba(174,133,96,.4);background:none;color:var(--vl);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">−</button>
            <span style="font-family:'Cinzel',serif;font-size:.7rem;color:var(--wh);min-width:20px;text-align:center">${horas}</span>
            <button onclick="changeNineraHoras('${s.id}',1)" style="width:24px;height:24px;border:1px solid rgba(174,133,96,.4);background:none;color:var(--vl);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">+</button>
          </div>
          <div style="font-size:.7rem;color:var(--vl);margin-top:.2rem">${horas} h × USD $${s.price} = USD $${subtotal.toLocaleString()}</div>
        </div>` : '';
      return `<div class="svc-opt ${sel?'selected':''}" onclick="toggleSvcItem('${s.id}',${s.price},'${s.name}','${s.unit}')">
        <div class="svc-check"></div>
        <div style="flex:1">
          <div class="svc-opt-name">${s.name}</div>
          ${s.tip?`<div class="svc-opt-desc">${s.tip}</div>`:''}
          <div class="svc-opt-price">USD $${s.price.toLocaleString()} / ${s.unit} · mínimo ${s.minHoras} h</div>
          ${hourSelector}
        </div>
      </div>`;
    }
    return checkCard(s.id, s.name, s.tip || '', s.price, s.unit, `toggleSvcItem('${s.id}',${s.price},'${s.name}','${s.unit}')`);
  }).join('');

  // ── ACTIVIDADES — acordeón por categoría
  html += secHeader('Actividades', 'Precio por persona · abrí cada categoría para ver las opciones');

  const actEmojis = {
    'Golf':'', 'Ecuestre':'', 'Tenis':'', 'Pádel':'',
    'Tiro':'', 'Río Chavón':'', 'Cumayasa':'', 'Mar':'',
    'Cigars':'', 'Buceo':'', 'Spa':''
  };

  Object.entries(actividades).forEach(([cat, items]) => {
    html += accHeader(cat, cat, actEmojis[cat]||'');
    const isGolfCat = cat === 'Golf';
    const bodyHtml = items.map(a => {
      const sel = !!state.svcs[a.id];
      const isGolfItem = isGolfCat && a.unit === 'persona';

      let qtySelector = '';
      if(sel && isGolfItem){
        const personas = state.svcs[a.id].golfPersonas || 1;
        const dias     = state.svcs[a.id].golfDias     || 1;
        const subtotal = a.price * personas * dias;
        qtySelector = `
          <div onclick="event.stopPropagation()" style="margin-top:.7rem;display:flex;flex-direction:column;gap:.5rem">
            <div style="display:flex;align-items:center;gap:.5rem">
              <span style="font-size:.7rem;color:rgba(253,250,246,.5);min-width:60px">Personas</span>
              <button onclick="changeGolfPersonas('${a.id}',-1)" style="width:24px;height:24px;border:1px solid rgba(174,133,96,.4);background:none;color:var(--vl);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">−</button>
              <span style="font-family:'Cinzel',serif;font-size:.7rem;color:var(--wh);min-width:20px;text-align:center">${personas}</span>
              <button onclick="changeGolfPersonas('${a.id}',1)" style="width:24px;height:24px;border:1px solid rgba(174,133,96,.4);background:none;color:var(--vl);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">+</button>
            </div>
            <div style="display:flex;align-items:center;gap:.5rem">
              <span style="font-size:.7rem;color:rgba(253,250,246,.5);min-width:60px">Días</span>
              <button onclick="changeGolfDias('${a.id}',-1)" style="width:24px;height:24px;border:1px solid rgba(174,133,96,.4);background:none;color:var(--vl);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">−</button>
              <span style="font-family:'Cinzel',serif;font-size:.7rem;color:var(--wh);min-width:20px;text-align:center">${dias}</span>
              <button onclick="changeGolfDias('${a.id}',1)" style="width:24px;height:24px;border:1px solid rgba(174,133,96,.4);background:none;color:var(--vl);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">+</button>
            </div>
            <div style="font-size:.7rem;color:var(--vl);margin-top:.2rem">
              ${personas} pers. × ${dias} día${dias>1?'s':''} = USD $${subtotal.toLocaleString()}
            </div>
          </div>`;
      } else if(sel){
        const qty = state.svcs[a.id].cantidad || 1;
        qtySelector = `
          <div onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:.5rem;margin-top:.5rem">
            <button onclick="changeActivCantidad('${a.id}',-1)" style="width:24px;height:24px;border:1px solid rgba(174,133,96,.4);background:none;color:var(--vl);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;line-height:1">−</button>
            <span id="actqty-${a.id}" style="font-family:'Cinzel',serif;font-size:.65rem;color:var(--wh);min-width:20px;text-align:center">${qty}</span>
            <button onclick="changeActivCantidad('${a.id}',1)" style="width:24px;height:24px;border:1px solid rgba(174,133,96,.4);background:none;color:var(--vl);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;line-height:1">+</button>
            <span style="font-size:.72rem;color:rgba(253,250,246,.4)">${a.unit}</span>
          </div>`;
      }

      return `<div class="svc-opt ${sel?'selected':''}" onclick="toggleActiv('${a.id}',${a.price},'${a.name.replace(/'/g,"\'")}','${a.unit}')">
        <div class="svc-check"></div>
        <div style="flex:1">
          <div class="svc-opt-name">${a.name}</div>
          ${a.note?`<div class="svc-opt-desc">${a.note}</div>`:''}
          <div class="svc-opt-price">USD $${a.price.toLocaleString()} / ${a.unit}</div>
          ${qtySelector}
        </div>
      </div>`;
    }).join('');
    html += accBody(cat, bodyHtml);
  });

  // ── FEE CDC (informativo)
  html += `<div style="grid-column:span 2;margin-top:1.5rem;padding:1.2rem 1.5rem;border:.5px solid rgba(174,133,96,.2);background:rgba(253,250,246,.02)">
    <div style="font-family:'Cinzel',serif;font-size:.5rem;letter-spacing:.2em;color:var(--v);text-transform:uppercase;margin-bottom:.3rem">Fee Casa de Campo — incluido automáticamente</div>
    <div style="font-size:.82rem;color:rgba(253,250,246,.4)">USD $${feeCDC}/persona/día · ${guests} personas · ${nights} noches = <strong style="color:rgba(253,250,246,.65)">USD $${cdcTotal.toLocaleString()}</strong></div>
  </div>`;

  panel.innerHTML = html;
}

// Selectors para opciones únicas (radio-style)
function selectBarco(id){
  const b=barcos.find(x=>x.id===id);
  if(!b) return;
  // Toggle: si ya está seleccionado este destino exacto, lo quitamos
  if(state.barcos[id]){
    delete state.barcos[id];
    delete state.svcs['_barco_'+id];
  } else {
    // Permitir múltiples barcos (uno por destino)
    state.barcos[id] = { qty: 1, price: b.price, name: b.name };
    state.svcs['_barco_'+id] = { price: b.price, name: b.name, qty: 1 };
  }
  // Mantener state.barcoId apuntando al último seleccionado (legacy)
  const ids = Object.keys(state.barcos);
  state.barcoId = ids.length > 0 ? ids[ids.length-1] : null;
  renderServices();
}

function changeBoatDays(boatId, delta){
  if(state.barcos[boatId]){
    const maxDays = state.nights || 1;
    const cur = state.barcos[boatId].qty || 1;
    const newDays = Math.max(1, Math.min(maxDays, cur + delta));
    state.barcos[boatId].qty = newDays;
    const b = barcos.find(x => x.id === boatId);
    if(b) state.svcs['_barco_'+boatId] = { price: b.price, name: b.name, qty: newDays };
    renderServices();
  }
}
function selectGolf(id){
  // Kept for legacy — golf is now in actividades
  toggleActiv(id, 0, id, 'persona');
}
function selectTraslado(id,price){
  const t=traslados.find(x=>x.id===id);
  if(state.svcs['traslado']===id){delete state.svcs['traslado'];delete state.svcs['_traslado'];}
  else{state.svcs['traslado']=id;state.svcs['_traslado']={price,name:t.name};}
  renderServices();
}

function toggleTransladoMulti(id,name,price,pax){
  const key = `traslado_${id}`;
  if(state.svcs[key]){
    delete state.svcs[key];
  } else {
    state.svcs[key] = {price, name, qty: 1, perQty: true};
  }
  renderServices();
}

function changeTransladoQty(id,delta){
  const key = `traslado_${id}`;
  if(state.svcs[key]){
    const newQty = Math.max(1, (state.svcs[key].qty || 1) + delta);
    const maxNeeded = Math.ceil(state.guests / 6); // Asume max 6 pax por vehículo
    state.svcs[key].qty = Math.min(newQty, maxNeeded + 2);
    renderServices();
  }
}

function toggleGolfQty(id,name,price,unit){
  if(state.svcs[id]){
    delete state.svcs[id];
  } else {
    state.svcs[id] = {price, name, qty: 1, perNight: true};
  }
  renderServices();
}

function changeGolfQty(id,delta){
  if(state.svcs[id]){
    const newQty = Math.max(1, (state.svcs[id].qty || 1) + delta);
    state.svcs[id].qty = newQty;
    renderServices();
  }
}
function selectAeropuerto(id){
  const a=aeropuerto.find(x=>x.id===id);
  if(state.aeropuertoId===id){state.aeropuertoId=null;delete state.svcs['_aeropuerto'];}
  else{state.aeropuertoId=id;state.svcs['_aeropuerto']={price:a.price,name:a.name,perPerson:true};}
  renderServices();
}

function toggleAeropuertoQty(id,name,price){
  const key = `aeropuerto_${id}`;
  if(state.svcs[key]){
    delete state.svcs[key];
  } else {
    state.svcs[key] = {price, name, qty: 1, perPerson: true};
  }
  renderServices();
}

function changeAeropuertoQty(id,delta){
  const key = `aeropuerto_${id}`;
  if(state.svcs[key]){
    const newQty = Math.max(1, Math.min(state.guests, (state.svcs[key].qty || 1) + delta));
    state.svcs[key].qty = newQty;
    renderServices();
  }
}
function toggleSvcItem(id,price,name,unit){
  if(state.svcs[id]){delete state.svcs[id];}
  else{
    const svc = villaServices.find(s=>s.id===id) || {};
    if(svc.perHour){
      state.svcs[id]={price,name,unit,perHour:true,horas:svc.minHoras||3,minHoras:svc.minHoras||3,maxHoras:svc.maxHoras||8};
    } else {
      state.svcs[id]={price,name,unit,perNight:unit==='día'||unit==='noche'};
    }
  }
  renderServices();
}
function changeNineraHoras(id, delta){
  if(!state.svcs[id]) return;
  const s = state.svcs[id];
  const min = s.minHoras || 3, max = s.maxHoras || 8;
  s.horas = Math.max(min, Math.min(max, (s.horas || min) + delta));
  renderServices();
}
function toggleActiv(id,price,name,unit){
  // Find correct data from actividades if not passed
  if(!price){
    for(const items of Object.values(actividades)){
      const found=items.find(a=>a.id===id);
      if(found){price=found.price;name=found.name;unit=found.unit;break;}
    }
  }
  if(state.svcs[id]){
    delete state.svcs[id];
  } else {
    const defaultQty = ['persona','adulto','niño'].includes(unit) ? state.guests : 1;
    // Para golf: guardar personas y dias separados
    const isGolf = unit === 'persona' && (id==='teeth'||id==='dye'||id==='links');
    state.svcs[id]={price,name,unit,perPerson:false,cantidad:defaultQty,
      ...(isGolf ? {golfPersonas: defaultQty, golfDias: 1} : {})
    };
  }
  renderServices();
}
function changeActivCantidad(id, delta){
  if(!state.svcs[id]) return;
  const current = state.svcs[id].cantidad || 1;
  const newVal = Math.max(1, current + delta);
  state.svcs[id].cantidad = newVal;
  const el = document.getElementById('actqty-'+id);
  if(el) el.textContent = newVal;
}
function changeGolfPersonas(id, delta){
  if(!state.svcs[id]) return;
  const cur = state.svcs[id].golfPersonas || 1;
  const newVal = Math.max(1, cur + delta);
  state.svcs[id].golfPersonas = newVal;
  state.svcs[id].cantidad = newVal * (state.svcs[id].golfDias || 1);
  renderServices();
}
function changeGolfDias(id, delta){
  if(!state.svcs[id]) return;
  const maxDias = state.nights || 1;
  const cur = state.svcs[id].golfDias || 1;
  const newVal = Math.max(1, Math.min(maxDias, cur + delta));
  state.svcs[id].golfDias = newVal;
  state.svcs[id].cantidad = (state.svcs[id].golfPersonas || 1) * newVal;
  renderServices();
}
function toggleAccordion(key){
  state.openAccordion = state.openAccordion===key ? null : key;
  renderServices();
}

// Nav links: llevar al configurador y abrir sección específica
function navToSection(seccion){
  const el = document.getElementById('tu-experiencia');
  if(!el) return;
  el.scrollIntoView({behavior:'smooth', block:'start'});
  // Si ya tiene fechas y villa, ir directo al paso de servicios
  if(state.dateIn && state.dateOut && state.nights > 0 && state.villaId){
    setTimeout(()=>{
      window.goStep(4);
      setTimeout(()=>{
        // Abrir el accordion correspondiente
        if(seccion === 'Golf') state.openAccordion = 'Golf';
        else if(seccion === 'Embarcaciones') state.openAccordion = null; // embarcaciones siempre visible
        renderServices();
      }, 300);
    }, 400);
  }
}
// Legacy compatibility
function toggleSvc(el,key,price){
  el.classList.toggle('selected');
  if(el.classList.contains('selected'))state.svcs[key]={price,name:key};
  else delete state.svcs[key];
}

// ── STEP 5: SUMMARY
function renderSummary(){
  const villa=getVillas().find(v=>v.id===state.villaId);
  const nights=state.nights;
  const guests=state.guests;
  const villaTotal=villa?villa.price*nights:0;
  const cdcTotal=feeCDC*guests*nights;

  const di=new Date(state.dateIn+'T12:00:00');
  const dout=new Date(state.dateOut+'T12:00:00');
  const fmt=d=>d.toLocaleDateString('es-AR',{day:'numeric',month:'long'});

  let html=`<div class="summary-title">Tu presupuesto</div>`;
  html+=`<div style="background:rgba(174,133,96,.08);border-left:3px solid var(--vl);padding:1rem 1.2rem;margin-bottom:1.5rem;border-radius:4px;font-size:.9rem;color:rgba(253,250,246,.7)">
    <strong>Precios aproximados</strong> · Temporada, disponibilidad y detalles específicos se confirman en la conversación.
  </div>`;
  html+=`<div class="summary-line"><span class="sl-name">Período</span><span class="sl-val">${fmt(di)} → ${fmt(dout)}</span></div>`;
  html+=`<div class="summary-line"><span class="sl-name">Noches</span><span class="sl-val">${nights} ${nights===1?'noche':'noches'}</span></div>`;
  html+=`<div class="summary-line"><span class="sl-name">Personas</span><span class="sl-val">${guests}</span></div>`;
  html+=`<div style="height:1px;background:rgba(174,133,96,.15);margin:1rem 0"></div>`;
  if(villa){
    html+=`<div class="summary-line"><span class="sl-name">${villa.name}</span><span class="sl-val" style="color:var(--vl)">≈ $${villa.price.toLocaleString()}/noche</span></div>`;
  }
  html+=`<div class="summary-line"><span class="sl-name">Fee Casa de Campo Resort<br><span style="font-size:.7rem;color:rgba(253,250,246,.4);font-style:italic">Tarifa que cobra el resort a inquilinos · USD $${feeCDC}/persona/día</span></span><span class="sl-val" style="color:var(--vl)">≈ $${cdcTotal.toLocaleString()}</span></div>`;

  let extrasTotal=0;
  const extras=[];
  
  // ── TRASLADOS (Multi - ida + vuelta)
  let trasladoTotal=0;
  const trasladosUsados=[];
  Object.entries(state.svcs).forEach(([k,v])=>{
    if(k.startsWith('traslado_') && v.price){
      let amt=v.price*v.qty;
      trasladoTotal+=amt;
      trasladosUsados.push({name:v.name, qty:v.qty, price:v.price, amt});
    }
  });
  if(trasladosUsados.length>0){
    trasladosUsados.forEach(t=>{
      const label=`Traslado Aeropuerto Punta Cana → Casa de Campo (Ida + Vuelta) - ${t.name} × ${t.qty}`;
      extras.push({label,amt:t.amt});
    });
    extrasTotal+=trasladoTotal;
  }
  
  // ── OTROS SERVICIOS (Barcos, Golf, Villa, Aeropuerto VIP, etc)
  Object.entries(state.svcs).forEach(([k,v])=>{
    if(k.startsWith('traslado_')||k.startsWith('barco_dias')||!v.price) return;
    let amt=v.price;
    let label=v.name;
    // Golf: tiene golfPersonas y golfDias
    if(v.golfPersonas && v.golfDias){
      const personas = v.golfPersonas;
      const dias = v.golfDias;
      amt = v.price * personas * dias;
      label += ` (${personas} pers. × ${dias} día${dias>1?'s':''})`;
    } else if(v.cantidad && v.cantidad>1){
      label+=` (${v.cantidad} ${v.unit||''})`;
      amt=v.price*v.cantidad;
    } else if(v.qty && v.qty>1){
      label+=` × ${v.qty}`;
      amt=v.price*v.qty;
    }
    if(v.perHour){const h=v.horas||v.minHoras||3;amt=v.price*h;label+=` (${h} h)`}
    else if(v.perPerson){amt=v.price*guests;label+=` (${guests} pers.)`}
    else if(v.perNight){amt=v.price*nights;label+=` (${nights} ${nights===1?'noche':'noches'})`}
    else if(k.startsWith('aeropuerto_')){amt=v.price*v.qty;label+=` × ${v.qty} personas`}
    extrasTotal+=amt;
    extras.push({label,amt});
  });
  
  if(extras.length>0){
    html+=`<div style="height:1px;background:rgba(174,133,96,.15);margin:1rem 0"></div>`;
    extras.forEach(e=>{
      html+=`<div class="summary-line"><span class="sl-name">${e.label}</span><span class="sl-val" style="color:var(--vl)">≈ $${e.amt.toLocaleString()}</span></div>`;
    });
  }

  const total=villaTotal+cdcTotal+extrasTotal;
  const perPerson=guests>0?Math.round(total/guests):0;
  html+=`<div style="height:1px;background:rgba(174,133,96,.15);margin:1.2rem 0"></div>`;

  html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.2rem">
    <div style="background:rgba(29,77,58,.25);border:1px solid rgba(29,77,58,.4);border-radius:12px;padding:1.2rem;text-align:center">
      <div style="font-family:'Cinzel',serif;font-size:.55rem;letter-spacing:.2em;color:rgba(212,184,154,.6);text-transform:uppercase;margin-bottom:.5rem">Total estadía</div>
      <div style="font-family:'Cinzel',serif;font-size:1.5rem;color:var(--vl);font-weight:400">USD $${total.toLocaleString()}</div>
      <div style="font-size:.72rem;color:rgba(253,250,246,.35);margin-top:.3rem">${nights} noche${nights!==1?'s':''} · ${guests} persona${guests!==1?'s':''}</div>
    </div>
    <div style="background:rgba(174,133,96,.12);border:1px solid rgba(174,133,96,.25);border-radius:12px;padding:1.2rem;text-align:center">
      <div style="font-family:'Cinzel',serif;font-size:.55rem;letter-spacing:.2em;color:rgba(212,184,154,.6);text-transform:uppercase;margin-bottom:.5rem">Por persona</div>
      <div style="font-family:'Cinzel',serif;font-size:1.5rem;color:var(--vl);font-weight:400">USD $${perPerson.toLocaleString()}</div>
      <div style="font-size:.72rem;color:rgba(253,250,246,.35);margin-top:.3rem">todo incluido · aprox.</div>
    </div>
  </div>
  <div style="font-size:.72rem;color:rgba(253,250,246,.28);font-style:italic;text-align:center">Precios referenciales · confirmamos disponibilidad, tarifas exactas y detalles en la conversación</div>`;
  document.getElementById('summaryBox').innerHTML=html;
}

// ── Construye el pData igual que el bot (mismo formato que crearPresupuesto espera)
function buildPresupuestoData(){
  const villa=getVillas().find(v=>v.id===state.villaId);
  const nights=state.nights;
  const guests=state.guests;
  // Parsear fechas para fechaLlegada y fechaSalida legibles
  const di=new Date(state.dateIn+'T12:00:00');
  const dout=new Date(state.dateOut+'T12:00:00');
  const fmtLegible=d=>d.toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});

  const items=[];

  // Villa
  if(villa){
    items.push({
      categoria:'Villa',
      descripcion:villa.name,
      display: villa.display || villa.name,
      cantidad:nights,
      unidad:'noche'
    });
  }

  // Fee CDC
  items.push({
    categoria:'Fee CDC',
    descripcion:'Fee Casa de Campo',
    display:'Fee ingreso CDC',
    cantidad:guests*nights,
    unidad:'persona/dia'
  });

  // Traslado
  if(state.svcs['_traslado']){
    const t=traslados.find(x=>x.id===state.svcs['traslado']);
    if(t) items.push({
      categoria:'Traslado',
      descripcion:t.name,
      display: t.display || t.name,
      cantidad:2,
      unidad:'ida+vuelta'
    });
  }

  // Carritos
  carritos.forEach(c=>{
    if(state.svcs[c.id]) items.push({
      categoria:'Carrito',
      descripcion:c.name,
      display: c.display || c.name,
      cantidad:1,
      unidad:'dia'
    });
  });

  // Barcos — soporta múltiples destinos
  Object.keys(state.barcos || {}).forEach(barcoId => {
    const b=barcos.find(x=>x.id===barcoId);
    const sel = state.barcos[barcoId];
    if(b && sel) items.push({
      categoria:'Embarcación',
      descripcion:b.name,
      display: b.display || b.name,
      cantidad: sel.qty || 1,
      unidad:'salida'
    });
  });

  // Aeropuerto VIP → segunda fila de Traslados en el sheet Base
  if(state.aeropuertoId){
    const a=aeropuerto.find(x=>x.id===state.aeropuertoId);
    if(a) items.push({
      categoria:'Traslado',
      descripcion:a.name,
      display: a.display || a.name,
      cantidad:guests,
      unidad:'persona'
    });
  }

  // Servicios villa
  villaServices.forEach(s=>{
    if(state.svcs[s.id]){
      const sv = state.svcs[s.id];
      items.push({
        categoria:'Servicio Villa',
        descripcion:s.name,
        display: s.name,
        cantidad: sv.perHour ? (sv.horas || s.minHoras || 3) : 1,
        unidad:s.unit
      });
    }
  });

  // Actividades seleccionadas
  Object.entries(actividades).forEach(([cat,actList])=>{
    actList.forEach(act=>{
      if(state.svcs[act.id]){
        const svc = state.svcs[act.id];
        // Para golf: cantidad = personas × días, y el display lo aclara
        const isGolf = svc.golfPersonas && svc.golfDias;
        const cantidad = isGolf
          ? svc.golfPersonas * svc.golfDias
          : (svc.cantidad || 1);
        const displayName = act.display || act.name; // siempre nombre simple, la cantidad ya va aparte
        items.push({
          categoria:'Actividad',
          descripcion: act.name,
          display: displayName,
          cantidad,
          unidad: act.unit
        });
      }
    });
  });

  return {
    adultos: guests,
    ninos: 0,
    noches: nights,
    fechaLlegada: fmtLegible(di),
    fechaSalida: fmtLegible(dout),
    items
  };
}

// ── Guarda contacto en el log apenas se verifica (antes de completar presupuesto)
// Fire-and-forget — no debe bloquear el flujo de verificación
async function guardarContactoParcial(){
  try {
    const u = gateState.userData;
    if(!u) return;
    const villa = getVillas().find(v=>v.id===state.villaId);
    const clientData = {
      nombre:   u.nombre,
      apellido: u.apellido,
      email:    u.email,
      pais:     u.pais,
      telefono: u.tel
    };
    const nota = villa ? `Villa de interés: ${villa.name}` : 'No completó el presupuesto';
    const params = new URLSearchParams();
    params.append('action', 'guardarContacto');
    params.append('cliente', JSON.stringify(clientData));
    params.append('nota', nota);
    // mode:'no-cors' evita problemas CORS — no necesitamos leer la respuesta
    fetch(APPS_SCRIPT_URL, {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body: params.toString(),
      mode:'no-cors'
    }).catch(err => console.warn('[guardarContacto] error no crítico:', err));
  } catch(err){
    console.warn('[guardarContacto] error capturado:', err);
  }
}

// ── Envía la consulta al Apps Script (flujo completo)
async function enviarConsulta(){
  const btn=document.getElementById('submitBtn');
  if(!btn||btn.disabled) return;

  // Necesita usuario verificado
  if(!gateState.verified && sessionStorage.getItem('mg_verified')!=='1'){
    openGate(); return;
  }
  // Recuperar userData de sesión si hace falta
  if(!gateState.userData){
    const saved=sessionStorage.getItem('mg_user');
    if(saved) gateState.userData=JSON.parse(saved);
    else { openGate(); return; }
  }

  btn.disabled=true;
  btn.textContent='Enviando...';

  const u=gateState.userData;
  const clientData={
    nombre:   u.nombre,
    apellido: u.apellido,
    email:    u.email,
    pais:     u.pais,
    telefono: u.tel
  };
  const pData=buildPresupuestoData();

  try {
    const params=new URLSearchParams();
    params.append('cliente',    JSON.stringify(clientData));
    params.append('presupuestoTexto', 'Presupuesto generado desde el sitio web');
    params.append('clienteItems', JSON.stringify(pData));
    params.append('source', 'web');

    const res = await fetch(APPS_SCRIPT_URL, {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body: params.toString(),
      mode:'cors'
    });

    let vf = null;
    try {
      const data = await res.json();
      if(data.valoresFinales) vf = data.valoresFinales;
    } catch(_){}

    // Ocultar resumen y botones
    document.getElementById('summaryBox').style.display='none';
    document.querySelector('#panel5 .cnav').style.display='none';
    document.querySelector('#panel5 .cpanel-sub').style.display='none';
    // Restaurar secciones ocultas durante el resumen
    document.body.classList.remove('showing-summary');

    // Construir pantalla de confirmación con valores reales si los hay
    const nombre = gateState.userData?.nombre || '';
    let confirmHtml = `
      <div style="text-align:center;padding:2rem 1rem">
        <div style="font-size:2.5rem;margin-bottom:1.2rem;color:var(--v)">✓</div>
        <div style="font-family:'Cinzel',serif;font-size:.55rem;letter-spacing:.28em;color:var(--v);text-transform:uppercase;margin-bottom:.8rem">Consulta enviada</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:1.4rem;color:var(--wh);margin-bottom:.5rem">Gracias${nombre?', '+nombre:''}.</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:1rem;color:rgba(253,250,246,.55);line-height:1.8;margin-bottom:1.5rem">
          El equipo de MG Experiences se contacta con vos a la brevedad para confirmar disponibilidad y ultimar los detalles.
        </div>`;

    if(vf && vf.total){
      confirmHtml += `
        <div style="border:.5px solid rgba(174,133,91,.25);padding:1.2rem 1.5rem;text-align:left;margin-bottom:1.2rem">
          <div style="font-family:'Cinzel',serif;font-size:.48rem;letter-spacing:.2em;color:rgba(174,133,91,.6);text-transform:uppercase;margin-bottom:.8rem">Estimado de inversión</div>
          ${vf.villa?`<div style="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.9rem"><span style="color:rgba(253,250,246,.5)">Hospedaje</span><span style="color:var(--wh)">${vf.villa}</span></div>`:''}
          ${vf.traslados&&vf.traslados!=='$0'?`<div style="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.9rem"><span style="color:rgba(253,250,246,.5)">Traslados</span><span style="color:var(--wh)">${vf.traslados}</span></div>`:''}
          ${vf.embarcaciones&&vf.embarcaciones!=='$0'?`<div style="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.9rem"><span style="color:rgba(253,250,246,.5)">Embarcaciones</span><span style="color:var(--wh)">${vf.embarcaciones}</span></div>`:''}
          ${vf.actividades&&vf.actividades!=='$0'?`<div style="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.9rem"><span style="color:rgba(253,250,246,.5)">Actividades</span><span style="color:var(--wh)">${vf.actividades}</span></div>`:''}
          ${vf.feeCDC&&vf.feeCDC!=='$0'?`<div style="display:flex;justify-content:space-between;margin-bottom:.4rem;font-size:.9rem"><span style="color:rgba(253,250,246,.5)">Fee CDC</span><span style="color:var(--wh)">${vf.feeCDC}</span></div>`:''}
          <div style="border-top:.5px solid rgba(174,133,91,.2);margin-top:.8rem;padding-top:.8rem;display:flex;justify-content:space-between">
            <span style="font-family:'Cinzel',serif;font-size:.55rem;letter-spacing:.15em;color:var(--vl);text-transform:uppercase">Total estimado</span>
            <span style="font-size:1.1rem;color:var(--wh);font-family:'Playfair Display',serif">${vf.total}</span>
          </div>
          ${vf.porHuesped?`<div style="text-align:right;font-size:.78rem;color:rgba(253,250,246,.35);margin-top:.2rem">${vf.porHuesped} por persona</div>`:''}
          <div style="font-size:.72rem;color:rgba(253,250,246,.25);margin-top:.8rem;font-style:italic">Valores en USD · Sujetos a disponibilidad · Válidos 7 días</div>
        </div>`;
    }

    confirmHtml += `
        </div>`;

    document.getElementById('confirmBox').innerHTML = confirmHtml;
    document.getElementById('confirmBox').style.display='block';

  } catch(err) {
    btn.disabled=false;
    btn.textContent='Enviar consulta ✦';
    alert('Hubo un error al enviar. Intentá de nuevo o escribinos por WhatsApp.');
  }
}
