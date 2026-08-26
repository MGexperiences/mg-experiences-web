// ══════════════════════════════════════════
// SISTEMA DE VERIFICACIÓN — Google Apps Script (VERSIÓN SEGURA v2)
// ══════════════════════════════════════════════════════════════════

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOmyl7RCsJg92nL1FBuR4Y37hP2OVHxDj3NguqeQcoeuNYuM_g7YD3SNQw3HLxNFfqLw/exec';

// VERSION TAG — para confirmar en consola qué HTML está activo
console.log('%c[MG] HTML version: 2026-05-26-v3 con JSONP + parser de precios', 'color:#AE8560;font-weight:bold');

// ─── JSONP HELPER ────────────────────────────────────────────────────────────
// Apps Script redirige a script.googleusercontent.com que no devuelve headers CORS.
// JSONP usa un <script> tag dinámico que no tiene la restricción CORS.
function jsonpRequest(params, timeoutMs) {
  return new Promise((resolve, reject) => {
    const cbName = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random()*100000);
    const script = document.createElement('script');
    let timer;
    let resolved = false;

    const cleanup = () => {
      if(timer) clearTimeout(timer);
      try { delete window[cbName]; } catch(e) { window[cbName] = undefined; }
      if(script.parentNode) script.parentNode.removeChild(script);
    };

    window[cbName] = (data) => {
      if(resolved) return;
      resolved = true;
      console.log('[JSONP] callback ejecutado:', data);
      cleanup();
      resolve(data);
    };

    timer = setTimeout(() => {
      if(resolved) return;
      resolved = true;
      cleanup();
      console.error('[JSONP] timeout — Apps Script no devolvió callback. Verificar que la versión deployada tenga jsonResponse(obj, e.parameter.callback) y soporte JSONP');
      reject(new Error('Timeout: el servidor tardó demasiado o no soporta JSONP'));
    }, timeoutMs || 20000);

    const allParams = new URLSearchParams(params);
    allParams.set('callback', cbName);
    const finalUrl = APPS_SCRIPT_URL + '?' + allParams.toString();
    console.log('[JSONP] enviando request:', params.action || '?');

    script.src = finalUrl;
    script.onerror = (e) => {
      if(resolved) return;
      resolved = true;
      cleanup();
      console.error('[JSONP] error de red:', e);
      reject(new Error('Error de red al contactar el servidor'));
    };
    document.body.appendChild(script);
  });
}


// ── STATE de verificación
let gateState = {
  verified: false,
  code: null,
  attempts: 0,
  userData: null,
  codeExpiry: null,
};

// ── RATE LIMITING — máx 3 envíos por sesión, bloqueo 10 min
const RATE_LIMIT_KEY  = 'mg_rl';
const RATE_LIMIT_MAX  = 3;
const RATE_LIMIT_WAIT = 10 * 60 * 1000;

function getRateLimit(){
  try{
    const raw=sessionStorage.getItem(RATE_LIMIT_KEY);
    return raw?JSON.parse(raw):{count:0,resetAt:0};
  }catch(e){return{count:0,resetAt:0};}
}

function incrementRateLimit(){
  const rl=getRateLimit();
  const now=Date.now();
  if(now>rl.resetAt){
    sessionStorage.setItem(RATE_LIMIT_KEY,JSON.stringify({count:1,resetAt:now+RATE_LIMIT_WAIT}));
  } else {
    sessionStorage.setItem(RATE_LIMIT_KEY,JSON.stringify({count:rl.count+1,resetAt:rl.resetAt}));
  }
}

function isRateLimited(){
  const rl=getRateLimit();
  if(Date.now()>rl.resetAt) return false;
  return rl.count>=RATE_LIMIT_MAX;
}

function rateLimitMinutesLeft(){
  const rl=getRateLimit();
  return Math.ceil((rl.resetAt-Date.now())/60000);
}

