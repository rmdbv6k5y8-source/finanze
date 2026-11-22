// Modulo per aggiungere o modificare un movimento (le righe del vecchio Excel).
import * as store from '../store.js';
import { foglio, avviso, ctx } from '../app.js';
import { h, oggi, meseDi, parseImporto, num, euro, nomeMese, spostaMese } from '../util.js';
import { suggerimenti } from '../calc.js';
import { TAG } from '../categorie.js';

/**
 * @param {object} [base] movimento esistente (modifica) o modello (nuovo precompilato, senza id)
 * @param {{onSalvato?: (tx: object) => any}} [opz]
 */
export function apriModulo(base = {}, opz = {}) {
  const modifica = !!base.id;
  const m = {
    data: oggi(), metodo: 'C', cat: '', motivo: '', luogo: '', note: '', tag: [],
    ...base,
  };
  if (!modifica) { m.data = base.data || oggi(); delete m.mese; m.mese = base.mese; }
  m.tag = [...(m.tag || [])];
  let entrata = m.importo < 0;
  let meseManuale = !!(modifica && m.mese && m.mese !== meseDi(m.data));

  const inImporto = h('input', { inputmode: 'decimal', autocomplete: 'off', placeholder: '0,00', 'aria-label': 'Importo in euro',
    value: m.importo != null ? num(Math.abs(m.importo)).replace(/\./g, '') : '' });
  const boxImporto = h('label', { class: 'importo' + (entrata ? ' entrata' : '') }, h('span', {}, entrata ? '+ €' : '€'), inImporto);

  const segSegno = segmenti([['spesa', 'Spesa'], ['entrata', 'Entrata / rimborso']], entrata ? 'entrata' : 'spesa', (v) => {
    entrata = v === 'entrata';
    boxImporto.className = 'importo' + (entrata ? ' entrata' : '');
    boxImporto.firstChild.textContent = entrata ? '+ €' : '€';
    if (entrata && !m.tag.includes('rimb')) toggleTag('rimb');
  });
  const segMetodo = segmenti([['D', '🏦 Diretta'], ['C', '💶 Contante']], m.metodo, (v) => { m.metodo = v; });

  const inMotivo = h('input', { value: m.motivo, placeholder: 'es. COLAZIONE, PIENO FIAT 500…', autocapitalize: 'characters', autocomplete: 'off' });
  const inLuogo = h('input', { value: m.luogo, placeholder: 'es. Bar, supermercato, distributore', autocomplete: 'off' });
  const inData = h('input', { type: 'date', value: m.data, required: true });
  const inMese = h('input', { type: 'month', value: m.mese || meseDi(m.data) });
  const inNote = h('textarea', { placeholder: 'es. Gasolio 1,689€/L - 23,68L, Acquisto del…' }, m.note);
  inData.addEventListener('change', () => { if (!meseManuale) inMese.value = meseDi(inData.value || oggi()); });
  inMese.addEventListener('change', () => { meseManuale = inMese.value !== meseDi(inData.value); });

  // categorie
  const grigliaCat = h('div', { class: 'cats', role: 'radiogroup', 'aria-label': 'Categoria' });
  const disegnaCat = () => grigliaCat.replaceChildren(...store.categorie().map((c) =>
    h('button', { type: 'button', role: 'radio', 'aria-checked': String(m.cat === c.codice), class: m.cat === c.codice ? 'on' : '', onclick: () => { m.cat = c.codice; disegnaCat(); } },
      h('span', { class: 'i' }, c.icona), c.nome)));
  disegnaCat();

  // etichette (i colori dell'Excel)
  const boxTag = h('div', { class: 'tags' });
  const toggleTag = (k) => { m.tag = m.tag.includes(k) ? m.tag.filter((x) => x !== k) : [...m.tag, k]; disegnaTag(); };
  const disegnaTag = () => boxTag.replaceChildren(...Object.entries(TAG).map(([k, t]) =>
    h('button', { type: 'button', 'aria-pressed': String(m.tag.includes(k)), class: m.tag.includes(k) ? 'on' : '', onclick: () => toggleTag(k) },
      h('i', { style: { background: `var(--t-${k})` } }), t.breve)));
  disegnaTag();

  // suggerimenti dallo storico: scegliendo un motivo già usato si compilano luogo, categoria, pagamento
  const tutti = store.movimenti();
  const campoMotivo = autocompleta(inMotivo, (q) => suggerimenti(tutti, 'motivo', q), (s) => {
    inMotivo.value = s.valore;
    const u = s.ultimo;
    if (!inLuogo.value) inLuogo.value = u.luogo;
    if (!m.cat) { m.cat = u.cat; disegnaCat(); }
    if (!modifica) segMetodo.imposta(u.metodo);
    if (!inImporto.value && u.importo > 0) inImporto.value = num(u.importo);
  });
  const campoLuogo = autocompleta(inLuogo, (q) => suggerimenti(tutti, 'luogo', q), (s) => { inLuogo.value = s.valore; });

  const errore = h('p', { class: 'neg small', role: 'alert' });

  async function salva(eAltro) {
    const v = parseImporto(inImporto.value);
    if (!(v > 0)) { errore.textContent = 'Scrivi l\'importo (es. 3,20).'; inImporto.focus(); return; }
    if (!inMotivo.value.trim()) { errore.textContent = 'Scrivi il motivo della spesa.'; inMotivo.focus(); return; }
    if (!m.cat) { errore.textContent = 'Scegli una categoria.'; return; }
    const rec = {
      ...(modifica ? { id: m.id } : {}),
      data: inData.value || oggi(), mese: inMese.value || meseDi(inData.value || oggi()),
      motivo: inMotivo.value.trim(), luogo: inLuogo.value.trim(), importo: entrata ? -v : v,
      metodo: m.metodo, cat: m.cat, note: inNote.value.trim(), tag: m.tag,
    };
    const salvato = await store.salvaMovimento(rec);
    await opz.onSalvato?.(salvato);
    chiudi();
    avviso(modifica ? 'Modifica salvata' : `Aggiunto: ${rec.motivo} ${euro(rec.importo)}`);
    if (rec.mese !== ctx.mese && !modifica) avviso(`Aggiunto in ${nomeMese(rec.mese)}`, { testo: 'Vai', fn: () => { ctx.mese = rec.mese; location.hash = '#/movimenti'; } });
    if (eAltro) apriModulo({ data: salvato.data, metodo: salvato.metodo });
  }
  async function elimina() {
    const vecchio = { ...m };
    await store.elimina(m.id);
    chiudi();
    avviso('Movimento eliminato', { testo: 'Annulla', fn: () => store.ripristina(vecchio) });
  }

  const corpo = h('form', { onsubmit: (e) => { e.preventDefault(); salva(false); }, novalidate: true },
    h('div', { class: 'campo' }, segSegno),
    h('div', { class: 'campo' }, boxImporto),
    h('div', { class: 'campo' }, segMetodo, h('div', { class: 'muted small', style: { margin: '5px 4px 0' } }, 'Diretta = conto o carta di credito · Contante = contanti o prepagata Spider')),
    h('label', { class: 'campo' }, h('span', {}, 'Motivo'), campoMotivo),
    h('label', { class: 'campo' }, h('span', {}, 'Luogo / negozio'), campoLuogo),
    h('div', { class: 'sezione' }, 'Categoria'), grigliaCat,
    h('label', { class: 'campo', style: { marginTop: '14px' } }, h('span', {}, 'Data'), inData),
    h('label', { class: 'campo' }, h('span', {}, 'Note'), inNote),
    h('div', { class: 'sezione' }, 'Evidenzia come'), boxTag,
    h('details', { class: 'altro', open: meseManuale },
      h('summary', {}, 'Mese in cui conteggiarla'),
      h('label', { class: 'campo' }, h('span', {}, 'Come nell\'Excel: es. spese della carta di ottobre addebitate il 15 novembre → novembre'), inMese),
      h('div', { class: 'btnrow' },
        h('button', { type: 'button', class: 'btn sec', onclick: () => { inMese.value = spostaMese(meseDi(inData.value), 1); meseManuale = true; } }, 'Mese dopo la data'))),
    errore,
    h('div', { class: 'btnrow', style: { marginTop: '12px' } },
      h('button', { type: 'submit', class: 'btn' }, modifica ? 'Salva modifiche' : 'Salva'),
      !modifica && h('button', { type: 'button', class: 'btn sec', onclick: () => salva(true) }, 'Salva e aggiungi altro')),
    modifica && h('div', { class: 'btnrow', style: { marginTop: '10px' } },
      h('button', { type: 'button', class: 'btn sec', onclick: () => { chiudi(); const { id, ...copia } = m; apriModulo({ ...copia, importo: parseImporto(inImporto.value) * (entrata ? -1 : 1), data: oggi(), mese: undefined }); } }, 'Duplica con data di oggi'),
      h('button', { type: 'button', class: 'btn danger', onclick: elimina }, 'Elimina')));

  const chiudi = foglio(modifica ? 'Modifica movimento' : 'Nuovo movimento', corpo);
  if (!modifica && !base.motivo) inImporto.focus();
}

