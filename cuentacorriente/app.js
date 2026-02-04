// app.js (único archivo JS) — SOLO FIREBASE (sin localStorage)
// Importante: este archivo debe cargarse como <script type="module" src="./app.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

/* =========================
   FIREBASE INIT
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyAuIf3Hv2ymT4AP3tdg2IOIEnTaYUez7eU",
  authDomain: "cuenta-c-bertinelli-lin.firebaseapp.com",
  projectId: "cuenta-c-bertinelli-lin",
  storageBucket: "cuenta-c-bertinelli-lin.firebasestorage.app",
  messagingSenderId: "456522423280",
  appId: "1:456522423280:web:e26a3ad2c45d27117f9b35"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const EDITOR_UID = "uQ3bumEGUFWBaPC28M5BxZVWaqn2";
const CC_REF = doc(db, "cuentas", "bertinelli-lin");

/* =========================
   GLOBALS / HELPERS
========================= */
let applyingRemote = false;
let lastLocalRev = 0;
let canWrite = false;

let currentUid = null;
const who = () => currentUid || "anon";

const $ = (id) => document.getElementById(id);

const fmt = (n) => Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
const MESES = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
};

function show(id) { $(id).classList.add("show"); }
function hide(id) { $(id).classList.remove("show"); }
function isPeriodo(x) { return /^\d{2}\/\d{4}$/.test(String(x || "").trim()); }

