// Piccole utilità condivise: creazione DOM sicura (niente innerHTML), formati italiani, date.

/** Crea un elemento. attrs: class, on* (eventi), dataset, style, altri attributi. */
export function h(tag, attrs = {}, ...children) {
  const svg = ['svg', 'path', 'rect', 'circle', 'line', 'text', 'g', 'polyline'].includes(tag);
  const el = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'value' && !svg) el.value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  appendAll(el, children);
  return el;
}
function appendAll(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const euro = (n, tondo = false) => (tondo ? eur0 : eur).format(n || 0);
export const num = (n) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(n);

/** "12,5" / "12.50" / "1.234,56" -> numero */
export function parseImporto(s) {
  s = String(s ?? '').trim().replace(/[€\s]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return Math.round(parseFloat(s) * 100) / 100;
}

export const round2 = (n) => Math.round(n * 100) / 100;
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
export const oggi = () => isoDate(new Date());
export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const meseDi = (iso) => iso.slice(0, 7);
export const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
export const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
export const nomeMese = (m) => `${MESI[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
export const meseBreve = (m) => MESI_BREVI[+m.slice(5, 7) - 1];
export function spostaMese(m, delta) {
  const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + delta, 1);
  return isoDate(d).slice(0, 7);
}
export function dataLunga(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}
export const dataBreve = (iso) => `${+iso.slice(8, 10)}/${+iso.slice(5, 7)}/${iso.slice(2, 4)}`;
export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