/** Controllo a segmenti (scelta tra 2-3 opzioni). */
export function segmenti(opzioni, valore, onCambio) {
  const box = h('div', { class: 'seg', role: 'radiogroup', style: { display: 'flex' } });
  const disegna = () => box.replaceChildren(...opzioni.map(([v, t]) =>
    h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === valore), class: v === valore ? 'on' : '', style: { flex: 1 }, onclick: () => { valore = v; disegna(); onCambio(v); } }, t)));
  box.imposta = (v) => { valore = v; disegna(); onCambio(v); };
  disegna();
  return box;
}

function autocompleta(input, cerca, scegli) {
  const wrap = h('div', { style: { position: 'relative' } }, input);
  let lista;
  const chiudi = () => { lista?.remove(); lista = null; };
  input.addEventListener('input', () => {
    chiudi();
    const r = cerca(input.value);
    if (!r.length || (r.length === 1 && r[0].valore === input.value)) return;
    lista = h('div', { class: 'sugg' }, r.map((s) =>
      h('button', { type: 'button', onpointerdown: (e) => e.preventDefault(), onclick: () => { scegli(s); chiudi(); } },
        h('span', {}, s.valore), h('span', { class: 'muted small' }, `${s.volte}×`))));
    wrap.append(lista);
  });
  input.addEventListener('blur', () => setTimeout(chiudi, 150));
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lista) { e.stopPropagation(); chiudi(); } });
  return wrap;
}