function periodoActual() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${yyyy}`;
}

/* =========================
   FIREBASE STATE I/O
========================= */
async function pushRemote(state) {
  if (!canWrite) throw new Error("NO_WRITE");
  if (applyingRemote) return;

  state._meta = state._meta || {};
  state._meta.rev = (state._meta.rev || 0) + 1;
  state._meta.updatedAt = Date.now();
  state._meta.updatedBy = who();
  lastLocalRev = state._meta.rev;

  await setDoc(CC_REF, { state }, { merge: true });
}

function makeInitialState() {
  return {
    meta: {
      escritura_num: "434",
      registro: "30",
      escribano: "Norberto Gustavo Soler",
      vendedor: "José Orlando BERTINELLI",
      comprador: "Lautaro Nahuel LIN RACIOPPI",
      dni_vendedor: "11.824.116",
      dni_comprador: "41.757.592",
      inmueble: "25 de Mayo 8, 6º C, Ciudadela",
      saldo_inicial: 8150,
      entrega_inicial: 5000,
      entrega_inicial_label: "Entrega inicial ya efectuada",
      ref_mes: "22 de diciembre 2025"
    },
    recibo_seq: 0,
    recibos: [],
    movs: [
      {
        id: crypto.randomUUID(),
        periodo: "12/2025",
        concepto: "Apertura de cuenta corriente (saldo convenido)",
        debito: 8150,
        credito: 0,
        recibo_num: null,
        adjunto: null,
        obs: null
      }
    ]
  };
}

async function pullRemoteOrInit() {
  const snap = await getDoc(CC_REF);

  if (snap.exists()) {
    const data = snap.data();
    if (data && data.state) return data.state;
  }

  if (!canWrite) {
    throw new Error("DOC_NOT_FOUND_OR_EMPTY_AND_NO_PERMISSION");
  }

  const initial = makeInitialState();
  initial._meta = { rev: 1, updatedAt: Date.now(), updatedBy: who() };

  await setDoc(CC_REF, { state: initial }, { merge: true });
  return initial;
}

async function hardReset(stateRef) {
  if (!confirm("Reset TOTAL: borra Firebase. ¿Seguro?")) return stateRef;

  if (!canWrite) {
    alert("No tenés permisos de edición para resetear.");
    return stateRef;
  }

  const fresh = makeInitialState();
  fresh._meta = { rev: 1, updatedAt: Date.now(), updatedBy: who() };

  applyingRemote = true;
  await setDoc(CC_REF, { state: fresh }, { merge: true });
  applyingRemote = false;

  alert("Listo: reseteado en Firebase.");
  return fresh;
}

/* =========================
   CALCULOS
========================= */
function calcSaldos(state) {
  let saldo = 0;
  return state.movs.map(m => {
    saldo = saldo + Number(m.debito || 0) - Number(m.credito || 0);
    return { ...m, saldo };
  });
}

function totalPagado(state) {
  return state.movs.reduce((acc, m) => acc + Number(m.credito || 0), 0);
}

function unidades(n) { return ["CERO", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"][n] || ""; }

function decenas(n) {
  const esp = {
    10: "DIEZ", 11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
    16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
    20: "VEINTE", 21: "VEINTIUNO", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO",
    25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE"
  };
  if (esp[n]) return esp[n];
  const tens = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const d = Math.floor(n / 10), u = n % 10;
  if (d < 3) return esp[n] || "";
  return u === 0 ? tens[d] : `${tens[d]} Y ${unidades(u)}`;
}

function centenas(n) {
  const c = Math.floor(n / 100);
  const rest = n % 100;
  const map = {
    1: "CIENTO", 2: "DOSCIENTOS", 3: "TRESCIENTOS", 4: "CUATROCIENTOS", 5: "QUINIENTOS",
    6: "SEISCIENTOS", 7: "SETECIENTOS", 8: "OCHOCIENTOS", 9: "NOVECIENTOS"
  };
  if (n === 100) return "CIEN";
  let out = c > 0 ? map[c] : "";
  if (rest > 0) out = out ? (out + " " + numeroEnLetras(rest)) : numeroEnLetras(rest);
  return out || "CERO";
}

function miles(n) {
  if (n < 1000) return centenas(n);
  const m = Math.floor(n / 1000);
  const rest = n % 1000;
  let out = (m === 1) ? "MIL" : `${numeroEnLetras(m)} MIL`;
  if (rest > 0) out += " " + centenas(rest);
  return out;
}

function numeroEnLetras(n) {
  n = Math.floor(Number(n || 0));
  if (n < 0) return "MENOS " + numeroEnLetras(-n);
  if (n < 10) return unidades(n);
  if (n < 100) return decenas(n);
  if (n < 1000) return centenas(n);
  if (n < 1000000) return miles(n);
  const mill = Math.floor(n / 1000000);
  const rest = n % 1000000;
  let out = (mill === 1) ? "UN MILLON" : `${numeroEnLetras(mill)} MILLONES`;
  if (rest > 0) out += " " + miles(rest);
  return out;
}

function montoEnFormatoReciboUSD(monto) {
  const m = Math.floor(Number(monto || 0));
  const letras = numeroEnLetras(m);
  return `DOLARES BILLETES ESTADOUNIDENSES ${letras} (U$D ${m})`;
}

function nextReciboNum2(state) {
  state.recibo_seq = (state.recibo_seq || 0) + 1;
  return String(state.recibo_seq).padStart(2, "0");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function abrirMailImputacion({ to, cc, subject, body }) {
  const enc = encodeURIComponent;
  const normalized = String(body || "").replace(/\\n/g, "\r\n");
  let url = `mailto:${enc(to)}?subject=${enc(subject)}&body=${enc(normalized)}`;
  if (cc) url += `&cc=${enc(cc)}`;
  window.location.href = url;
}

/* =========================
   PLAN DE PAGOS
========================= */
function generarPlanBase(state) {
  const plan = [];

  plan.push({
    periodo: "12/2025",
    concepto: state.meta.entrega_inicial_label || "Entrega inicial ya efectuada",
    cuota: Number(state.meta.entrega_inicial || 0),
    saldo_proyectado: Number(state.meta.saldo_inicial || 0),
    estado: "Pagado",
    tipo: "antecedente"
  });

  let saldo = Number(state.meta.saldo_inicial || 0);
  let mes = 1, anio = 2026;

  function push(monto, concepto = "Pago mensual") {
    const periodo = String(mes).padStart(2, "0") + "/" + anio;
    saldo = Math.max(0, saldo - monto);
    plan.push({ periodo, concepto, cuota: monto, saldo_proyectado: saldo, estado: "Pendiente", tipo: "cuota" });
    mes++;
    if (mes === 13) { mes = 1; anio++; }
  }

  if (saldo > 0) push(Math.min(150, saldo), "Pago mensual (enero)");
  while (saldo > 0) push(Math.min(500, saldo), "Pago mensual");

  return plan;
}

function aplicarPagosAlPlan(plan, state) {
  let pagado = totalPagado(state);

  for (const fila of plan) {
    if (fila.tipo === "antecedente") continue;
    if (pagado <= 0) break;

    if (pagado >= fila.cuota) {
      fila.estado = "Pagado";
      pagado -= fila.cuota;
    } else {
      fila.estado = "Parcial";
      pagado = 0;
    }
  }
  return plan;
}

function estimacionFin(plan) {
  const cuotas = plan.filter(p => p.tipo === "cuota");
  const firstPendingIdx = cuotas.findIndex(p => p.estado !== "Pagado");
  if (firstPendingIdx === -1) return { fin: "(cancelado)", cuotasRestantes: 0 };
  const lastNotPagada = cuotas.slice(firstPendingIdx).pop();
  return { fin: lastNotPagada ? lastNotPagada.periodo : "(—)", cuotasRestantes: cuotas.slice(firstPendingIdx).length };
}

/* =========================
   RECIBO PRINT
========================= */
function openReciboPrint(state, rec, modo, saldoLuego) {
  const isImputado = (modo === "imputado");
  const [mm, yyyy] = String(rec.periodo).split("/");
  const mes = MESES[mm] || mm;

  const monto = Math.floor(Number(rec.monto || 0));
  const montoLinea = montoEnFormatoReciboUSD(monto);

  const saldoBlock = (isImputado && typeof saldoLuego === "number")
    ? `<div class="kv"><span class="k">Saldo pendiente luego del presente pago:</span> <b>USD ${fmt(saldoLuego)}</b></div>`
    : ``;

  const docTitle = `Recibo R${rec.numero} – ${rec.periodo}`;
  const fileName = `recibo_R${rec.numero}_${String(rec.periodo).replace("/", "-")}.html`;

  const copyHtml = `
  <div class="copy">

    <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px;">
      <div class="h1" style="margin:0;">RECIBO N° ${rec.numero}</div>
      <div class="h2" style="margin:0; text-align:right;">Cuenta Corriente – Bertinelli / Lin Racioppi</div>
    </div>

    <div style="display:flex; justify-content:space-between; gap:16px; margin:10px 0 6px 0;">
      <div class="kv" style="margin:0;">
        <span class="k">Período imputado:</span> <span class="b">${rec.periodo}</span>
      </div>

      <div class="kv" style="margin:0; text-align:right;">
        <span class="k">Concepto:</span> <span class="b">${rec.concepto}</span>
      </div>
    </div>

    <p class="txt">
      <br>
      En la ciudad de Buenos Aires, en el mes de <span class="b">${mes} de ${yyyy}</span>,
      recibí de <span class="b">${state.meta.comprador}</span> la suma de
      <span class="upper">${montoLinea}</span>,
      en concepto de pago a cuenta del saldo pendiente de la operación de compraventa instrumentada mediante
      <span class="b">Escritura Pública Nº ${state.meta.escritura_num}</span> (Registro Notarial Nº ${state.meta.registro}),
      referida al mes de <span class="b">${state.meta.ref_mes}</span>.
    </p>

    ${saldoBlock}

    <div class="grow"></div>

    <div class="sigGrid">
      <div>
        <div class="line"></div>
        <div class="lineLabel">${state.meta.comprador}</div>
        <div class="lineLabel">DNI: ${state.meta.dni_comprador}</div>
      </div>

      <div>
        <div class="line"></div>
        <div class="lineLabel">${state.meta.vendedor}</div>
        <div class="lineLabel">DNI: ${state.meta.dni_vendedor}</div>
      </div>
    </div>
  </div>
  `;

  const html = `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${docTitle}</title>
