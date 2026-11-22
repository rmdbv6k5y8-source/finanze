import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { riepilogoMese, contanteDisponibile, prossimaData, scadenze, unisci, rifornimenti, suggerimenti } from '../app/js/calc.js';
import { leggiExcel, scriviExcel } from '../app/js/excel.js';
const XLSX = createRequire(import.meta.url)('../app/vendor/xlsx.mini.min.js');

const tx = (o) => ({ data: '2026-01-05', mese: '2026-01', motivo: 'X', luogo: '', metodo: 'D', cat: 'Spes', importo: 10, tag: [], ...o });

test('riepilogo come in fondo al foglio Excel', () => {
  const t = [tx({ importo: 100 }), tx({ cat: 'Prel', importo: 240 }), tx({ metodo: 'C', importo: 3.2, cat: 'Cola' }), tx({ importo: -145.17, cat: 'Vari' }), tx({ mese: '2026-02', importo: 999 })];
  const r = riepilogoMese(t, '2026-01', 3933);
  assert.equal(r.diretta, 194.83);
  assert.equal(r.contante, 3.2);
  assert.equal(r.residuo, 3738.17);
  assert.equal(r.giroconti, 240);
  assert.equal(r.spese, 103.2);
  assert.equal(r.entrateExtra, 145.17);
  assert.equal(riepilogoMese(t, '2026-01', null).residuo, null);
});

test('contanti in tasca: prelievi e ricariche meno spese in contante', () => {
  const t = [tx({ cat: 'Prel', importo: 240 }), tx({ cat: 'Rica', importo: 20 }), tx({ metodo: 'C', importo: 50 }), tx({ metodo: 'C', importo: -5 })];
  assert.equal(contanteDisponibile(t, 10), 225);
});

test('ricorrenze: giorno 31 nei mesi corti, rate finite', () => {
  assert.equal(prossimaData({ inizio: '2026-01-31', giorno: 31, frequenza: 'mensile' }, '2026-02-01'), '2026-02-28');
  assert.equal(prossimaData({ inizio: '2026-01-15', giorno: 15, frequenza: 'trimestrale' }, '2026-02-01'), '2026-04-15');
  const s = scadenze([{ id: 'a', inizio: '2026-01-15', giorno: 15, frequenza: 'mensile', ultimaRegistrata: '2026-11-15' },
    { id: 'b', inizio: '2026-01-15', giorno: 15, frequenza: 'mensile', rateTotali: 5, rateFatte: 5 }], '2026-11-22');
  assert.deepEqual(s.map((x) => [x.ric.id, x.data, x.scaduta]), [['a', '2026-12-15', false]]);
});

test('sincronizzazione: vince la modifica più recente, le cancellazioni si propagano', () => {
  const a = [{ id: '1', v: 'vecchio', updatedAt: '2026-01-01' }, { id: '2', updatedAt: '2026-01-05' }];
  const b = [{ id: '1', v: 'nuovo', updatedAt: '2026-01-02' }, { id: '2', deleted: true, updatedAt: '2026-01-06' }, { id: '3', updatedAt: '2026-01-01' }];
  const r = unisci(a, b);
  const m = Object.fromEntries(r.records.map((x) => [x.id, x]));
  assert.equal(m['1'].v, 'nuovo'); assert.equal(m['2'].deleted, true); assert.ok(m['3']);
  assert.deepEqual([r.nuovi, r.aggiornati], [1, 2]);
  assert.equal(unisci(b, a).records.find((x) => x.id === '1').v, 'nuovo');
});

test('carburante letto dalle note', () => {
  const [r] = rifornimenti([tx({ cat: 'Carb', motivo: 'PIENO JEEP RENEGADE', importo: 40, note: 'Gasolio 1,689€/L - 23,68L' })]);
  assert.deepEqual([r.tipo, r.prezzo, r.litri, r.veicolo], ['gasolio', 1.689, 23.68, 'Jeep Renegade']);
});

test('suggerimenti: prima chi inizia col testo, poi i più usati', () => {
  const t = [tx({ motivo: 'SPESA' }), tx({ motivo: 'SPESA' }), tx({ motivo: 'Fatture SPESA' }), tx({ motivo: 'SPESA', data: '2026-02-01', luogo: 'COOP' })];
  const s = suggerimenti(t, 'motivo', 'spe');
  assert.equal(s[0].valore, 'SPESA'); assert.equal(s[0].volte, 3); assert.equal(s[0].ultimo.luogo, 'COOP');
});

test('Excel: andata e ritorno nel formato a fogli mensili, senza doppioni', () => {
  const t = [tx({ id: 'a', data: '2026-01-02', motivo: 'COLAZIONE', luogo: 'BAR', metodo: 'C', importo: 3.2, cat: 'Cola' }),
    tx({ id: 'b', data: '2026-01-02', motivo: 'COLAZIONE', luogo: 'BAR', metodo: 'C', importo: 3.2, cat: 'Cola' }),
    tx({ id: 'c', data: '2025-12-31', motivo: 'BOLLO', importo: 193.98, cat: 'Tass' })];
  const buf = scriviExcel(XLSX, t, (m) => (m === '2026-01' ? 3933 : null), 2026);
  const r = leggiExcel(XLSX, new Uint8Array(buf));
  const mov = r.records.filter((x) => x.t === 'tx');
  assert.equal(mov.length, 3);
  assert.equal(new Set(mov.map((x) => x.id)).size, 3);
  assert.equal(mov.find((x) => x.motivo === 'BOLLO').data, '2025-12-31');
  assert.equal(mov.find((x) => x.motivo === 'BOLLO').mese, '2026-01');
  assert.equal(r.records.find((x) => x.t === 'entrata').importo, 3933);
  assert.deepEqual(leggiExcel(XLSX, new Uint8Array(buf)).records.map((x) => x.id), r.records.map((x) => x.id));
});
