// Elenco movimenti: su iPhone una lista per giorno, su PC le stesse colonne dell'Excel.
import * as store from '../store.js';
import { ctx, barraMese, render } from '../app.js';
import { h, euro, dataLunga, dataBreve, norm, nomeMese } from '../util.js';
import { riepilogoMese } from '../calc.js';
import { TAG } from '../categorie.js';
import { apriModulo } from './modulo.js';

/** Grassetto come nell'Excel: spese sopra la soglia e bollette. */
const forte = (t, soglia) => t.importo >= soglia || t.cat === 'Boll';

export function rigaMovimento(t, soglia, conData = false) {
  const c = store.categoria(t.cat);
  const imp = h('span', { class: 'num ' + (t.importo < 0 ? 'pos' : '') }, t.importo < 0 ? '+' + euro(-t.importo) : euro(t.importo));
  return h('button', { class: 'mov' + (forte(t, soglia) ? ' forte' : ''), 'data-tag': t.tag?.length ? t.tag.join(' ') : null, onclick: () => apriModulo(t),
    title: [c.nome, ...(t.tag || []).map((k) => TAG[k]?.nome)].join(' · ') },
    h('span', { class: 'ic', style: { background: c.colore + '22' } }, c.icona),
    h('span', { class: 't' },
      h('div', { class: 'm' }, t.motivo),
      h('div', { class: 'l solo-mob' }, conData ? dataBreve(t.data) + ' · ' : '', t.luogo || c.nome)),
    h('span', { class: 'col-pc muted' }, t.luogo),
    h('span', { class: 'col-pc num' }, t.metodo === 'D' ? imp.cloneNode(true) : ''),
    h('span', { class: 'col-pc num' }, t.metodo === 'C' ? imp.cloneNode(true) : ''),
    h('span', { class: 'col-pc muted' }, t.note),
    h('span', { class: 'a' }, h('div', { class: 'v' }, imp), h('div', { class: 'p' }, t.metodo === 'D' ? 'diretta' : 'contante')));
}

export default function movimenti() {
  const f = ctx.filtri;
  const soglia = store.impostazioni().soglia;
  const tutti = store.movimenti();
  const q = norm(f.testo);
  // con una ricerca si cerca in tutti i mesi
  const lista = tutti.filter((t) =>
    (q ? [t.motivo, t.luogo, t.note].some((v) => norm(v).includes(q)) : t.mese === ctx.mese) &&
    (!f.cat || t.cat === f.cat) && (!f.metodo || t.metodo === f.metodo) && (!f.tag || t.tag?.includes(f.tag)))
    .sort((a, b) => b.data.localeCompare(a.data) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  const filtrato = q || f.cat || f.metodo || f.tag;
  const r = riepilogoMese(lista.map((t) => ({ ...t, mese: 'x' })), 'x', null);

  const cerca = h('input', { class: 'cerca', type: 'search', placeholder: '🔍 Cerca in tutti i mesi (motivo, luogo, note)', value: f.testo || '' });
  let timer;
  cerca.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { f.testo = cerca.value; render(); document.querySelector('.cerca')?.focus(); }, 250); });

  const sel = (chiave, vuoto, opzioni) => h('select', { class: 'mini', 'aria-label': vuoto, onchange: (e) => { f[chiave] = e.target.value || undefined; render(); } },
    h('option', { value: '' }, vuoto), opzioni.map(([v, t]) => h('option', { value: v, selected: f[chiave] === v }, t)));

  // raggruppa per giorno
  const giorni = new Map();
  for (const t of lista) { if (!giorni.has(t.data)) giorni.set(t.data, []); giorni.get(t.data).push(t); }

  return h('div', {},
    h('div', { class: 'top' }, h('h1', {}, 'Movimenti'), h('a', { class: 'iconbtn', href: '#/altro', 'aria-label': 'Altro' }, '⚙️')),
    !q && barraMese(),
    h('div', { class: 'filtri' },
      cerca,
      sel('cat', 'Tutte le categorie', store.categorie().map((c) => [c.codice, `${c.icona} ${c.nome}`])),
      sel('metodo', 'Diretta e contante', [['D', 'Solo diretta'], ['C', 'Solo contante']]),
      sel('tag', 'Tutte le evidenze', Object.entries(TAG).map(([k, t]) => [k, t.breve])),
      filtrato && h('button', { class: 'btn sec', onclick: () => { ctx.filtri = {}; render(); } }, 'Azzera filtri')),
    h('div', { class: 'totali' },
      h('div', {}, h('small', {}, 'Spesa diretta'), h('b', { class: 'num' }, euro(r.diretta))),
      h('div', {}, h('small', {}, 'Spesa contante'), h('b', { class: 'num' }, euro(r.contante))),
      h('div', {}, h('small', {}, 'Movimenti'), h('b', { class: 'num' }, lista.length))),
    h('div', { class: 'legenda', style: { margin: '10px 4px' } },
      Object.entries(TAG).map(([k, t]) => h('span', {}, h('i', { style: { background: `var(--t-${k})` } }), t.breve)),
      h('span', {}, h('b', {}, 'Grassetto'), ` = da ${euro(soglia, true)} in su o bollette`)),
    lista.length === 0
      ? h('div', { class: 'card vuoto' }, h('div', { class: 'e' }, '🔍'), filtrato ? 'Nessun movimento trovato.' : `Nessun movimento in ${nomeMese(ctx.mese)}.`)
      : [h('div', { class: 'intest' }, h('span'), h('span', {}, 'Motivo'), h('span', {}, 'Luogo'), h('span', { class: 'num' }, 'Diretta'), h('span', { class: 'num' }, 'Contante'), h('span', {}, 'Note')),
        [...giorni].map(([g, ts]) => [
          h('div', { class: 'giorno' }, h('span', {}, dataLunga(g), q ? ` ${g.slice(0, 4)}` : ''), h('span', { class: 'num' }, euro(ts.reduce((s, t) => s + t.importo, 0)))),
          h('div', { class: 'lista' }, ts.map((t) => rigaMovimento(t, soglia))),
        ])]);
}
