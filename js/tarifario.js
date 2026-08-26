// ══════════════════════════════════════════
// TARIFARIO COMPLETO — Columna K del Drive
// Última sincronización: Mayo 2026
// ══════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════
// VILLAS — Cargadas dinámicamente desde Google Sheets (Data Base)
// Columnas A–O del Data Base:
//   A=Categoría|B=Subcategoría|C=Item|D=Variante|E=Unidad
//   F=Pax mín.|G=Pax máx.|H=Detalle|I=Precio USD|J=Margen
// ── VILLAS: CSV público desde Google Sheets (se actualiza automáticamente) ────
// Agregás una villa al sheet → aparece en la web al próximo reload
// CSV URL: publicado desde Archivo → Compartir → Publicar en la web → CSV

// URLs para intentar cargar el CSV (en orden de prioridad)
const CSV_URLS = [
  // 1. CSV publicado (Publicar en la web)
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR3IH2QqoLQhCOPBPXsvLFVPKvmLX4M2M9vkMIOy_GmxlfYRNaDJfD5M7Atdk_-pY2qyjgU-fUCUl7c/pub?gid=718549851&single=true&output=csv',
  // 2. gviz endpoint como CSV
  'https://docs.google.com/spreadsheets/d/1PaZ5YVzsUKwvr7PvdKwhwHtfJBtyQKF0G9t45po6OYo/gviz/tq?tqx=out:csv&gid=718549851',
];

function driveThumb(url, sz) {
  if(!url || !url.trim()) return null;
  sz = sz || 'w1200';
  if(url.includes('thumbnail?id=')) return url;
  var m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if(m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=' + sz;
  return null;
}

let villasFromSheet = [];
let villaDataFromSheet = {};

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const rows = [];
  for(let i = 0; i < lines.length; i++) {
    // Parse CSV respetando comillas
    const cols = [];
    let cur = '', inQ = false;
    for(let c = 0; c < lines[i].length; c++) {
      const ch = lines[i][c];
      if(ch === '"') { inQ = !inQ; }
      else if(ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

async function loadVillasFromSheet() {
  let csvText = null;

  // Intentar cada URL hasta que una funcione
  for(const url of CSV_URLS) {
    try {
      const res = await fetch(url);
      if(!res.ok) continue;
      const text = await res.text();
      // Verificar que sea CSV real (no HTML de error)
      if(text.includes('Villa,Hospedaje') || text.includes('Categoría')) {
        csvText = text;
        console.log('CSV OK desde:', url.substring(0,60), '| chars:', text.length);
        break;
      }
    } catch(e) { console.log('CSV fetch failed:', url.substring(0,60)); }
  }

  if(!csvText) {
    console.log('CSV no disponible — usando datos hardcodeados');
    renderVillaGridFallback();
    return;
  }

  try {
    const rows = parseCSV(csvText);
    console.log('Parsed rows:', rows.length);

    villasFromSheet = [];
    villaDataFromSheet = {};

    // Buscar header row (la que tiene "Categoría" o "Categoria")
    let dataStart = 0;
    for(let i = 0; i < rows.length; i++) {
      if(rows[i][0] && rows[i][0].toLowerCase().includes('categor')) {
        dataStart = i + 1; break;
      }
    }

    for(let i = dataStart; i < rows.length; i++) {
      const r = rows[i];
      if(!r[0] || r[0].toLowerCase() !== 'villa') continue;

      const nombre   = (r[2] || '').trim();
      const detalle  = (r[7] || '').trim();
      const paxMax   = parseInt(r[6]) || 0;
      const display  = (r[11] || '').trim();
      const notas    = (r[12] || '').trim();
      const linkFoto = (r[14] || '').trim(); // O = thumbnail URL
      const linkPDF  = (r[13] || '').trim(); // N = PDF link
      const docDesc  = (r[15] || '').trim(); // P = Descripción
      const docAmen  = (r[16] || '').trim(); // Q = Amenities

      if(!nombre) continue;

      // ✅ FIX: parseo robusto de precios
      // Maneja formatos: "$5,176", "$5.176", "5176", "5176.00", "$5,176.50"
      function parsePrice(s) {
        if (!s) return 0;
        // Eliminar todo excepto dígitos, comas y puntos
        let cleaned = String(s).replace(/[^0-9.,]/g,'').trim();
        if (!cleaned) return 0;
        // Si tiene tanto coma como punto, el último es el decimal
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot   = cleaned.lastIndexOf('.');
        if (lastComma > -1 && lastDot > -1) {
          // Ambos presentes: el último carácter es el decimal real
          if (lastComma > lastDot) {
            // formato europeo: "5.176,50" → 5176.50
            cleaned = cleaned.replace(/\./g,'').replace(',','.');
          } else {
            // formato US: "5,176.50" → 5176.50
            cleaned = cleaned.replace(/,/g,'');
          }
        } else if (lastComma > -1) {
          // Solo coma: puede ser separador de miles "5,176" o decimal "5,50"
          // Heurística: si después de la coma hay 3 dígitos exactos, es separador de miles
          const afterComma = cleaned.substring(lastComma+1);
          if (afterComma.length === 3 && /^\d{3}$/.test(afterComma)) {
            cleaned = cleaned.replace(/,/g,'');
          } else {
            cleaned = cleaned.replace(',','.');
          }
        } else if (lastDot > -1) {
          // Solo punto: puede ser separador de miles "5.176" o decimal "5.50"
          // Heurística: si después del último punto hay 3 dígitos exactos, es separador de miles
          const afterDot = cleaned.substring(lastDot+1);
          if (afterDot.length === 3 && /^\d{3}$/.test(afterDot)) {
            cleaned = cleaned.replace(/\./g,'');
          }
          // si no, dejarlo como está (es decimal)
        }
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      }
      const precioK = parsePrice(r[10]);
      const precioI = parsePrice(r[8]);
      const precio  = precioK > 0 ? precioK : precioI;

      const habM  = detalle.match(/(\d+)\s*hab/i);
      const paxM  = detalle.match(/(\d+)\s*pax/i) || detalle.match(/(\d+)\s*guests/i);
      const hab   = habM ? parseInt(habM[1]) : 0;
      const guests = paxM ? parseInt(paxM[1]) : paxMax;

      const id = nombre.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-z0-9]/g,'');

      // Col O puede ser thumbnail directo o link de carpeta
      // Solo usar como foto si es thumbnail, sino construir desde col N (PDF)
      const isThumbnail = linkFoto && (linkFoto.includes('thumbnail?id=') || linkFoto.includes('lh3.google'));
      const fotoUrl = isThumbnail ? linkFoto : driveThumb(linkPDF);

      const det = detalle.toLowerCase();
      let bgcolor = '#1a2a1a';
      if(det.includes('ocean') || det.includes('minitas') || det.includes('bahía')) bgcolor = '#001a2e';
      else if(det.includes('golf') || det.includes('garden') || det.includes('jardín')) bgcolor = '#0f1f17';
      else if(hab >= 8) bgcolor = '#1a1a2e';

      const obj = {
        id, name: nombre,
        hab, guests, huespedes: guests,
        precio_noche: precio, price: precio,
        label: detalle, display: display || nombre,
        descripcion: notas, notas: '',
        foto_url: fotoUrl, pdf_url: linkPDF,
        carpeta_url: linkFoto,
        descripcion: docDesc,
        amenities: docAmen ? docAmen.split(',').map(s=>s.trim()).filter(Boolean) : detalle.split('/').map(s=>s.trim()).filter(s=>s.length>2),
        bgcolor,
        size: guests >= 12 ? 'large' : 'small',
        amenities: detalle.split('/').map(s=>s.trim()).filter(s=>s.length>2),
        habitaciones: [],
      };

      // Normalizar precio usando fallback
      // El ID del Sheet puede ser "townhousemarina3hab8pax" (incluye detalle)
      // mientras el fallback usa "townhousemarina" — hacer match flexible por prefijo
      const fb = villasFallback.find(f => {
        // Match exacto primero
        if (f.id === id) return true;
        // Match por prefijo: el ID del Sheet empieza con el ID del fallback
        if (id.startsWith(f.id)) return true;
        // Match inverso: el ID del fallback empieza con el ID del Sheet
        if (f.id.startsWith(id)) return true;
        // Match por nombre normalizado (primeras 12 chars)
        const fbNorm = f.name.toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,12);
        const shNorm = nombre.toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,12);
        return fbNorm === shNorm;
      });
      if(fb) {
        const fbPrice = fb.price;
        // Sin precio o precio 0 → usar fallback
        if(!obj.precio_noche || obj.precio_noche <= 0) {
          obj.precio_noche = fbPrice; obj.price = fbPrice;
        }
        // Precio parece estadía completa (>4x precio/noche del fallback) → usar fallback
        else if(obj.precio_noche > fbPrice * 4) {
          obj.precio_noche = fbPrice; obj.price = fbPrice;
        }
      }

      console.log(`[Sheet] ${id}: precio_noche=${obj.precio_noche}, fb=${fb?.id||'none'}, r[8]=${r[8]}, r[10]=${r[10]}`);

      villasFromSheet.push(obj);
      villaDataFromSheet[id] = obj;
    }

    if(villasFromSheet.length > 0) {
      console.log('Villas loaded:', villasFromSheet.length, villasFromSheet.map(v=>v.name));
      renderVillaGrid();
      setTimeout(setupScrollReveal, 150);
    } else {
      renderVillaGridFallback();
    }
  } catch(e) {
    console.error('CSV load error:', e);
    renderVillaGridFallback();
  }
}

