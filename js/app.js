// Avvio, navigazione tra le schermate, mese selezionato, avvisi e fogli a comparsa.
import * as store from './store.js';
import { h, meseDi, oggi, nomeMese, spostaMese } from './util.js';
import home from './views/home.js';
import movimenti from './views/movimenti.js';
import budget from './views/budget.js';
import analisi from './views/analisi.js';
import altro from './views/altro.js';
import { apriModulo } from './views/modulo.js';

const VISTE = { home, movimenti, budget, analisi, altro };
export const ctx = { mese: meseDi(oggi()), filtri: {} };
const vista = document.getElementById('vista');

export function rotta() { return (location.hash.match(/^#\/(\w+)/) || [])[1] || 'home'; }

export function render() {
  const r = VISTE[rotta()] ? rotta() : 'home';
  const y = r === render.ultima ? window.scrollY : 0;
  vista.replaceChildren(VISTE[r](ctx));
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));
  if (r !== render.ultima) vista.focus({ preventScroll: true });
  window.scrollTo(0, y);
  render.ultima = r;
}

let toastTimer;
export function avviso(testo, azione) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, h('span', {}, testo),
    azione && h('button', { onclick: () => { azione.fn(); el.remove(); } }, azione.testo));
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), azione ? 6000 : 2600);
}

/** Foglio a comparsa (dal basso su iPhone, centrato su PC). Restituisce la funzione per chiuderlo. */
export function foglio(titolo, contenuto, { onChiudi } = {}) {
  const chiudi = () => { velo.remove(); document.removeEventListener('keydown', esc); onChiudi?.(); };
  const esc = (e) => e.key === 'Escape' && chiudi();
  const velo = h('div', { class: 'velo', onclick: (e) => e.target === velo && chiudi() },
    h('div', { class: 'foglio', role: 'dialog', 'aria-modal': 'true', 'aria-label': titolo },
      h('div', { class: 'maniglia' }),
      h('div', { class: 'testa' }, h('h2', {}, titolo), h('button', { class: 'iconbtn', 'aria-label': 'Chiudi', onclick: chiudi }, '✕')),
      contenuto));
  document.addEventListener('keydown', esc);
  document.body.append(velo);
  velo.querySelector('input:not([type=checkbox]):not([type=date]), select')?.focus({ preventScroll: true });
  return chiudi;
}

/** Barra per cambiare mese, usata in più schermate. */
export function barraMese(min, max) {
  return h('div', { class: 'mesebar' },
    h('button', { 'aria-label': 'Mese precedente', disabled: min && ctx.mese <= min, onclick: () => { ctx.mese = spostaMese(ctx.mese, -1); render(); } }, '‹'),
    h('strong', {}, nomeMese(ctx.mese)),
    h('button', { 'aria-label': 'Mese successivo', disabled: max && ctx.mese >= max, onclick: () => { ctx.mese = spostaMese(ctx.mese, 1); render(); } }, '›'));
}

async function avvia() {
  await store.carica();
  navigator.storage?.persist?.();
  store.onCambio(() => render());
  window.addEventListener('hashchange', render);
  document.getElementById('nuovo').addEventListener('click', () => apriModulo());
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !document.querySelector('.velo')) { e.preventDefault(); apriModulo(); }
  });
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
avvia().catch((e) => { vista.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'Errore di avvio'), h('p', {}, String(e?.message || e)))); });