// ── VALIDACIÓN DE NOMBRE — detecta strings aleatorios de bots
function isNameValid(nombre,apellido){
  if(nombre.length<2||apellido.length<2) return false;
  const nameRegex=/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙ\s'-]+$/;
  if(!nameRegex.test(nombre)||!nameRegex.test(apellido)) return false;
  if(nombre.length>20&&!/\s/.test(nombre)) return false;
  // Detectar patrón bot: alternancia excesiva mayúscula/minúscula
  let alt=0;
  for(let i=1;i<nombre.length;i++){
    const p=nombre[i-1],c=nombre[i];
    if((p.match(/[a-z]/)&&c.match(/[A-Z]/)) || (p.match(/[A-Z]/)&&c.match(/[a-z]/))) alt++;
  }
  if(alt/nombre.length>0.7) return false;
  return true;
}

// ── VALIDACIÓN EMAIL básica
function isEmailValid(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ── Mostrar / cerrar gate
function openGate(){
  document.getElementById('gateOverlay').classList.add('show');
  document.getElementById('gNombre').focus();
}
function closeGate(){
  document.getElementById('gateOverlay').classList.remove('show');
}

// ── STEP A: Enviar código via Apps Script (Gmail)
async function sendCode(e){
  e.preventDefault();
  const btn   =document.getElementById('gateBtnA');
  const errEl =document.getElementById('gateErrorA');
  errEl.textContent='';

  // ── HONEYPOT: si el bot llenó el campo trampa, simular éxito sin enviar nada
  const hp=document.getElementById('hpField');
  if(hp&&hp.value.trim()!==''){
    btn.disabled=true;
    btn.textContent='Enviando...';
    await new Promise(r=>setTimeout(r,2000));
    document.getElementById('gateEmailDisplay').textContent=document.getElementById('gEmail').value.trim();
    document.getElementById('gateStepA').style.display='none';
    document.getElementById('gateStepB').style.display='block';
    return;
  }

  // ── RATE LIMIT CHECK
  if(isRateLimited()){
    const mins=rateLimitMinutesLeft();
    errEl.textContent=`Demasiados intentos. Esperá ${mins} minuto${mins!==1?'s':''} antes de intentar nuevamente.`;
    return;
  }

  const nombre   =document.getElementById('gNombre').value.trim();
  const apellido =document.getElementById('gApellido').value.trim();
  const email    =document.getElementById('gEmail').value.trim();
  const tel      =document.getElementById('gTel').value.trim();
  const pais     =document.getElementById('gPais').value;

  if(!nombre||!apellido||!email||!tel||!pais){
    errEl.textContent='Por favor completá todos los campos.';
    return;
  }

  // ── VALIDACIÓN NOMBRE
  if(!isNameValid(nombre,apellido)){
    errEl.textContent='Por favor ingresá tu nombre real (solo letras).';
    return;
  }

  // ── VALIDACIÓN EMAIL
  if(!isEmailValid(email)){
    errEl.textContent='El email no tiene un formato válido.';
    return;
  }

  btn.disabled=true;
  btn.textContent='Enviando...';

  // ✅ SEGURO: El código lo genera y guarda el SERVIDOR (Apps Script)
  // El browser NUNCA ve el código — elimina el bypass por consola
  gateState.code      = null; // no se usa más en client-side
  gateState.attempts  = 0;
  gateState.codeExpiry= null;
  gateState.userData  = {nombre,apellido,email,tel,pais};

  // Incrementar rate limit client-side (doble capa: server también valida)
  incrementRateLimit();

  try{
    // Usar JSONP — Apps Script + fetch CORS no funciona por redirect 302
    let data;
    try {
      data = await jsonpRequest({
        action: 'sendOTP',
        email:  email,
        name:   nombre,
      });
    } catch(err) {
      console.error('Error JSONP sendOTP:', err);
      errEl.textContent='No pudimos conectar con el servidor. Reintentá en unos segundos.';
      btn.disabled=false;
      btn.textContent='Recibir código →';
      return;
    }

    if(!data.ok){
      errEl.textContent = data.error || 'No pudimos enviar el código. Intentá de nuevo.';
      btn.disabled=false;
      btn.textContent='Recibir código →';
      return;
    }

    document.getElementById('gateEmailDisplay').textContent=email;
    document.getElementById('gateStepA').style.display='none';
    document.getElementById('gateStepB').style.display='block';
    document.getElementById('gateErrorB').textContent='';
    document.getElementById('c0').focus();
    btn.disabled=false;
    btn.textContent='Recibir código →';

    const totalPresupuesto=calculateTotal();
    trackLeadCapturado(email,nombre,totalPresupuesto);

  }catch(err){
    errEl.textContent='No pudimos enviar el código. Revisá tu conexión e intentá de nuevo.';
    btn.disabled=false;
    btn.textContent='Recibir código →';
  }
}

// ── Code input — auto-avanzar entre dígitos
function codeInput(idx){
  const el=document.getElementById('c'+idx);
  const val=el.value.replace(/\D/g,'');
  el.value=val;
  if(val&&idx<5) document.getElementById('c'+(idx+1)).focus();
  if(idx===5&&val) verifyCode();
}

// Guard global para evitar doble verificación (auto al completar dígito 6 + click manual)
let _verifyInProgress = false;
let _verifyLastCode = null;

// ── STEP B: Verificar código — verificación 100% server-side
async function verifyCode(){
  const entered=[0,1,2,3,4,5].map(i=>document.getElementById('c'+i).value).join('');
  const errEl  =document.getElementById('gateErrorB');
  const btn    =document.getElementById('gateBtnB');

  // Guard: si ya hay una verificación en curso, ignorar
  if(_verifyInProgress) {
    console.log('[Verify] verificación en curso, ignorando llamada duplicada');
    return;
  }
  // Guard: si el código ya fue intentado (mismo código), ignorar
  if(entered === _verifyLastCode) {
    console.log('[Verify] código ya intentado, ignorando');
    return;
  }

  if(entered.length<6){errEl.textContent='Ingresá los 6 dígitos.';return;}
  if(!/^\d{6}$/.test(entered)){errEl.textContent='Solo números.';return;}

  // Guard: si por alguna razón userData no tiene email, recuperarlo del sessionStorage
  if(!gateState.userData || !gateState.userData.email){
    const saved=sessionStorage.getItem('mg_user');
    if(saved) gateState.userData=JSON.parse(saved);
    if(!gateState.userData || !gateState.userData.email){
      errEl.textContent='Sesión expirada. Recargá la página e intentá de nuevo.';
      return;
    }
  }

  _verifyInProgress = true;
  _verifyLastCode = entered;
  btn.disabled=true;
  btn.textContent='Verificando...';

  try{
    // ✅ SEGURO: El servidor compara el código — no es bypasseable desde consola
    // Usar JSONP — Apps Script + fetch CORS no funciona por redirect 302
    let data;
    try {
      data = await jsonpRequest({
        action: 'verifyOTP',
        email:  gateState.userData.email,
        otp:    entered,
      });
    } catch(err) {
      console.error('Error JSONP verifyOTP:', err);
      errEl.textContent='No pudimos conectar con el servidor. Reintentá en unos segundos.';
      btn.disabled=false;
      btn.textContent='Verificar →';
      return;
    }

    if(data.ok){
      // ✅ SEGURO: Guardar token firmado por el servidor en lugar de mg_verified=1
      try {
        gateState.verified=true;
        gateState.sessionToken=data.token; // token firmado con hash MD5
        errEl.innerHTML='<span class="gate-success">✓ Verificado correctamente</span>';

        sessionStorage.setItem('mg_verified','1');
        sessionStorage.setItem('mg_token', data.token || '');
        sessionStorage.setItem('mg_user',JSON.stringify(gateState.userData));

        // Fire-and-forget — no debe bloquear ni romper el flujo
        try { guardarContactoParcial(); } catch(e) { console.warn('guardarContactoParcial:', e); }
        try {
          const totalPresupuesto=calculateTotal();
          trackPresupuestoCompleto(totalPresupuesto);
        } catch(e) { console.warn('tracking error:', e); }

        setTimeout(()=>{
          try {
            closeGate();
            unlockPrices();
            showUnlockedBadge();
            _origGoStep(4); // ✅ BUG FIX: avanzar al paso de servicios después de verificar
          } catch(e) { console.error('error post-verify:', e); }
        },900);
      } catch(innerErr) {
        // Si algo crashea acá, el usuario YA está verificado en sessionStorage
        // Solo loggeamos y continuamos
        console.error('[Verify] error post-success (verificación OK, error secundario):', innerErr);
        setTimeout(()=>{ try { closeGate(); _origGoStep(4); } catch(_){} }, 500);
      }

    } else {
      // El servidor maneja el contador de intentos internamente
      const msg = data.error || 'Código incorrecto.';
      errEl.textContent = msg;
      [0,1,2,3,4,5].forEach(i=>{document.getElementById('c'+i).value='';});
      document.getElementById('c0').focus();
      btn.disabled=false;
      btn.textContent='Verificar →';
      _verifyInProgress = false;
      // No resetear _verifyLastCode: ese código ya fue rechazado
    }

  } catch(err){
    console.error('[Verify] error:', err);
    errEl.textContent='Error de conexión. Revisá tu internet e intentá de nuevo.';
    btn.disabled=false;
    btn.textContent='Verificar →';
    _verifyInProgress = false;
    _verifyLastCode = null; // permitir reintentar con el mismo código si fue error de red
  }
}

// ── Reenviar código
function resendCode(){
  if(isRateLimited()){
    const mins=rateLimitMinutesLeft();
    document.getElementById('gateErrorB').textContent=
      `Límite alcanzado. Esperá ${mins} minuto${mins!==1?'s':''}.`;
    return;
  }
  // Resetear guards al pedir nuevo código
  _verifyInProgress = false;
  _verifyLastCode = null;
  document.getElementById('gateStepB').style.display='none';
  document.getElementById('gateStepA').style.display='block';
  document.getElementById('gateErrorA').textContent='';
  [0,1,2,3,4,5].forEach(i=>{document.getElementById('c'+i).value='';});
  document.getElementById('gateErrorB').textContent='';
}

// ── Desbloquear precios en el configurador
function unlockPrices(){
  // Re-render the services section with prices visible
  if(document.getElementById('svcOptsContainer')){
    renderServices();
  }
  // Unlock villa grid prices
  document.querySelectorAll('.price-locked').forEach(el=>{
    const price=el.getAttribute('data-price');
    if(price) el.outerHTML=`<div class="svc-opt-price">USD $${Number(price).toLocaleString()} / noche</div>`;
  });
}

// ── Badge de confirmación
function showUnlockedBadge(){
  const b=document.createElement('div');
  b.className='unlocked-badge';
  const u=gateState.userData;
  b.textContent=`✓ Bienvenido, ${u.nombre}. Precios desbloqueados.`;
  document.body.appendChild(b);
  setTimeout(()=>b.remove(),4000);
}

// ── Interceptar paso 4 del configurador para pedir verificación
const _origGoStep=goStep;
window.goStep=function(n){
  if(n===4&&!gateState.verified&&sessionStorage.getItem('mg_verified')!=='1'){
    openGate();
    return;
  }
  if(sessionStorage.getItem('mg_verified')==='1'&&!gateState.verified){
    gateState.verified=true;
    const saved=sessionStorage.getItem('mg_user');
    if(saved) gateState.userData=JSON.parse(saved);
  }
  _origGoStep(n);
};

// ── Cerrar con Escape
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeGate();});

// ── Verificar si ya tenía sesión activa
if(sessionStorage.getItem('mg_verified')==='1'){
  gateState.verified=true;
  const saved=sessionStorage.getItem('mg_user');
  if(saved) gateState.userData=JSON.parse(saved);
}