function renderVillaGrid() {
  const grid = document.getElementById('villaCatalog');
  if(!grid) return;
  grid.innerHTML = villasFromSheet.map((v, i) => {
    const delay = (i % 4) + 1;
    const imgEl = v.foto_url
      ? `<img class="vi" src="${v.foto_url}" alt="${v.name}" loading="lazy" style="width:100%;height:100%;position:absolute;inset:0;object-fit:cover">`
      : `<div class="vpc-wrap"><svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%"><rect width="300" height="400" fill="${v.bgcolor}"/><text x="150" y="210" font-family="Cinzel,serif" font-size="11" fill="rgba(174,133,96,.3)" text-anchor="middle" letter-spacing="3">${v.name.toUpperCase()}</text></svg></div>`;
    const precioDisplay = v.precio_noche > 0 ? '$' + v.precio_noche.toLocaleString() + '/noche' : 'Consultar precio';
    return `<div class="vc" data-reveal data-delay="${delay}" data-size="${v.size}" onclick="openVModal('${v.id}')">
      <button class="vc-zoom" onclick="event.stopPropagation();const img=this.previousElementSibling?.querySelector&&this.previousElementSibling?.querySelector('img')||this.parentElement.querySelector('img');if(img)openLightbox(img,'${v.name}')">&#x26F6;</button>

      ${imgEl}<div class="vov"></div>
      <div class="vinfo"><div class="vname">${v.name}</div><div class="vdet">${v.hab} hab · ${v.guests} huésp.</div></div>
      <div class="vfoot"><div class="vprice-l">Desde</div><div class="vprice-v">${precioDisplay}</div>
      <button class="vbtn">Ver villa ›</button></div>
    </div>`;
  }).join('');
}

