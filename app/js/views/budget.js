// Budget mensile per categoria, all'idea di YNAB: ogni euro della retribuzione ha un compito.
import * as store from '../store.js';
import { ctx, barraMese, avviso } from '../app.js';
import { h, euro, parseImporto, num, spostaMese, nomeMese } from '../util.js';
import { perCategoria } from '../calc.js';
import { chiediRetribuzione } from './home.js';

export default function budget() {
  const txs = store.movimenti();
  const cats = store.categorie().filter((c) => !c.giroconto);
  const spese = new Map(perCategoria(txs, (t) => t.mese === ctx.mese).map((x) => [x.cat, x.totale]));
  const ret = store.retribuzione(ctx.mese);
  const assegnato = cats.reduce((s, c) => s + (c.budget || 0), 0);
  const conBudget = cats.filter((c) => c.budget > 0), senza = cats.filter((c) => !(c.budget > 0));

  // media degli ultimi 3 mesi completi, per suggerire i budget
  const mesi = [1, 2, 3].map((i) => spostaMese(ctx.mese, -i));
  const media = new Map(perCategoria(txs, (t) => mesi.includes(t.mese)).map((x) => [x.cat, x.totale / 3]));

  const riga = (c) => {
    const s = spese.get(c.codice) || 0;
    const input = h('input', { inputmode: 'decimal', 'aria-label': `Budget ${c.nome}`, value: c.budget ? num(c.budget).replace(/\./g, '') : '', placeholder: '—' });
    input.addEventListener('change', async () => {
      const v = parseImporto(input.value);
      await store.salvaCategoria({ ...c, budget: isNaN(v) ? 0 : v });
    });
    input.addEventListener('keydown', (e) => e.key === 'Enter' && input.blur());
    const p = c.budget ? s / c.budget : 0;
    const resto = (c.budget || 0) - s;
    return h('div', { class: 'budget-riga' },
      h('span', { class: 'i' }, c.icona),
      h('div', {}, h('div', { style: { fontWeight: 600 } }, c.nome),
        h('div', { class: 'small ' + (c.budget && resto < 0 ? 'neg' : 'muted') },
          `Spesi ${euro(s)}`, c.budget ? (resto >= 0 ? ` · restano ${euro(resto)}` : ` · sforato di ${euro(-resto)}`) : media.get(c.codice) ? ` · media ${euro(media.get(c.codice), true)}/mese` : '')),
      input,
      c.budget ? h('div', { class: 'barra' + (p > 1 ? ' over' : p > 0.85 ? ' warn' : '') }, h('i', { style: { width: Math.min(100, p * 100) + '%' } })) : null);
  };

  async function suggerisci() {
    const daFare = cats.filter((c) => !(c.budget > 0) && (media.get(c.codice) || 0) >= 5);
    for (const c of daFare) await store.salvaCategoria({ ...c, budget: Math.ceil(media.get(c.codice) / 10) * 10 });
    avviso(daFare.length ? `Budget proposti per ${daFare.length} categorie (media ultimi 3 mesi)` : 'Nessuna categoria da proporre');
  }

  return h('div', {},
    h('div', { class: 'top' }, h('h1', {}, 'Budget'), h('a', { class: 'iconbtn', href: '#/altro', 'aria-label': 'Altro' }, '⚙️')),
    barraMese(),
    h('section', { class: 'card' },
      h('div', { class: 'totali' },
        h('div', { onclick: () => chiediRetribuzione(ctx.mese), style: { cursor: 'pointer' } }, h('small', {}, 'Retribuz. ✎'), h('b', { class: 'num' }, ret == null ? '—' : euro(ret, true))),
        h('div', {}, h('small', {}, 'Assegnato'), h('b', { class: 'num' }, euro(assegnato, true))),
        h('div', {}, h('small', {}, 'Da assegnare'), h('b', { class: 'num ' + (ret != null && ret - assegnato < 0 ? 'neg' : 'pos') }, ret == null ? '—' : euro(ret - assegnato, true)))),
      h('p', { class: 'muted small', style: { margin: '10px 2px 0' } },
        'Decidi quanto vuoi spendere al mese per ogni categoria: la cifra vale per tutti i mesi. Quello che resta "da assegnare" è il risparmio previsto.')),
    conBudget.length > 0 && h('section', { class: 'card' }, h('h2', {}, `Con budget · ${nomeMese(ctx.mese)}`), conBudget.map(riga)),
    h('section', { class: 'card' },
      h('h2', {}, 'Senza budget', h('button', { class: 'link', onclick: suggerisci }, '✨ Proponi dalla media')),
      senza.map(riga)));
}
