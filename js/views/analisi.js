// Analisi: risparmio mese per mese (come il foglio "Risparmio"), categorie, carburante, luoghi.
import * as store from '../store.js';
import { ctx, render } from '../app.js';
import { h, euro, meseBreve, nomeMese, norm, num } from '../util.js';
import { riepilogoMese, perCategoria, rifornimenti } from '../calc.js';
import { barre, classifica } from '../grafici.js';
import { segmenti } from './modulo.js';

const st = { periodo: 'anno', cat: null };

export default function analisi() {
  const txs = store.movimenti();
  const anni = [...new Set(txs.map((t) => t.mese.slice(0, 4)))].sort();
  const anno = st.anno && anni.includes(st.anno) ? st.anno : ctx.mese.slice(0, 4);
  const mesiAnno = Array.from({ length: 12 }, (_, i) => `${anno}-${String(i + 1).padStart(2, '0')}`);
  const riep = mesiAnno.map((m) => riepilogoMese(txs, m, store.retribuzione(m)));
  const conRes = riep.filter((r) => r.residuo != null);
  const totRisp = conRes.reduce((s, r) => s + r.residuo, 0);

  const filtro = st.periodo === 'anno' ? (t) => t.mese.startsWith(anno) : (t) => t.mese === ctx.mese;
  const perCat = perCategoria(txs, filtro).filter((x) => x.totale > 0);
  const totCat = perCat.reduce((s, x) => s + x.totale, 0);
  const catSel = st.cat || perCat[0]?.cat;

  const evid = (k) => txs.filter((t) => t.mese.startsWith(anno) && t.tag?.includes(k)).reduce((s, t) => s + t.importo, 0);

  const luoghi = new Map();
  for (const t of txs) if (filtro(t) && t.importo > 0 && !['Prel', 'Rica'].includes(t.cat) && t.luogo && !/addebito|accredito|brevi\s?mano/i.test(t.luogo)) {
    const k = norm(t.luogo);
    const e = luoghi.get(k) || { nome: t.luogo, valore: 0, volte: 0 };
    e.valore += t.importo; e.volte++; luoghi.set(k, e);
  }

  const rif = rifornimenti(txs.filter((t) => t.mese.startsWith(anno)));
  const perVeicolo = new Map();
  for (const r of rif) { const v = r.veicolo || 'Altro'; const e = perVeicolo.get(v) || { nome: v, valore: 0, litri: 0 }; e.valore += r.importo; e.litri += r.litri || 0; perVeicolo.set(v, e); }
  const prezzoMedio = (tipo) => mesiAnno.map((m) => { const x = rif.filter((r) => r.data.startsWith(m) && r.tipo === tipo); return x.length ? x.reduce((s, r) => s + r.prezzo, 0) / x.length : 0; });
  const tipi = ['gasolio', 'benzina'].filter((k) => rif.some((r) => r.tipo === k));

  return h('div', {},
    h('div', { class: 'top' }, h('h1', {}, 'Analisi'),
      h('select', { class: 'mini', 'aria-label': 'Anno', onchange: (e) => { st.anno = e.target.value; render(); } },
        (anni.length ? anni : [anno]).map((a) => h('option', { selected: a === anno }, a)))),

    h('section', { class: 'card' },
      h('h2', {}, `Risparmio ${anno}`, h('span', { class: 'num ' + (totRisp < 0 ? 'neg' : 'pos') }, euro(totRisp))),
      h('p', { class: 'muted small', style: { margin: '0 0 8px' } }, 'Retribuzione meno uscite dirette, mese per mese (come il foglio "Risparmio").'),
      barre(riep.map((r) => ({ etichetta: meseBreve(r.mese), valore: r.residuo ?? 0, attenuato: r.residuo == null })),
        innerWidth < 700 ? { larghezza: 380, altezza: 230 } : { larghezza: 900, altezza: 240 })),

    h('div', { class: 'grid2' },
      h('section', { class: 'card' },
        h('h2', {}, 'Dove vanno i soldi', h('span', { class: 'num' }, euro(totCat))),
        h('div', { style: { marginBottom: '10px' } }, segmenti([['anno', `Anno ${anno}`], ['mese', nomeMese(ctx.mese)]], st.periodo, (v) => { st.periodo = v; render(); })),
        perCat.length ? classifica(perCat.map((x) => { const c = store.categoria(x.cat); return { cat: x.cat, nome: c.nome, icona: c.icona, valore: x.totale, colore: c.colore }; }),
          { onclick: (r) => { st.cat = r.cat; render(); } }) : h('p', { class: 'muted' }, 'Nessuna spesa nel periodo.')),
      h('section', { class: 'card' },
        (() => {
          const c = store.categoria(catSel);
          const valori = mesiAnno.map((m) => perCategoria(txs, (t) => t.mese === m && t.cat === catSel)[0]?.totale || 0);
          const media = valori.filter(Boolean).reduce((s, v, _, a) => s + v / a.length, 0);
          return [
            h('h2', {}, `${c.icona} ${c.nome} nel ${anno}`, h('span', { class: 'muted small' }, `media ${euro(media, true)}/mese`)),
            h('select', { class: 'mini', style: { width: '100%', marginBottom: '8px' }, 'aria-label': 'Categoria', onchange: (e) => { st.cat = e.target.value; render(); } },
              store.categorie().filter((x) => !x.giroconto).map((x) => h('option', { value: x.codice, selected: x.codice === catSel }, `${x.icona} ${x.nome}`))),
            barre(mesiAnno.map((m, i) => ({ etichetta: meseBreve(m), valore: valori[i], colore: c.colore })), { altezza: 170, larghezza: 420 }),
          ];
        })())),

    h('div', { class: 'grid2' },
      h('section', { class: 'card' },
        h('h2', {}, `Evidenziate nel ${anno}`),
        h('div', { class: 'lista-imp' },
          [['impr', '⚠️ Spese impreviste'], ['vac', '🏖️ Vacanza estiva'], ['rimb', '💚 Rimborsi / Compro Oro'], ['carta', '💳 Pagate con carta di credito']].map(([k, n]) =>
            h('div', {}, h('span', {}, n), h('b', { class: 'num' }, euro(Math.abs(evid(k)))))))),
      h('section', { class: 'card' },
        h('h2', {}, 'Dove spendi di più'),
        classifica([...luoghi.values()].sort((a, b) => b.valore - a.valore).slice(0, 8).map((l) => ({ ...l, nome: `${l.nome} (${l.volte}×)` }))))),

    rif.length > 0 && h('section', { class: 'card' },
      h('h2', {}, `⛽ Carburante ${anno}`, h('span', { class: 'muted small' }, `${num(rif.reduce((s, r) => s + (r.litri || 0), 0))} litri`)),
      h('div', { class: 'grid2' },
        h('div', {}, h('div', { class: 'sezione' }, 'Spesa per mezzo'), classifica([...perVeicolo.values()].sort((a, b) => b.valore - a.valore).map((v) => ({ ...v, nome: `${v.nome} · ${num(v.litri)} L` })))),
        h('div', {}, tipi.map((k) => {
          const v = prezzoMedio(k), conDati = v.filter(Boolean);
          const min = Math.min(...conDati) * 0.97;
          return [h('div', { class: 'sezione' }, `Prezzo medio ${k} (€/L)`),
            barre(mesiAnno.map((m, i) => ({ etichetta: meseBreve(m), valore: v[i] ? v[i] - min : 0, testo: v[i] ? v[i].toFixed(3).replace('.', ',') : '', colore: k === 'gasolio' ? 'var(--warn)' : 'var(--accent)' })),
              { altezza: 130, larghezza: 420 })];
        })))));
}