<style>
  @page{ size:A4 portrait; margin:0; }
  html,body{ height:100%; }
  body{ margin:0; font-family:system-ui,Segoe UI,Arial; color:#111; background:#fff; }

  :root{
    --barH:56px;
    --PAD:12mm;
    --GAP:10mm;
  }

  .topbar{
    position: sticky;
    top:0;
    z-index:10;
    height: var(--barH);
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    padding: 10px 12px;
    background:#fff;
    border-bottom: 1px solid #e5e7eb;
  }
  .topbar .ttl{
    font-size:14px;
    font-weight:900;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .btn{
    border:1px solid #111;
    background:#f2f2f2;
    padding:8px 12px;
    border-radius:10px;
    font-weight:800;
    cursor:pointer;
  }

  .page{
    width: 210mm;
    height: 297mm;
    padding: var(--PAD);
    box-sizing: border-box;
    position: relative;
    display:flex;
    flex-direction:column;
    gap: var(--GAP);
  }

  .cutGuide{
    position:absolute;
    left: var(--PAD);
    right: var(--PAD);
    top: calc(var(--PAD) + (297mm - (var(--PAD) * 2)) / 2);
    border-top: 1px dashed #9ca3af;
    pointer-events:none;
  }

  .copy{
    height: calc(((297mm - (var(--PAD) * 2)) - var(--GAP)) / 2);
    box-sizing:border-box;
    border:1px solid #111;
    border-radius:10px;
    padding: 10mm;
    display:flex;
    flex-direction:column;
    min-height:0;
    overflow:hidden;
  }

  p{
    text-align: justify;
    text-justify: inter-word;
    hyphens: auto;
    -webkit-hyphens: auto;
    overflow-wrap: break-word;
  }

  .h1{font-size:18px;font-weight:900;margin:0 0 4px 0}
  .h2{font-size:14px;font-weight:800;margin:0}
  .txt{font-size:14.5px;line-height:1.62;margin:0 0 10px 0}
  .b{font-weight:900}
  .upper{font-weight:900;text-transform:uppercase}

  .kv{margin:8px 0;font-size:14px}
  .k{color:#222}

  .grow{ flex:1; min-height:0; }

  .sigGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:10px}
  .lineLabel{font-size:12.5px;color:#333;margin-top:6px}
  .line{border-top:1px solid #111;margin-top:16px}

  @media screen{
    body{ background:#e5e7eb; }
    .page{
      margin: 12px auto;
      box-shadow:0 10px 30px rgba(0,0,0,.15);
      background:#fff;
    }
  }

  @media (max-width: 900px){
    .page{
      width: calc(100vw - 16px);
      height: auto;
      padding: 14px;
      gap: 12px;
    }
    .cutGuide{ display:none; }
    .copy{ height:auto; overflow:visible; }
  }

  @media print{
    .topbar{ display:none; }
    body{ background:#fff; }
    .page{
      margin:0;
      box-shadow:none;
    }
  }
</style>
</head>
<body>

<div class="topbar">
  <div class="ttl">${docTitle}</div>
  <button class="btn" id="btnCta">...</button>
</div>

<div class="page">
  ${copyHtml}
  ${copyHtml}
  <div class="cutGuide" aria-hidden="true"></div>
</div>

<script>
  async function shareHtml(){
    const html = document.documentElement.outerHTML;
    const file = new File([html], ${JSON.stringify(fileName)}, { type:"text/html" });

    if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ title:${JSON.stringify(docTitle)}, text:${JSON.stringify(docTitle)}, files:[file] });
      return true;
    }

    const blob = new Blob([html], {type:"text/html"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    alert("Tu navegador no soporta compartir. Se descargó el HTML para que lo envíes.");
    return false;
  }

  function isShareMode(){
    const canShare = !!(navigator.share && navigator.canShare);
    const isTouch = (navigator.maxTouchPoints || 0) > 0;
    const isSmall = window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
    return canShare && (isTouch || isSmall);
  }

  const btn = document.getElementById("btnCta");
  function syncCTA(){
    if(isShareMode()){
      btn.textContent = "Compartir";
      btn.onclick = ()=> shareHtml().catch(err=>{ console.error(err); alert("No se pudo compartir."); });
    } else {
      btn.textContent = "Imprimir";
      btn.onclick = ()=> window.print();
    }
  }
  syncCTA();
  window.addEventListener("resize", syncCTA);
<\/script>

</body>
</html>`;

  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* =========================
   ADJUNTO VIEWER
========================= */
function abrirAdjunto(adjunto) {
  const w = window.open("", "_blank");
  if (!adjunto?.dataUrl) {
    w.document.write("<p style='font-family:system-ui'>No hay adjunto.</p>");
    w.document.close();
    return;
  }

  const safeName = (adjunto.name || "adjunto").replaceAll("<", "").replaceAll(">", "");
  const isPdf = (adjunto.type || "").includes("pdf");
  const title = `Adjunto – ${safeName}`;

  const html = `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  :root{ --barH:56px; }
  html,body{ height:100%; }
  body{ margin:0; font-family:system-ui,Segoe UI,Arial; background:#fff; color:#111; }

  .topbar{
    position: sticky;
    top:0;
    z-index:10;
    height: var(--barH);
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    padding: 10px 12px;
    background:#fff;
    border-bottom: 1px solid #e5e7eb;
  }
  .ttl{
    font-size:14px;
    font-weight:900;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .btn{
    border:1px solid #111;
    background:#f2f2f2;
    padding:8px 12px;
    border-radius:10px;
    font-weight:800;
    cursor:pointer;
  }

  .viewer{
    height: calc(100dvh - var(--barH));
    width: 100vw;
    overflow:auto;
    background:#fff;
  }

  .imgWrap{ display:flex; justify-content:center; padding: 12px; }
  img{ max-width: 100%; height: auto; border:1px solid #ddd; border-radius:10px; }
  embed{ width:100%; height:100%; border:none; }

  @media print{
    .topbar{ display:none; }
    .viewer{ height:auto; }
  }
</style>
</head>
<body>

<div class="topbar">
  <div class="ttl">${title}</div>
  <button class="btn" id="btnCta">...</button>
</div>

<div class="viewer">
  ${isPdf
    ? `<embed src="${adjunto.dataUrl}" type="application/pdf" />`
    : `<div class="imgWrap"><img src="${adjunto.dataUrl}" alt="Adjunto"/></div>`
  }
</div>

<script>
  function dataUrlToBlob(dataUrl){
    const parts = dataUrl.split(",");
    const meta = parts[0];
    const b64 = parts[1];
    const m = /data:(.*?);base64/.exec(meta);
    const type = m ? m[1] : "application/octet-stream";
    const bin = atob(b64);
    const len = bin.length;
    const arr = new Uint8Array(len);
    for(let i=0;i<len;i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], {type});
  }

  async function shareAdj(){
    const blob = dataUrlToBlob(${JSON.stringify(adjunto.dataUrl)});
    const file = new File([blob], ${JSON.stringify(safeName)}, { type: ${JSON.stringify(adjunto.type || "application/octet-stream")} });

    if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ title:${JSON.stringify(title)}, text:${JSON.stringify(title)}, files:[file] });
      return true;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    alert("Tu navegador no soporta compartir. Se descargó el archivo para que lo envíes.");
    return false;
  }

  function isShareMode(){
    const canShare = !!(navigator.share && navigator.canShare);
    const isTouch = (navigator.maxTouchPoints || 0) > 0;
    const isSmall = window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
    return canShare && (isTouch || isSmall);
  }

  const btn = document.getElementById("btnCta");
  function syncCTA(){
    if(isShareMode()){
      btn.textContent = "Compartir";
      btn.onclick = ()=> shareAdj().catch(err=>{ console.error(err); alert("No se pudo compartir."); });
    } else {
      btn.textContent = "Imprimir";
      btn.onclick = ()=> window.print();
    }
  }
  syncCTA();
  window.addEventListener("resize", syncCTA);
<\/script>

</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* =========================
   ACUERDO + ANEXO
========================= */
function printPlanYAcuerdo(state) {
  const plan = aplicarPagosAlPlan(generarPlanBase(state), state);

  const filas = plan.map(p => `
    <tr>
      <td>${p.periodo}</td>
      <td>${p.concepto}</td>
      <td class="num">${fmt(p.cuota)}</td>
      <td>${p.estado}</td>
      <td class="num">${fmt(p.saldo_proyectado)}</td>
    </tr>
  `).join("");

  const docTitle = "Acuerdo y Anexo – Cuenta Corriente";

  const fechaObj = new Date(Date.now());
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fecha = `${fechaObj.getDate()} de ${meses[fechaObj.getMonth()]} de ${fechaObj.getFullYear()}`;

  const acuerdo = `
    <h1>ACUERDO PRIVADO DE CANCELACIÓN DE SALDO</h1>
    <p class="fecha">Buenos Aires, ${fecha}</p>

    <p>
      Entre el Sr. <b>${state.meta.vendedor}</b>, DNI <b>${state.meta.dni_vendedor}</b>, en adelante <b>EL VENDEDOR</b>, y el Sr.
      <b>${state.meta.comprador}</b>, DNI <b>${state.meta.dni_comprador}</b>, en adelante <b>EL COMPRADOR</b>, se celebra el presente acuerdo,
      sujeto a las siguientes cláusulas:
    </p>

    <p><b>PRIMERA – Antecedentes.</b> Las partes manifiestan que celebraron la compraventa del inmueble sito en
      <b>${state.meta.inmueble}</b>, instrumentada mediante <b>Escritura Pública Nº ${state.meta.escritura_num}</b>, pasada ante el
      <b>Registro Notarial Nº ${state.meta.registro}</b>, referida al mes de <b>${state.meta.ref_mes}</b>.
    </p>

    <p><b>SEGUNDA – Entrega inicial ya efectuada.</b> Las partes dejan constancia de que el COMPRADOR entregó en concepto de entrega inicial la suma de
      <b>U$S ${fmt(state.meta.entrega_inicial)}</b>, quedando el saldo convenido en cuenta corriente determinado en función de dicha entrega.
    </p>

    <p><b>TERCERA – Saldo pendiente.</b> Las partes reconocen un saldo pendiente a cargo del COMPRADOR por <b>U$S ${fmt(state.meta.saldo_inicial)}</b>.</p>

    <p><b>CUARTA – Forma de pago.</b> El saldo será cancelado conforme esquema: a) enero 2026: U$S 150; b) desde el período siguiente: pagos mensuales de referencia de U$S 500 hasta cancelar el saldo.</p>

    <p><b>QUINTA – Adelantos.</b> El COMPRADOR podrá efectuar pagos adelantados o superiores sin penalidad. Dichos adelantos se imputarán al saldo y acortarán la duración total del plan.</p>

    <p><b>SEXTA – Carácter.</b> El plan se recalcula por adelantos, manteniéndose la obligación de cancelar el saldo hasta cero.</p>

    <p><b>SÉPTIMA – Recibos.</b> Cada pago se documentará mediante recibo firmado por ambas partes.</p>

    <p><b>OCTAVA – Naturaleza.</b> El presente acuerdo es complementario de la escritura referida y regula exclusivamente la modalidad de cancelación del saldo pendiente.</p>

    <p>En prueba de conformidad, se firman dos ejemplares de un mismo tenor, en la ciudad de Buenos Aires, en la fecha indicada al inicio.</p>

    <div class="signRow">
      <div class="sign">
        <div class="line"></div>
        <div class="lbl">Firma EL VENDEDOR</div>
      </div>
      <div class="sign">
        <div class="line"></div>
        <div class="lbl">Firma EL COMPRADOR</div>
      </div>
    </div>
  `;

  const html = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>${docTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @page{ size:A4 portrait; margin:16mm; }
    body{ margin:0; background:#e5e7eb; font-family: Arial, sans-serif; color:#111; }
    .fecha{ text-align:right; margin:0 0 12px 0; }

    .noprint{
      padding:12px;
      position: sticky;
      top:0;
      background:#fff;
      z-index:10;
      border-bottom:1px solid #ddd;
      display:flex;
      justify-content:flex-end;
    }
    .btn{border:1px solid #111;background:#f2f2f2;padding:10px 14px;border-radius:12px;font-weight:800;cursor:pointer}

    .sheet{
      width: min(210mm, 100vw);
      background:#fff;
      margin:0 auto;
      padding: clamp(12px, 3vw, 16mm);
      box-shadow:0 10px 30px rgba(0,0,0,.15);
      box-sizing:border-box;
    }

    @media (max-width: 900px){
      body{ background:#fff; }
      .sheet{ width:100vw; margin:0; padding: 14px; box-shadow:none; }
    }

    p{
      text-align: justify;
      text-justify: inter-word;
      hyphens: auto;
      -webkit-hyphens: auto;
      overflow-wrap: break-word;
      line-height:1.78;
      margin:0 0 12px 0;
      font-size:15.8px;
    }
    h1{ font-size:22px; margin:0 0 10px 0; text-align:center; letter-spacing:.2px; }
    h2{ font-size:17px; margin:0 0 10px 0; }
    .small{ font-size:14.2px; color:#333; }

    table{ width:100%; border-collapse: collapse; margin:12px 0; font-size:13.8px; }
    th,td{ border:1px solid #000; padding:6px; vertical-align:top; }
    th{ background:#eee; text-align:left; }
    td.num{ text-align:right; white-space:nowrap; }

    .pageBreak{ break-before: page; page-break-before: always; }

    .signRow{ display:flex; gap:40px; margin-top:28px; }
    .sign{ flex:1; }
    .line{ border-top:1px solid #000; margin-top:24px; }
    .lbl{ font-size:13.2px; padding-top:6px; }

    @media print{
      body{ background:#fff; }
      .noprint{ display:none; }
      .sheet{ width:auto; margin:0; padding:0; box-shadow:none; }
    }
  </style>
</head>
<body>
  <div class="noprint">
    <button class="btn" id="btnCta">...</button>
  </div>

  <div class="sheet">
    ${acuerdo}
    <div class="pageBreak"></div>

    <h2>ANEXO PLAN DE PAGOS</h2>
    <p class="small">
      Inmueble: <b>${state.meta.inmueble}</b><br/>
      Escritura Pública Nº <b>${state.meta.escritura_num}</b> – Registro Notarial Nº <b>${state.meta.registro}</b>.
    </p>

    <table>
      <thead>
        <tr>
          <th>Período</th>
          <th>Concepto</th>
          <th class="num">Cuota (U$S)</th>
          <th>Estado</th>
          <th class="num">Saldo proyectado</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  </div>

  <script>
    document.title = ${JSON.stringify(docTitle)};

    async function shareHtml(){
      const html = document.documentElement.outerHTML;
      const file = new File([html], "acuerdo_y_anexo.html", { type:"text/html" });

      if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({ title: document.title, text: document.title, files: [file] });
        return true;
      }

      const blob = new Blob([html], {type:"text/html"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
      alert("Tu navegador no soporta compartir. Se descargó el HTML para que lo envíes.");
      return false;
    }

    function isShareMode(){
      const canShare = !!(navigator.share && navigator.canShare);
      const isTouch = (navigator.maxTouchPoints || 0) > 0;
      const isSmall = window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
      return canShare && (isTouch || isSmall);
    }

    const btn = document.getElementById("btnCta");
    function syncCTA(){
      if(isShareMode()){
        btn.textContent = "Compartir";
        btn.onclick = ()=> shareHtml().catch(err=>{ console.error(err); alert("No se pudo compartir."); });
      } else {
        btn.textContent = "Imprimir";
        btn.onclick = ()=> window.print();
      }
    }
    syncCTA();
    window.addEventListener("resize", syncCTA);
  <\/script>
</body>
</html>`;

  const w = window.open("", "acuerdo_anexo");
  w.document.open();
  w.document.write(html);
  w.document.close();
  try { w.document.title = docTitle; } catch (e) {}
}

/* =========================
   AUTH UI
========================= */
function mountAuthUI() {
  const authBar = $("authBar");
  authBar.innerHTML = `
    <span class="status" id="authStatus">Modo visualizador (solo lectura)</span>
    <input id="loginEmail" type="email" placeholder="Email editor" />
    <input id="loginPass" type="password" placeholder="Contraseña" />
    <button id="btnLogin" class="btn primary">Entrar</button>
    <button id="btnLogout" class="btn" style="display:none">Salir</button>
  `;

  const loginEmail = $("loginEmail");
  const loginPass = $("loginPass");
  const btnLogin = $("btnLogin");
  const btnLogout = $("btnLogout");

  btnLogin.onclick = async () => {
    try {
      await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPass.value);
      loginPass.value = "";
    } catch (e) {
      alert("No pude iniciar sesión. Revisá email/contraseña.");
      console.error(e);
    }
  };

  btnLogout.onclick = async () => { await signOut(auth); };
}

function setViewerUI() {
  $("btnEmitir")?.classList.add("hide");
  $("btnImputar")?.classList.add("hide");
  $("btnExport")?.classList.add("hide");
  $("btnImport")?.classList.add("hide");
  $("btnReset")?.classList.add("hide");
  $("cardRecibos")?.classList.add("hide");
  if ($("recDeleteHint")) $("recDeleteHint").textContent = "";
}

function setEditorUI() {
  $("btnEmitir")?.classList.remove("hide");
  $("btnImputar")?.classList.remove("hide");
  $("btnExport")?.classList.remove("hide");
  $("btnImport")?.classList.remove("hide");
  $("btnReset")?.classList.remove("hide");
  $("cardRecibos")?.classList.remove("hide");
}

function syncAuthSummary(isEditor) {
  const dot = $("authDot");
  const txt = $("authSummaryTxt");
  const details = $("authDetails");

  if (!dot || !txt || !details) return;

  if (isEditor) {
    dot.style.background = "rgba(34,197,94,.55)";
    dot.style.borderColor = "rgba(34,197,94,.55)";
    txt.textContent = "Modo editor";
    details.open = true;
  } else {
    dot.style.background = "rgba(147,161,182,.35)";
    dot.style.borderColor = "rgba(147,161,182,.35)";
    txt.textContent = "Acceso";
    details.open = false;
  }
}

/* =========================
   SAVE / REALTIME
========================= */
let state = null;

async function saveState() {
  try {
    await pushRemote(state);
    return true;
  } catch (err) {
    console.error("saveState error", err);
    alert("No se pudo guardar en Firebase (probablemente no sos editor).");
    return false;
  }
}

function bindRealtime() {
  onSnapshot(CC_REF, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (!data?.state) return;

    const remoteState = data.state;
    const rrev = remoteState?._meta?.rev || 0;

    if (rrev === lastLocalRev && remoteState?._meta?.updatedBy === who()) return;

    const cur = state?._meta?.rev || 0;
    if (rrev <= cur) return;

    applyingRemote = true;
    state = remoteState;
    render();
    applyingRemote = false;
  });
}

/* =========================
   RECIBOS: ELIMINAR / ANULAR
========================= */
function eliminarReciboPendiente(recId) {
  if (!canWrite) return;
  const rec = state.recibos.find(r => r.id === recId);
  if (!rec) return;

  if (rec.estado !== "pendiente") {
    alert("Este recibo no está pendiente. Para los imputados usá ANULAR.");
    return;
  }

  const msg = `Eliminar recibo R${rec.numero} (${rec.periodo}) por U$S ${fmt(rec.monto)}?\n\nEsto NO afecta movimientos porque aún no está imputado.`;
  if (!confirm(msg)) return;

  state.recibos = state.recibos.filter(r => r.id !== recId);
  saveState();
}

function anularReciboImputado(recId) {
  if (!canWrite) return;
  const rec = state.recibos.find(r => r.id === recId);
  if (!rec) return;

  if (rec.estado !== "imputado") {
    alert("Solo se pueden anular recibos IMPUTADOS.");
    return;
  }

  const msg =
    `ANULAR recibo R${rec.numero} (${rec.periodo}) por U$S ${fmt(rec.monto)}?\n\n` +
    `Se agregará un movimiento de DÉBITO por el mismo monto para revertir el pago, sin borrar el historial.\n` +
    `Esto ajusta el saldo automáticamente.`;
  if (!confirm(msg)) return;

  state.movs.push({
    id: crypto.randomUUID(),
    periodo: rec.periodo,
    concepto: `ANULACIÓN de pago – Recibo R${rec.numero}`,
    debito: Number(rec.monto || 0),
    credito: 0,
    recibo_num: rec.numero,
    adjunto: null,
    obs: "Reversión contable por anulación del recibo imputado."
  });

  rec.estado = "anulado";
  saveState();
}

/* =========================
   RENDER
========================= */
function render() {
  if (!state || !state.meta || !Array.isArray(state.movs) || !Array.isArray(state.recibos)) {
    if ($("saldoGrande")) $("saldoGrande").textContent = "U$S —";
    if ($("saldoExtra")) $("saldoExtra").textContent = "Estado inválido (no se pudo cargar).";
    if ($("planResumenInline")) $("planResumenInline").textContent = "—";
    return;
  }

  const movs = calcSaldos(state);
  const saldo = movs.length ? movs[movs.length - 1].saldo : 0;

  const plan = aplicarPagosAlPlan(generarPlanBase(state), state);
  const { fin, cuotasRestantes } = estimacionFin(plan);
  const saldoRestante = Math.max(0, Number(state.meta.saldo_inicial || 0) - totalPagado(state));

  if ($("saldoGrande")) $("saldoGrande").textContent = "U$S " + fmt(saldo);
  if ($("saldoExtra")) $("saldoExtra").textContent = `Saldo restante: U$S ${fmt(saldoRestante)} · Fin estimado: ${fin} · Cuotas restantes: ${cuotasRestantes}`;
  if ($("planResumenInline")) $("planResumenInline").textContent = `Saldo restante: U$S ${fmt(saldoRestante)} · Fin estimado: ${fin} · Cuotas restantes: ${cuotasRestantes}`;

  if (canWrite && $("recDeleteHint")) {
    $("recDeleteHint").textContent =
      "Tip: los recibos PENDIENTES se pueden eliminar. Los IMPUTADOS se pueden ANULAR (revierte el pago con un débito, sin borrar el historial).";
  }

  const tbPlan = $("tbodyPlan");
  if (tbPlan) {
    tbPlan.innerHTML = "";
    plan.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Período">${p.periodo}</td>
        <td class="conceptCell" data-label="Concepto">${p.concepto}${p.tipo === "antecedente" ? `<div class="small">Antecedente</div>` : ""}</td>
        <td class="num" data-label="Monto (U$S)">${fmt(p.cuota)}</td>
        <td data-label="Estado">${p.estado}</td>
        <td class="num" data-label="Saldo proyectado">${fmt(p.saldo_proyectado)}</td>
      `;
      tbPlan.appendChild(tr);
    });
  }

  const tbRec = $("tbodyRec");
  if (tbRec) {
    tbRec.innerHTML = "";
    if (state.recibos.length === 0) {
      tbRec.innerHTML = `<tr><td data-label="Info" colspan="6" class="muted">Todavía no hay recibos emitidos.</td></tr>`;
    } else {
      state.recibos
        .slice()
        .sort((a, b) => a.numero.localeCompare(b.numero))
        .forEach(r => {
          const est = (r.estado === "pendiente" ? "Pendiente" : (r.estado === "imputado" ? "Imputado" : "Anulado"));
          const ver = `<a href="#" class="lnkRec" data-id="${r.id}">Ver</a>`;

          let acciones = "—";
          if (canWrite) {
            if (r.estado === "pendiente") {
              acciones = `<a href="#" class="lnkDelRec" data-id="${r.id}" style="color:#fca5a5">Eliminar</a>`;
            } else if (r.estado === "imputado") {
              acciones = `<a href="#" class="lnkAnuRec" data-id="${r.id}" style="color:#fde68a">Anular</a>`;
            } else {
              acciones = `<span class="small">—</span>`;
            }
          }

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td data-label="Período">${r.periodo}</td>
            <td class="conceptCell" data-label="Concepto">${r.concepto}<div class="small">${(MESES[r.periodo.split("/")[0]] || r.periodo.split("/")[0])} ${r.periodo.split("/")[1]}</div></td>
            <td class="num" data-label="Monto (U$S)">${fmt(r.monto)}</td>
            <td data-label="Recibo">R${r.numero} · ${ver}</td>
            <td data-label="Estado">${est}</td>
            <td data-label="Acciones">${acciones}</td>
          `;
          tbRec.appendChild(tr);
        });
    }
  }

  const tbMov = $("tbodyMov");
  if (tbMov) {
    tbMov.innerHTML = "";
    movs.forEach(m => {
      const adj =
        m.recibo_num
          ? (m.adjunto ? `Adjunto cargado · <a href="#" class="lnkAdj" data-id="${m.id}">Ver</a>` : `Falta adjunto`)
          : "—";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Período">${m.periodo}</td>
        <td class="conceptCell" data-label="Concepto">
          ${m.concepto}
          ${m.recibo_num ? ` <span class="small">(R${m.recibo_num})</span>` : ""}
          ${m.obs ? `<div class="small">Obs.: ${m.obs}</div>` : ""}
        </td>
        <td class="num" data-label="Débito">${m.debito ? fmt(m.debito) : "—"}</td>
        <td class="num" data-label="Crédito">${m.credito ? fmt(m.credito) : "—"}</td>
        <td class="num" data-label="Saldo"><b>${fmt(m.saldo)}</b></td>
        <td data-label="Adjunto">${adj}</td>
      `;
      tbMov.appendChild(tr);
    });
  }

  document.querySelectorAll(".lnkRec").forEach(a => {
    a.onclick = (e) => {
      e.preventDefault();
      const id = a.getAttribute("data-id");
      const rec = state.recibos.find(x => x.id === id);
      if (!rec) return;

      if (rec.estado === "pendiente") {
        openReciboPrint(state, rec, "pendiente");
      } else if (rec.estado === "imputado") {
        const movs2 = calcSaldos(state);
        const mov = movs2.find(mm => mm.recibo_num === rec.numero);
        openReciboPrint(state, rec, "imputado", mov ? mov.saldo : undefined);
      } else {
        openReciboPrint(state, rec, "pendiente");
      }
    };
  });

  document.querySelectorAll(".lnkAdj").forEach(a => {
    a.onclick = (e) => {
      e.preventDefault();
      const id = a.getAttribute("data-id");
      const mov = state.movs.find(m => m.id === id);
      if (mov?.adjunto) abrirAdjunto(mov.adjunto);
    };
  });

  document.querySelectorAll(".lnkDelRec").forEach(a => {
    a.onclick = (e) => {
      e.preventDefault();
      eliminarReciboPendiente(a.getAttribute("data-id"));
    };
  });

  document.querySelectorAll(".lnkAnuRec").forEach(a => {
    a.onclick = (e) => {
      e.preventDefault();
      anularReciboImputado(a.getAttribute("data-id"));
    };
  });

  const pendientes = state.recibos.filter(r => r.estado === "pendiente");
  if ($("btnImputar")) $("btnImputar").disabled = pendientes.length === 0;

  const sel = $("i_recibo");
  if (sel) {
    sel.innerHTML = "";
    pendientes
      .slice()
      .sort((a, b) => a.numero.localeCompare(b.numero))
      .forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = `R${r.numero} · ${r.periodo} · U$S ${fmt(r.monto)} · ${r.concepto}`;
        sel.appendChild(opt);
      });
  }
}

/* =========================
   UI EVENTS
========================= */
function bindUI() {
  if ($("btnEmitir")) {
    $("btnEmitir").onclick = () => {
      $("e_periodo").value = periodoActual();
      $("e_monto").value = "";
      $("e_concepto").value = "Pago mensual";
      show("modalEmitir");
    };
  }

  if ($("e_cancel")) $("e_cancel").onclick = () => hide("modalEmitir");
  if ($("modalEmitir")) $("modalEmitir").onclick = (e) => { if (e.target === $("modalEmitir")) hide("modalEmitir"); };

  if ($("e_save")) {
    $("e_save").onclick = async () => {
      if (!canWrite) return alert("No tenés permisos de edición.");

      const periodo = String($("e_periodo").value || "").trim();
      const monto = Number($("e_monto").value);
      const concepto = String($("e_concepto").value || "").trim();

      if (!isPeriodo(periodo)) return alert("Período inválido. Usá MM/AAAA (ej.: 01/2026).");
      if (!monto || monto <= 0) return alert("Monto inválido.");
      if (!concepto) return alert("Concepto requerido.");

      const numero = nextReciboNum2(state);
      const rec = { id: crypto.randomUUID(), numero, periodo, monto, concepto, estado: "pendiente" };
      state.recibos.push(rec);

      const ok = await saveState();
      if (!ok) return;

      hide("modalEmitir");
      render();
      openReciboPrint(state, rec, "pendiente");
    };
  }

  if ($("btnImputar")) {
    $("btnImputar").onclick = () => {
      $("i_file").value = "";
      $("i_file_info").textContent = "";
      $("i_file_err").textContent = "";
      $("i_preview").innerHTML = "";
      $("i_obs").value = "";
      $("i_declaro").checked = false;
      show("modalImputar");
    };
  }

  if ($("i_cancel")) $("i_cancel").onclick = () => hide("modalImputar");
  if ($("modalImputar")) $("modalImputar").onclick = (e) => { if (e.target === $("modalImputar")) hide("modalImputar"); };

  if ($("i_file")) {
    $("i_file").onchange = () => {
      const f = $("i_file").files && $("i_file").files[0];
      $("i_file_err").textContent = "";
      $("i_file_info").textContent = "";
      $("i_preview").innerHTML = "";
      if (!f) return;

      const okType = (f.type.startsWith("image/") || f.type === "application/pdf");
      if (!okType) {
        $("i_file_err").textContent = "Tipo inválido. Debe ser imagen (foto/scan) o PDF.";
        return;
      }

      $("i_file_info").textContent = `Archivo seleccionado: ${f.name}`;

      if (f.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          $("i_preview").innerHTML = `<img src="${e.target.result}" alt="preview" />`;
        };
        reader.readAsDataURL(f);
      } else {
        $("i_preview").innerHTML = `<div class="small">PDF seleccionado</div>`;
      }
    };
  }

  if ($("i_confirm")) {
    $("i_confirm").onclick = async () => {
      if (!canWrite) return alert("No tenés permisos de edición.");

      const recId = $("i_recibo").value;
      const rec = state.recibos.find(r => r.id === recId && r.estado === "pendiente");
      if (!rec) return alert("Elegí un recibo pendiente válido.");

      const file = $("i_file").files && $("i_file").files[0];
      if (!file) return alert("Adjuntar recibo firmado es obligatorio.");

      const okType = (file.type.startsWith("image/") || file.type === "application/pdf");
      if (!okType) return alert("Tipo inválido. Debe ser imagen o PDF.");

      if (!$("i_declaro").checked) {
        return alert("Debés declarar que el adjunto corresponde al recibo y está firmado por ambas partes.");
      }

      const obs = String($("i_obs").value || "").trim();
      const dataUrl = await fileToDataUrl(file);

      state.movs.push({
        id: crypto.randomUUID(),
        periodo: rec.periodo,
        concepto: rec.concepto,
        debito: 0,
        credito: rec.monto,
        recibo_num: rec.numero,
        adjunto: { name: file.name, type: file.type, dataUrl },
        obs: obs || null
      });

      rec.estado = "imputado";
      const ok = await saveState();
      if (!ok) return;

      hide("modalImputar");
      render();

      const to = "l.linracioppi@gmail.com";
      const cc = "l.linracioppi@gmail.com";
      const subject = `Imputación de pago – Recibo R${rec.numero} – ${rec.periodo}`;
      const body = [
        "Se registró una imputación de pago.",
        "",
        `Recibo: R${rec.numero}`,
        `Período: ${rec.periodo}`,
        `Monto: U$S ${fmt(rec.monto)}`,
        `Concepto: ${rec.concepto}`,
        `Obs.: ${obs || ""}`,
        "",
        "Cuenta: Bertinelli / Lin Racioppi"
      ].join("\\n");

      abrirMailImputacion({ to, cc, subject, body });
    };
  }

  if ($("btnPrintPlan")) $("btnPrintPlan").onclick = () => printPlanYAcuerdo(state);

  if ($("btnExport")) {
    $("btnExport").onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cuenta_corriente_bertinelli_lin.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };
  }

  if ($("btnImport")) {
    $("btnImport").onclick = () => {
      if (!canWrite) return alert("No tenés permisos de edición.");

      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "application/json";
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return;

        const r = new FileReader();
        r.onload = async () => {
          try {
            const obj = JSON.parse(String(r.result || ""));
            if (!obj || !obj.meta || !Array.isArray(obj.recibos) || !Array.isArray(obj.movs)) {
              return alert("JSON inválido.");
            }
            state = obj;
            const ok = await saveState();
            if (!ok) return;
            render();
          } catch (e) {
            alert("No pude leer el JSON.");
          }
        };
        r.readAsText(f);
      };
      inp.click();
    };
  }

  if ($("btnReset")) {
    $("btnReset").onclick = async () => {
      state = await hardReset(state);
      render();
    };
  }
}

/* =========================
   INIT (ÚNICO)
========================= */
mountAuthUI();
bindUI();

let realtimeBound = false;

onAuthStateChanged(auth, async (user) => {
  const authStatus = $("authStatus");
  const btnLogout = $("btnLogout");

  currentUid = user ? user.uid : null;
console.log("AUTH uid:", user?.uid, "email:", user?.email);
   
  const isEditor = !!user && user.uid === EDITOR_UID;

  if (isEditor) {
    canWrite = true;
    if (authStatus) authStatus.textContent = "Modo editor habilitado";
    if (btnLogout) btnLogout.style.display = "";
    setEditorUI();
    syncAuthSummary(true);
  } else {
    canWrite = false;
    setViewerUI();
    syncAuthSummary(false);

    if (user) {
      if (authStatus) authStatus.textContent = "Logueado sin permisos de edición (solo lectura)";
      if (btnLogout) btnLogout.style.display = "";
    } else {
      if (authStatus) authStatus.textContent = "Modo visualizador (solo lectura)";
      if (btnLogout) btnLogout.style.display = "none";
    }
  }

  try {
    state = await pullRemoteOrInit();
  } catch (e) {
    console.error("pullRemoteOrInit failed:", e);
    state = makeInitialState();
    if ($("saldoGrande")) $("saldoGrande").textContent = "U$S —";
    if ($("saldoExtra")) $("saldoExtra").textContent = "No se pudo cargar Firebase (doc inexistente o permisos insuficientes).";
  }

  if (!realtimeBound) {
    bindRealtime();
    realtimeBound = true;
  }

  render();
});