const villasFallback = [
  {id:'altosdechavon',name:'Altos de Chavon',hab:2,guests:4,price:331,size:'small',foto_url:null,bgcolor:'#1a2a1a'},
  {id:'townhousemarina',name:'Townhouse Marina',hab:3,guests:8,price:426,size:'small',foto_url:null,bgcolor:'#1a2a1a'},
  {id:'losaltos3102',carpeta_url:'https://drive.google.com/drive/folders/1ddGzl95nZxzNHhrAoXVx3WLoUxExpcxz',name:'Los Altos 3102',hab:2,guests:6,price:941,size:'small',foto_url:'https://drive.google.com/thumbnail?id=1mybsil6kX9WRM3Amh5IUiUDwVCm9arLj&sz=w1200',bgcolor:'#1a2a1a'},
  {id:'townhousefaro',name:'Townhouse Faro',hab:4,guests:10,price:1326,size:'small',foto_url:null,bgcolor:'#1a2a1a'},
  {id:'messina',carpeta_url:'https://drive.google.com/drive/folders/1nGs_p99MFz-9_KtTl3E0qmrnpm9XfGNl',name:'Messina',hab:5,guests:12,price:1412,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1VoyAjPJ-Kf-A4Ipk_DRA1Te5S-7tqkfk&sz=w1200',bgcolor:'#1a2a1a'},
  {id:'loslagos',name:'Los Lagos',hab:5,guests:10,price:1647,size:'small',foto_url:null,bgcolor:'#0f1f17'},
  {id:'lagos94',name:'Lagos 94',hab:5,guests:10,price:1705,size:'small',foto_url:'https://drive.google.com/thumbnail?id=1qkCE3yAas3bT6TB1kRMOhN1O3Qk_bpTM&sz=w1200',carpeta_url:'https://drive.google.com/drive/folders/1ypL70t8fqlGRNtwQghOnT7KoX-E_5jGc',bgcolor:'#1c1400'},
  {id:'loslagos92',carpeta_url:'https://drive.google.com/drive/folders/1VGuOzJ9vQj3rrVGXgIPdnwYpwS7Liq59',name:'Los Lagos 92',hab:5,guests:10,price:1882,size:'small',foto_url:'https://drive.google.com/thumbnail?id=1HNMY_TdECfeTBZ7NEJqN1jO8JsP2OSx_&sz=w1200',bgcolor:'#0f1f17'},
  {id:'canaria',name:'Canaria',hab:4,guests:8,price:2368,size:'small',foto_url:null,bgcolor:'#1f0d23'},
  {id:'vistamar',name:'Vista Mar',hab:7,guests:18,price:2368,size:'large',foto_url:null,bgcolor:'#0d2b22'},
  {id:'vivero114',carpeta_url:'https://drive.google.com/drive/folders/10efjb0aVXSQkVDcDJI-QiVpGhqnBB_Iy',name:'Vivero 1,14',hab:4,guests:12,price:2471,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1jqYkEgf0qVG64SAMrxgKxsMHX7bbW3Sh&sz=w1200',bgcolor:'#1a2a1a'},
  {id:'laguna',name:'Laguna',hab:5,guests:10,price:2652,size:'small',foto_url:null,bgcolor:'#003535'},
  {id:'canas169',carpeta_url:'https://drive.google.com/drive/folders/1I4L_vVUv7Iaj5D_tlNmRpKP3bl_Qt8K_',name:'Cañas 1,69',hab:4,guests:10,price:2706,size:'small',foto_url:'https://drive.google.com/thumbnail?id=1BZvzAQDTWkJyNs7oaFBHbx9HFADXvkCn&sz=w1200',bgcolor:'#1a2a1a'},
  {id:'ducacique',name:'Du Cacique',hab:8,guests:14,price:2841,size:'large',foto_url:null,bgcolor:'#3a2510'},
  {id:'losranchos',name:'Los Ranchos',hab:6,guests:14,price:2841,size:'large',foto_url:null,bgcolor:'#0d1a2e'},
  {id:'naranjos10',carpeta_url:'https://drive.google.com/drive/folders/1Uz1boJWPocgr7oUKJRRi98YNJxp9gMg1',name:'Naranjos 10',hab:7,guests:14,price:2941,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1q9fltJ_hsT1mt8SVlSQkAJs5A6gGacqA&sz=w1200',bgcolor:'#0f1f17'},
  {id:'vistamar35',carpeta_url:'https://drive.google.com/drive/folders/1qg5M5zuptGNXIs8B8ugu28xOj8W1eAWK',name:'Vista Mar 35',hab:7,guests:16,price:3059,size:'large',foto_url:'https://drive.google.com/thumbnail?id=17XMK_3lWGU38Jd5O_bFJxjFHVE9qJBqI&sz=w1200',bgcolor:'#0d2b22'},
  {id:'colinas21',carpeta_url:'https://drive.google.com/drive/folders/13lNFXKDYypefWxyu5wTVjJmkHVd2VTgB',name:'Colinas 21',hab:4,guests:10,price:3125,size:'small',foto_url:'https://drive.google.com/thumbnail?id=14Tjru4P30rcA2pD68-iab_UQeicJHPQl&sz=w1200',bgcolor:'#0c1f0c'},
  {id:'laplaya',name:'La Playa',hab:3,guests:8,price:3315,size:'small',foto_url:null,bgcolor:'#200d00'},
  {id:'miralejos',name:'Miralejos',hab:6,guests:16,price:3315,size:'large',foto_url:null,bgcolor:'#1a1a2e'},
  {id:'lomas24',carpeta_url:'https://drive.google.com/drive/folders/1BdyV8VuwIjiLSzANm6F8c6WUpvly171S',name:'Lomas 24',hab:7,guests:14,price:3529,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1yPFIL7U0AF6NN1Lvz2TqVjognqVkUiyx&sz=w1200',bgcolor:'#0f1f17'},
  {id:'bali',name:'Villa Bali',hab:6,guests:12,price:3788,size:'large',foto_url:null,bgcolor:'#1a0f00'},
  {id:'naranjos',name:'Villa Naranjos',hab:6,guests:12,price:3788,size:'large',foto_url:null,bgcolor:'#1a1000'},
  {id:'lacatalina',name:'La Catalina',hab:8,guests:20,price:4262,size:'large',foto_url:null,bgcolor:'#1a3a50'},
  {id:'colinas21b',carpeta_url:'https://drive.google.com/drive/folders/13lNFXKDYypefWxyu5wTVjJmkHVd2VTgB',name:'Colinas 21 (12 hab)',hab:12,guests:24,price:4706,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1rF94KmjE0dCHtEMFfw0pc21U0CgYDIRK&sz=w1200',bgcolor:'#0c1f0c'},
  {id:'losmangos',carpeta_url:'https://drive.google.com/drive/folders/1vRid91CRptbjtWex8ezg5wLsAY_POPP7',name:'Los Mangos',hab:6,guests:12,price:4824,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1xBxT5YGDp_51QU3o6sToMJ4XVxnWA9Ov&sz=w1200',bgcolor:'#0f1f17'},
  {id:'costaverde5',carpeta_url:'https://drive.google.com/drive/folders/1_GFXccbzKo3kOEkaBjjG3l7jX8_1hxXf',name:'Costa Verde 5',hab:4,guests:10,price:5176,size:'small',foto_url:'https://drive.google.com/thumbnail?id=1tfWufAcRgFNJ931XhTfcsUr_zXlF42kO&sz=w1200',bgcolor:'#001a2e'},
  {id:'puntaminitas',name:'Punta Minitas',hab:6,guests:12,price:5209,size:'large',foto_url:null,bgcolor:'#001a2e'},
  {id:'puntaminitas5',carpeta_url:'https://drive.google.com/drive/folders/13jVLXLBFV8xgnprkPZoDOaWniS9X_oR4',name:'Punta Minitas 5',hab:8,guests:16,price:6235,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1eG29_oGvDZT5vuFiabFeD1ZqaJ-8gQ_C&sz=w1200',bgcolor:'#001a2e'},
  {id:'puntaminitas19',carpeta_url:'https://drive.google.com/drive/folders/1QhZQWAZcg7FBore4tq5PmIycEPZKtinw',name:'Punta Minitas 19',hab:6,guests:14,price:7529,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1zhsHN_-9ud-ScfF9HzKn5fCQe3EHc8Nf&sz=w1200',bgcolor:'#001528'},
  {id:'puntaaguila57',carpeta_url:'https://drive.google.com/drive/folders/1vV-nRxfBIt3J8-aW138QeHjj8Bnqk-Ss',name:'Punta Águila 57',hab:8,guests:16,price:7882,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1TVlUqLTqKIs9Kg4P46KIznRHk8gtSOwE&sz=w1200',bgcolor:'#001528'},
  {id:'costmar10',carpeta_url:'https://drive.google.com/drive/folders/1B65lk7_oQNnfO-HuoEfLniNpkvVAnEG0',name:'Costa Mar 10',hab:6,guests:12,price:8114,size:'large',foto_url:'https://drive.google.com/thumbnail?id=170qEOw6A-tq4lwJ33cibHT9Tbr_W7FMa&sz=w1200',bgcolor:'#0f1f17'},
  {id:'bahiaminitas3',carpeta_url:'https://drive.google.com/drive/folders/1ESXw9WBZ-I4-Z7536RzuavFme6embdAf',name:'Bahía Minitas 3',hab:5,guests:10,price:9176,size:'small',foto_url:'https://drive.google.com/thumbnail?id=19QRRlCyfUCns_3BCeK4N9RevHSBho98K&sz=w1200',bgcolor:'#001a2e'},
  {id:'bahiaminitas6',carpeta_url:'https://drive.google.com/drive/folders/1lyc23sKAcA2Os3Wr4PFCkVrBg0Lyetck',name:'Bahía Minitas 6',hab:9,guests:18,price:9412,size:'large',foto_url:'https://drive.google.com/thumbnail?id=1IP3Ltr31FkfO2QAXdAy1DaA3-g2U8eOV&sz=w1200',bgcolor:'#001528'},
  {id:'clararoyale',name:'Clara Royale',hab:10,guests:20,price:14206,size:'large',foto_url:null,bgcolor:'#0a2016'},
];
function getVillas() { return villasFromSheet.length > 0 ? villasFromSheet : villasFallback; }
function renderVillaGridFallback() {
  villasFromSheet = villasFallback.map(v => ({
    ...v, precio_noche:v.price, huespedes:v.guests,
    display:v.name, label:v.hab+' hab · '+v.guests+' huésp.',
    descripcion:'', notas:'', amenities:[], habitaciones:[], pdf_url:null,
  }));
  villasFallback.forEach(v => { villaDataFromSheet[v.id] = villasFromSheet.find(x => x.id === v.id); });
  renderVillaGrid();
  setTimeout(setupScrollReveal, 150);
}

loadVillasFromSheet();

// ── SERVICIOS EN VILLA (USD/día)
const villaServices = [
  {id:'limpieza',  name:'Limpieza + Desayuno',                  price:79,  unit:'día', tip:'Desayuno simple incluido. No incluye ingredientes.'},
  {id:'cocinera',  name:'Cocinero medio día (desayuno + almuerzo)',  price:100, unit:'día', tip:'Desayuno y almuerzo básico. No incluye ingredientes.'},
  {id:'cocinera2', name:'Cocinero día completo (desayuno + almuerzo + cena)', price:172, unit:'día', tip:'Mismo cocinero que medio día, suma la cena. No incluye ingredientes.'},
  {id:'chef',      name:'Chef privado (todas las comidas)',     price:286, unit:'día', tip:'Chef profesional con menú a medida. No incluye ingredientes.'},
  {id:'nineraD',   name:'Niñera (día)',                         price:126, unit:'día',  tip:'Hasta 2 niños · Horario: 9:00 a.m. a 4:00 p.m.'},
  {id:'nineraM',   name:'Niñera (Medio día)',                   price:89,  unit:'día',  tip:'Hasta 2 niños · Horario: 9:00 a.m. a 12:00 p.m. ó 1:00 p.m. a 4:00 p.m.'},
  {id:'nineraH',   name:'Niñera (noche)',                       price:21,  unit:'hora', perHour:true, minHoras:3, maxHoras:8, tip:'Hasta 2 niños · A partir de las 4:00 p.m. hasta las 12:00 a.m. Mínimo 3 horas de cuidado nocturno, en la habitación o villa.'},
];

// ── TRASLADOS (USD ida+vuelta)
const traslados = [
  {id:'suv2',  name:'SUV',           pax:'2 pax',  price:242, display:'SUV | 2 pax'},
  {id:'suv6',  name:'Full Size SUV', pax:'6 pax',  price:471, display:'Full Size SUV | 6 pax'},
  {id:'van6',  name:'Minivan',       pax:'6 pax',  price:377, display:'Minivan | 6 pax'},
  {id:'van11', name:'Van',           pax:'11 pax', price:471, display:'Van | 11 pax'},
  {id:'bus16', name:'Mini Bus',      pax:'16 pax', price:530, display:'MiniBus | 16 pax'},
];

// ── CARRITOS (USD/día)
const carritos = [
  {id:'carrito4', name:'Carrito de golf — 4 pax', price:69,  unit:'día', display:'Carrito de golf | 4 pax'},
  {id:'carrito6', name:'Carrito de golf — 6 pax', price:94,  unit:'día', display:'Carrito de golf | 6 pax'},
];

// ── EMBARCACIONES (USD/salida)
const barcos = [
  {id:'bw305palm', name:'Boston Whaler 305 — Palmillas', pax:'hasta 9',  price:1553, display:'Boston Whaler 305 | Palmillas',
   tipo:'Open sport · cubierta descubierta', destDesc:'Banco de arena natural · aguas poco profundas · ideal para relajarse · dentro del Parque Nacional del Este', duracion:'~30 min'},
  {id:'bw305cat',  name:'Boston Whaler 305 — Catalina',  pax:'hasta 9',  price:1553, display:'Boston Whaler 305 | Catalina',
   tipo:'Open sport · cubierta descubierta', destDesc:'Isla virgen · aguas cristalinas · fondo de coral · playa blanca', duracion:'~25 min'},
  {id:'bw305saon', name:'Boston Whaler 305 — Saona',     pax:'hasta 9',  price:2259, display:'Boston Whaler 305 | Saona',
   tipo:'Open sport · cubierta descubierta', destDesc:'Isla Saona · playa remota · aguas turquesas · reserva natural protegida', duracion:'~1 hora'},
  {id:'tiara38p',  name:'Tiara 38LS — Palmillas',        pax:'10 a 12',  price:1765, display:'Tiara 38LS | Palmillas',
   tipo:'Sport cruiser · cabina con aire acondicionado', destDesc:'Banco de arena natural · aguas poco profundas · ideal para relajarse · dentro del Parque Nacional del Este', duracion:'~30 min'},
  {id:'tiara38s',  name:'Tiara 38LS — Saona',            pax:'10 a 12',  price:2942, display:'Tiara 38LS | Saona',
   tipo:'Sport cruiser · cabina con aire acondicionado', destDesc:'Isla Saona · playa remota · aguas turquesas · reserva natural protegida', duracion:'~1 hora'},
  {id:'azimuthp',  name:'Azimuth Flybridge 55 — Palmillas', pax:'13 a 16', price:4706, display:'Azimuth Flybridge 55 | Palmillas',
   tipo:'Flybridge de lujo · cubierta superior · sombra amplia', destDesc:'Banco de arena natural · aguas poco profundas · ideal para relajarse · dentro del Parque Nacional del Este', duracion:'~30 min'},
  {id:'azimuthc',  name:'Azimuth Flybridge 55 — Catalina',  pax:'13 a 16', price:4706, display:'Azimuth Flybridge 55 | Catalina',
   tipo:'Flybridge de lujo · cubierta superior · sombra amplia', destDesc:'Isla virgen · aguas cristalinas · fondo de coral · playa blanca', duracion:'~25 min'},
  {id:'catamaranp',name:'Catamarán — Palmillas',          pax:'17 a 35',  price:2589, display:'Catamaran | Palmillas',
   tipo:'Catamarán · cubierta amplia · ideal grupos grandes', destDesc:'Banco de arena natural · aguas poco profundas · ideal para relajarse · dentro del Parque Nacional del Este', duracion:'~30 min'},
  {id:'catamaranc',name:'Catamarán — Catalina',           pax:'17 a 35',  price:2589, display:'Catamaran | Catalina',
   tipo:'Catamarán · cubierta amplia · ideal grupos grandes', destDesc:'Isla virgen · aguas cristalinas · fondo de coral · playa blanca', duracion:'~25 min'},
];

// ── ACTIVIDADES — organizadas por subcategoría
const actividades = {
  'Golf': [
    {id:'teeth', name:'Teeth of the Dog', price:732, unit:'persona', note:'18% tax inc.', display:'Golf: Teeth of the Dog'},
    {id:'dye',   name:'Dye Fore',         price:620, unit:'persona', note:'18% tax inc.', display:'Golf: Dye Fore'},
    {id:'links', name:'Links',            price:509, unit:'persona', note:'18% tax inc.', display:'Golf: Links'},
  ],
  'Ecuestre': [
    {id:'cab30',   name:'Paseo a caballo 1/2h',          price:43,  unit:'persona',   display:'Ecuestre: Paseo a caballo 1/2h'},
    {id:'cab60',   name:'Paseo a caballo 1h',            price:79,  unit:'persona',   display:'Ecuestre: Paseo a caballo 1h'},
    {id:'cab120',  name:'Paseo a caballo 2h',            price:127, unit:'persona',   display:'Ecuestre: Paseo a caballo 2h'},
    {id:'ponies',  name:'Ponies niños 1/2h',             price:37,  unit:'niño',      display:'Ecuestre: Ponies niños 1/2h'},
    {id:'equ30',   name:'Lección equitación/salto 1/2h', price:85,  unit:'persona',   display:'Ecuestre: Lección equitación/salto 1/2h'},
    {id:'equ60',   name:'Lección equitación/salto 1h',   price:132, unit:'persona',   display:'Ecuestre: Lección equitación/salto 1h'},
    {id:'polo',    name:'Lección polo profesional',      price:211, unit:'persona/h', display:'Ecuestre: Lección polo profesional'},
    {id:'poloas',  name:'Asistente polo',                price:127, unit:'persona/h', display:'Ecuestre: Asistente polo'},
    {id:'donkey',  name:'Donkey Polo',                   price:74,  unit:'persona/h', display:'Ecuestre: Donkey Polo'},
    {id:'ranch',   name:'Tour ranchos',                  price:179, unit:'persona',   display:'Ecuestre: Tour ranchos'},
    {id:'ranchp',  name:'Tour ranchos con picnic',       price:253, unit:'persona',   display:'Ecuestre: Tour ranchos con picnic'},
  ],
  'Tenis': [
    {id:'ten_dia',  name:'Cancha diurna',                     price:42,  unit:'hora',   display:'Tenis: Cancha diurna'},
    {id:'ten_noc',  name:'Cancha nocturna',                   price:52,  unit:'hora',   display:'Tenis: Cancha nocturna'},
    {id:'ten_dir',  name:'Clase privada con Director',        price:168, unit:'hora',   display:'Tenis: Clase privada con Director'},
    {id:'ten_pro',  name:'Clase con Pro',                     price:79,  unit:'hora',   display:'Tenis: Clase con Pro'},
    {id:'ten_semi', name:'Clase semiprivada con Pro (2 pax)', price:100, unit:'hora',   display:'Tenis: Clase semiprivada con Pro (2 pax)'},
    {id:'ten_head', name:'Clase con Head Pro (2 pax)',        price:216, unit:'hora',   display:'Tenis: Clase con Head Pro (2 pax)'},
    {id:'ten_comp', name:'Compañero de práctica',             price:69,  unit:'hora',   display:'Tenis: Compañero de práctica'},
    {id:'ten_clin', name:'Clínica grupal',                    price:48,  unit:'p/hora', display:'Tenis: Clínica grupal'},
    {id:'ten_clinn',name:'Clínica grupal niños',              price:37,  unit:'p/hora', display:'Tenis: Clínica grupal niños'},
    {id:'ten_maq',  name:'Máquina de pelotas',                price:31,  unit:'uso',    display:'Tenis: Máquina de pelotas'},
    {id:'ten_raq',  name:'Alquiler raqueta',                  price:20,  unit:'uso',    display:'Tenis: Alquiler raqueta'},
  ],
  'Pádel': [
    {id:'pad_dia',  name:'Cancha diurna',              price:48,  unit:'hora',   display:'Padel: Cancha diurna'},
    {id:'pad_noc',  name:'Cancha nocturna',            price:52,  unit:'hora',   display:'Padel: Cancha nocturna'},
    {id:'pad_dir',  name:'Clase privada con Director', price:105, unit:'hora',   display:'Padel: Clase privada con Director'},
    {id:'pad_pro',  name:'Clase con Pro',              price:94,  unit:'hora',   display:'Padel: Clase con Pro'},
    {id:'pad_semi', name:'Clase semiprivada con Pro',  price:115, unit:'hora',   display:'Padel: Clase semiprivada con Pro'},
    {id:'pad_clin', name:'Clínica grupal',             price:42,  unit:'p/hora', display:'Padel: Clínica grupal pádel'},
    {id:'pad_clind',name:'Clínica grupal con Director',price:48,  unit:'p/hora', display:'Padel: Clínica grupal pádel con Director'},
    {id:'pad_clinn',name:'Clínica grupal niños',       price:42,  unit:'p/hora', display:'Padel: Clínica grupal niños'},
    {id:'pad_comp', name:'Compañero de práctica',      price:42,  unit:'p/hora', display:'Padel: Compañero de práctica'},
    {id:'pad_maq',  name:'Máquina de pelotas',         price:58,  unit:'uso',    display:'Padel: Máquina de pelotas'},
    {id:'pad_raq',  name:'Alquiler raqueta',           price:11,  unit:'uso',    display:'Padel: Alquiler raqueta'},
  ],
  'Tiro': [
    {id:'skeet', name:'Skeet & Trap',       price:53,  unit:'persona', display:'Tiro: Skeet & Trap'},
    {id:'five',  name:'Five Stand',         price:58,  unit:'persona', display:'Tiro: Five Stand'},
    {id:'caza',  name:'Simulación cacería', price:137, unit:'persona', display:'Tiro: Simulación cacería'},
  ],
  'Río Chavón': [
    {id:'kayak2', name:'Kayak doble', price:64, unit:'persona', display:'Río Chavón: Kayak doble'},
    {id:'kayak1', name:'Kayak simple',price:48, unit:'persona', display:'Río Chavón: Kayak simple'},
  ],
  'Cumayasa': [
    {id:'zip_a', name:'Zipline adultos', price:92,  unit:'persona', display:'Cumayasa: Zipline adultos'},
    {id:'zip_n', name:'Zipline niños',   price:63,  unit:'niño',    display:'Cumayasa: Zipline niños'},
    {id:'bug1',  name:'Buggies simple',  price:120, unit:'persona', display:'Cumayasa: Buggies simple'},
    {id:'bug2',  name:'Buggies doble',   price:92,  unit:'persona', display:'Cumayasa: Buggies doble'},
  ],
  'Mar': [
    {id:'cat_a',  name:'Isla Catalina tour grupal (adulto)', price:51, unit:'adulto',  display:'Mar: Isla Catalina tour grupal adulto'},
    {id:'cat_n',  name:'Isla Catalina tour grupal (niño)',   price:32, unit:'niño',    display:'Mar: Isla Catalina tour grupal niño'},
    {id:'snork',  name:'Snorkeling Minitas Beach',           price:20, unit:'día',     display:'Mar: Snorkeling Minitas Beach'},
    {id:'kmin',   name:'Kayak Minitas Beach',                price:27, unit:'hora',    display:'Mar: Kayak Minitas Beach'},
    {id:'kminm',  name:'Kayak Minitas Beach (máximo)',       price:37, unit:'hora',    display:'Mar: Kayak Minitas Beach (máximo)'},
    {id:'banana', name:'Banana boat',                        price:22, unit:'persona', display:'Mar: Banana boat'},
    {id:'hobie',  name:'Hobie Wave',                         price:53, unit:'hora',    display:'Mar: Hobie Wave'},
  ],
  'Cigars': [
    {id:'cigar', name:'Cigar Factory Tour', price:22, unit:'persona', display:'Cigar: Cigar Factory Tour'},
  ],
  'Buceo': [
    {id:'buceo_cat_md', name:'Excursión medio día Catalina',             price:74,  unit:'persona', display:'ScubaCaribe: Excursión medio día Catalina'},
    {id:'buceo_bay',    name:'Buceo Catalina doble tanque — Bayahibe',   price:79,  unit:'persona', display:'ScubaCaribe: Buceo Catalina doble tanque desde Bayahibe'},
    {id:'buceo_pca',    name:'Buceo Catalina doble tanque — Punta Cana', price:122, unit:'persona', display:'ScubaCaribe: Buceo Catalina doble tanque desde Punta Cana'},
    {id:'buceo_upg',    name:'Buceo Bayahibe upgrade desde Punta Cana',  price:91,  unit:'persona', display:'ScubaCaribe: Buceo Bayahibe upgrade desde Punta Cana'},
    {id:'buceo_alm',    name:'Buceo Catalina + almuerzo',                price:200, unit:'persona', display:'ScubaCaribe: Excursión buceo Catalina doble tanque + almuerzo'},
    {id:'padi',         name:'Curso PADI Open Water (3 días)',           price:509, unit:'persona', display:'ScubaCaribe: Curso PADI Open Water (3 días)'},
  ],
  'Spa': [
    {id:'spa_wj',   name:'Wellness Journeys 110min',        price:492, unit:'persona', note:'tax+serv.inc.', display:'Spa: Wellness Journeys 110min'},
    {id:'spa_love', name:'Art of Self-Love 170min',         price:667, unit:'persona', note:'tax+serv.inc.', display:'Spa: Art of Self-Love 170min'},
    {id:'spa_m50',  name:'Masaje 50min (desde)',            price:250, unit:'persona', note:'tax+serv.inc.', display:'Spa: Masaje 50min (desde)'},
    {id:'spa_m80',  name:'Masaje 80min',                    price:371, unit:'persona', note:'tax+serv.inc.', display:'Spa: Masaje 80min'},
    {id:'spa_fac',  name:'Faciales (desde)',                price:250, unit:'persona', note:'tax+serv.inc.', display:'Spa: Faciales (desde)'},
    {id:'spa_hfp',  name:'HydraFacial Platinum',           price:573, unit:'persona', note:'tax+serv.inc.', display:'Spa: HydraFacial Platinum'},
    {id:'spa_hfd',  name:'HydraFacial Deluxe',             price:438, unit:'persona', note:'tax+serv.inc.', display:'Spa: HydraFacial Deluxe'},
    {id:'spa_corp', name:'Tratamientos corporales (desde)', price:250, unit:'persona', note:'tax+serv.inc.', display:'Spa: Tratamientos corporales (desde)'},
  ],
};

// ── AEROPUERTO VIP (USD/persona)
const aeropuerto = [
  {id:'arr',    name:'Solo llegada VIP Fast Track',                          price:168, display:'Arrival VIP Fast Track'},
  {id:'arrDep', name:'Llegada + Salida VIP Fast Track & Lounge',             price:274, display:'Arrival VIP Fast Track + Departure VIP Fast Track & Lounge Access'},
  {id:'works',  name:'The Works — llegada + salida + concierge completo',    price:526, display:'The Works: Arrival & Departure VIP- Concierge Assisted'},
  {id:'dep',    name:'Solo salida VIP Fast Track & Lounge (sin asistencia)', price:116, display:'Departure PLUS VIP Fast Track & Lounge Access (Unassisted)'},
  {id:'depcon', name:'Solo salida VIP Concierge + Lounge',                   price:368, display:'Departure VIP Concierge + Lounge Access'},
];

// ── FEE CDC (USD/persona/día)
const feeCDC = 27;

// ── CALENDAR
const calState = {
  mode: null,       // 'in' or 'out'
  viewYear: null,
  viewMonth: null,
  selIn: null,      // Date object
  selOut: null      // Date object
};

function openCal(mode) {
  const drop = document.getElementById('calDrop');
  const isOpen = drop.classList.contains('open');
  if (isOpen && calState.mode === mode) {
    drop.classList.remove('open');
    calState.mode = null;
    return;
  }
  calState.mode = mode;
  const today = new Date();
  if (!calState.viewYear) {
    calState.viewYear = today.getFullYear();
    calState.viewMonth = today.getMonth();
  }
  drop.classList.add('open');
  renderCalendar();
  document.getElementById('calHint').textContent =
    mode === 'in' ? 'Seleccioná la fecha de llegada' : 'Seleccioná la fecha de salida';
  // Close if clicking outside
  setTimeout(() => {
    document.addEventListener('click', calOutside, {once: true, capture: true});
  }, 0);
}

function calOutside(e) {
  const wrap = document.querySelector('.cal-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('calDrop').classList.remove('open');
    calState.mode = null;
  } else {
    document.addEventListener('click', calOutside, {once: true, capture: true});
  }
}

function calShift(dir) {
  calState.viewMonth += dir;
  if (calState.viewMonth > 11) { calState.viewMonth = 0; calState.viewYear++; }
  if (calState.viewMonth < 0)  { calState.viewMonth = 11; calState.viewYear--; }
  renderCalendar();
}

function renderCalendar() {
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const y = calState.viewYear, m = calState.viewMonth;
  document.getElementById('calMonthLabel').textContent = MONTHS[m] + ' ' + y;

  const firstDay = new Date(y, m, 1);
  // Monday-first: Sunday=6, Mon=0
  let startDow = firstDay.getDay(); // 0=Sun,1=Mon...
  startDow = (startDow + 6) % 7;   // shift so Mon=0

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  let html = '';
  // Empty cells before first day
  for (let i = 0; i < startDow; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const isPast = date < today;
    const isIn  = calState.selIn  && date.toDateString() === calState.selIn.toDateString();
    const isOut = calState.selOut && date.toDateString() === calState.selOut.toDateString();
    const inRange = calState.selIn && calState.selOut && date > calState.selIn && date < calState.selOut;
    const isWk = (date.getDay() === 0 || date.getDay() === 6);

    let cls = 'cal-day';
    if (isPast) cls += ' past';
    if (isIn)   cls += ' selected-in';
    if (isOut)  cls += ' selected-out';
    if (inRange) cls += ' in-range';
    if (isWk)   cls += ' wk';

    const onclick = isPast ? '' : `onclick="selectCalDay(${y},${m},${d})"`;
    html += `<div class="${cls}" ${onclick}>${d}</div>`;
  }

  document.getElementById('calDays').innerHTML = html;
}

function selectCalDay(y, m, d) {
  const date = new Date(y, m, d);

  if (calState.mode === 'in') {
    calState.selIn = date;
    // Reset out if it's before new in
    if (calState.selOut && calState.selOut <= date) calState.selOut = null;
    calState.mode = 'out';
    document.getElementById('calHint').textContent = 'Seleccioná la fecha de salida';
  } else {
    if (date <= calState.selIn) {
      // If they pick before/same as in, treat as new in
      calState.selIn = date;
      calState.selOut = null;
      calState.mode = 'out';
      document.getElementById('calHint').textContent = 'Seleccioná la fecha de salida';
    } else {
      calState.selOut = date;
      document.getElementById('calDrop').classList.remove('open');
      calState.mode = null;
    }
  }

  // Update display fields
  const fmt = dt => dt ? dt.toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'}) : 'Seleccioná';
  document.getElementById('cfInVal').textContent  = fmt(calState.selIn);
  document.getElementById('cfOutVal').textContent = fmt(calState.selOut);

  // Highlight active field
  document.getElementById('cfIn').classList.toggle('active', calState.mode === 'in');
  document.getElementById('cfOut').classList.toggle('active', calState.mode === 'out');

  // Update state for configurator
  if (calState.selIn) {
    state.dateIn = `${calState.selIn.getFullYear()}-${String(calState.selIn.getMonth()+1).padStart(2,'0')}-${String(calState.selIn.getDate()).padStart(2,'0')}`;
  }
  if (calState.selOut) {
    state.dateOut = `${calState.selOut.getFullYear()}-${String(calState.selOut.getMonth()+1).padStart(2,'0')}-${String(calState.selOut.getDate()).padStart(2,'0')}`;
    const msDay = 86400000;
    state.nights = Math.round((calState.selOut - calState.selIn) / msDay);
    const nd = document.getElementById('nights-display');
    if (nd) nd.textContent = state.nights + (state.nights === 1 ? ' noche' : ' noches');
  }

  renderCalendar();
}

// ── META PIXEL TRACKING FUNCTIONS ──
function trackViewConfigurador() {
  if (typeof fbq !== 'undefined') {
    fbq('track', 'ViewContent', {
      content_name: 'Configurador de Presupuesto',
      content_type: 'product',
      value: 1.00,
      currency: 'USD'
    });
  }
}

function trackVillaSelected(villaName, villaPrice) {
  if (typeof fbq !== 'undefined') {
    fbq('track', 'ViewContent', {
      content_name: 'Villa Seleccionada: ' + villaName,
      content_type: 'product',
      value: villaPrice,
      currency: 'USD'
    });
  }
}

function trackPresupuestoViewed(presupuestoTotal) {
  if (typeof fbq !== 'undefined') {
    fbq('track', 'AddToCart', {
      content_name: 'Presupuesto Generado',
      content_type: 'product',
      value: presupuestoTotal,
      currency: 'USD'
    });
  }
}

function trackLeadCapturado(email, nombre, presupuesto) {
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', {
      content_name: 'Lead Capturado',
      content_type: 'lead',
      value: presupuesto,
      currency: 'USD'
    });
    
    fbq('track', 'Contact', {
      content_name: 'Cliente de Alto Valor',
      value: presupuesto,
      currency: 'USD'
    });
  }
}

function trackPresupuestoCompleto(montoTotal) {
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Purchase', {
      content_name: 'Presupuesto Completado',
      content_type: 'product',
      value: montoTotal,
      currency: 'USD'
    });
  }
}
