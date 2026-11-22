// Grafici semplici in SVG/HTML, senza librerie esterne.
import { h, euro } from './util.js';

/** Barre verticali con valori positivi e negativi. dati: [{etichetta, valore, colore?}] */
export function barre(dati, { altezza = 180, larghezza = 640, formato = (v) => euro(v, true) } = {}) {
  const W = larghezza, H = altezza, padT = 18, padB = 36;
  const max = Math.max(0, ...dati.map((d) => d.valore)), min = Math.min(0, ...dati.map((d) => d.valore));
  const span = max - min || 1;
  const y = (v) => padT + ((max - v) / span) * (H - padT - padB);
  const bw = W / Math.max(dati.length, 1);
  return h('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': dati.map((d) => `${d.etichetta} ${d.testo ?? formato(d.valore)}`).join(', ') },
    h('line', { class: 'ax', x1: 0, x2: W, y1: y(0), y2: y(0) }),
    dati.map((d, i) => {
      const x = i * bw + bw * 0.18, w = bw * 0.64, y0 = y(Math.max(0, d.valore)), hh = Math.max(Math.abs(y(d.valore) - y(0)), d.valore ? 1.5 : 0);
      const colore = d.colore || (d.valore < 0 ? 'var(--neg)' : 'var(--pos)');
      return h('g', {},
        h('title', {}, `${d.etichetta}: ${d.testo ?? formato(d.valore)}`),
        h('rect', { x, y: y0, width: w, height: hh, rx: 4, fill: colore, opacity: d.attenuato ? 0.35 : 1 }),
        d.valore !== 0 && h('text', { x: x + w / 2, y: d.valore >= 0 ? y0 - 5 : Math.min(y0 + hh + 12, H - padB + 12), 'text-anchor': 'middle', style: { fontSize: '10px' } }, d.testo ?? formato(d.valore)),
        h('text', { x: x + w / 2, y: H - 6, 'text-anchor': 'middle' }, d.etichetta));
    }));
}

/** Barre orizzontali (classifiche per categoria/luogo). righe: [{nome, icona?, valore, colore?}] */
export function classifica(righe, { onclick } = {}) {
  const max = Math.max(...righe.map((r) => r.valore), 1);
  return h('div', {}, righe.map((r) =>
    h('div', { class: 'hbar', style: onclick ? { cursor: 'pointer' } : null, onclick: onclick && (() => onclick(r)) },
      h('span', { class: 'n' }, r.icona ? r.icona + ' ' : '', r.nome),
      h('div', { class: 'barra' }, h('i', { style: { width: `${Math.max(0, (r.valore / max) * 100)}%`, background: r.colore || 'var(--accent)' } })),
      h('span', { class: 'num' }, euro(r.valore)))));
}
