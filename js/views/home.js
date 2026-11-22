import * as store from '../store.js';
import { ctx, barraMese, foglio, avviso } from '../app.js';
import { h, euro, oggi, meseDi, nomeMese, dataBreve, parseImporto, num, spostaMese } from '../util.js';
import { riepilogoMese, contanteDisponibile, abituali, scadenze, perCategoria } from '../calc.js';
import { apriModulo } from './modulo.js';
import { rigaMovimento } from './movimenti.js';
import { registraRicorrenza } from './altro.js';

export default function home() {
  const txs = store.movimenti();
  const ret = store.retribuzione(ctx.mese);
  const r = riepilogoMese(txs, ctx.mese, ret);
  const imp = store.impostazioni();
  const inTasca = contanteDisponibile(txs, imp.contanteIniziale);
  const oggiIso = oggi();
  const prossime = scadenze(store.ricorrenti(), oggiIso).filter((s) => s.data <= spostaMese(meseDi(oggiIso), 1) + '-31').slice(0, 5);
  const rapidi = abituali(txs, 10);
  const budgetCat = store.categorie().filter((c) => c.budget > 0);
  const spese = new Map(perCategoria(txs, (t) => t.mese === ctx.mese).map((x) => [x.cat, x.totale]));
  const giorniBackup = imp.ultimoBackup ? Math.floor((Date.now() - new Date(imp.ultimoBackup)) / 864e5) : null;

  return h('div', {},
    h('div', { class: 'top' }, h('h1', {}, 'Ciao 👋'), h('a', { class: 'iconbtn', href: '#/altro', 'aria-label': 'Altro e impostazioni' }, '⚙️')),
    barraMese(),

    h('section', { class: 'card hero' },
      h('div', { class: 'lbl' }, 'Residuo del mese (retribuzione − uscite dirette)'),
      ret == null
        ? h('div', { style: { margin: '10px 0 14px' } }, h('button', { onclick: () => chiediRetribuzione(ctx.mese) }, '+ Inserisci la retribuzione del mese'))
        : h('div', { class: 'big num' }, euro(r.residuo)),
      h('div', { class: 'righe' },
        h('div', { onclick: () => chiediRetribuzione(ctx.mese), style: { cursor: 'pointer' } }, 'Retribuzione ✎', h('b', { class: 'num' }, ret == null ? '—' : euro(ret))),
        h('div', {}, 'Uscite dirette', h('b', { class: 'num' }, euro(r.diretta))),
        h('div', {}, 'In contante', h('b', { class: 'num' }, euro(r.contante))))),

    giorniBackup == null || giorniBackup > 14
      ? h('a', { class: 'card nota', href: '#/altro', style: { display: 'block', textDecoration: 'none', color: 'inherit' } },
        '💾 ', giorniBackup == null ? 'Non hai ancora fatto una copia di sicurezza.' : `Ultima copia di sicurezza ${giorniBackup} giorni fa.`, ' Tocca qui per farla.')
      : null,

    rapidi.length > 0 && h('section', { class: 'card' },
      h('h2', {}, 'Aggiungi al volo', h('span', { class: 'muted small' }, 'le spese che fai più spesso')),
      h('div', { class: 'rapidi' }, rapidi.map((t) => {
        const c = store.categoria(t.cat);
        return h('button', { class: 'rapido', onclick: () => apriModulo({ motivo: t.motivo, luogo: t.luogo, cat: t.cat, metodo: t.metodo, importo: t.importo, note: '' }) },
          h('div', { class: 'i' }, c.icona), h('div', { class: 'm' }, t.motivo), h('div', { class: 'l' }, t.luogo), h('div', { class: 'num small' }, euro(t.importo)));
      }))),

    h('div', { class: 'grid2' },
      h('section', { class: 'card' },
        h('div', { class: 'kpi' },
          h('div', {}, h('h2', {}, 'In tasca (stima)'), h('div', { class: 'muted small' }, 'Contanti + Spider: prelievi e ricariche meno le spese in contante')),
          h('div', { class: 'v num ' + (inTasca < 0 ? 'neg' : '') }, euro(inTasca)))),
      h('section', { class: 'card' },
        h('div', { class: 'kpi' },
          h('div', {}, h('h2', {}, 'Spese vere del mese'), h('div', { class: 'muted small' }, 'Diretta + contante, senza prelievi e ricariche')),
          h('div', { class: 'v num' }, euro(r.spese - r.entrateExtra))))),

    prossime.length > 0 && h('section', { class: 'card' },
      h('h2', {}, 'In arrivo', h('a', { href: '#/altro' }, 'Gestisci')),
      h('div', { class: 'lista-imp' }, prossime.map((s) =>
        h('div', {},
          h('div', {}, h('div', {}, store.categoria(s.ric.cat).icona, ' ', s.ric.motivo),
            h('div', { class: 'muted small' }, dataBreve(s.data), s.ric.rateTotali ? ` · rata ${(s.ric.rateFatte || 0) + 1} di ${s.ric.rateTotali}` : '', s.scaduta ? ' · ' : '', s.scaduta && h('span', { class: 'pill warn' }, 'da registrare'))),
          h('div', { style: { textAlign: 'right' } }, h('div', { class: 'num' }, euro(s.ric.importo)),
            h('button', { class: 'link', onclick: () => registraRicorrenza(s.ric, s.data) }, 'Registra')))))),

    budgetCat.length > 0 && h('section', { class: 'card' },
      h('h2', {}, 'Budget del mese', h('a', { href: '#/budget' }, 'Tutti')),
      budgetCat.map((c) => ({ c, s: spese.get(c.codice) || 0 })).sort((a, b) => b.s / b.c.budget - a.s / a.c.budget).slice(0, 4).map(({ c, s }) => {
        const p = s / c.budget;
        return h('div', { style: { margin: '10px 0' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '.92rem', marginBottom: '4px' } },
            h('span', {}, c.icona, ' ', c.nome), h('span', { class: 'num ' + (p > 1 ? 'neg' : 'muted') }, `${euro(s, true)} / ${euro(c.budget, true)}`)),
          h('div', { class: 'barra' + (p > 1 ? ' over' : p > 0.85 ? ' warn' : '') }, h('i', { style: { width: Math.min(100, p * 100) + '%' } })));
      })),

    h('section', {},
      h('div', { class: 'giorno' }, h('span', {}, 'Ultimi movimenti'), h('a', { class: 'link', href: '#/movimenti' }, 'Vedi tutti')),
      (() => {
        const ultimi = txs.filter((t) => t.mese === ctx.mese).sort((a, b) => b.data.localeCompare(a.data) || (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6);
        return ultimi.length ? h('div', { class: 'lista' }, ultimi.map((t) => rigaMovimento(t, imp.soglia, true)))
          : h('div', { class: 'card vuoto' }, h('div', { class: 'e' }, '🧾'), `Nessun movimento in ${nomeMese(ctx.mese)}.`, h('br'), 'Tocca + per aggiungerne uno.');
      })()));
}

export function chiediRetribuzione(mese) {
  const attuale = store.retribuzione(mese);
  const input = h('input', { inputmode: 'decimal', value: attuale == null ? '' : num(attuale).replace(/\./g, ''), placeholder: 'es. 2.300' });
  const chiudi = foglio(`Retribuzione · ${nomeMese(mese)}`, h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const v = parseImporto(input.value);
      await store.salvaRetribuzione(mese, isNaN(v) ? null : v);
      chiudi(); avviso('Retribuzione salvata');
    },
  },
    h('p', { class: 'muted small', style: { marginTop: 0 } }, 'Come nell\'Excel: la retribuzione del mese precedente, che paga le spese di questo mese.'),
    h('label', { class: 'campo' }, h('span', {}, 'Importo (€)'), input),
    h('button', { class: 'btn block', type: 'submit' }, 'Salva')));
}
