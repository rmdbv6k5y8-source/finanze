// Altro: sincronizzazione/backup, import Excel, retribuzioni, ricorrenze e rate, categorie, impostazioni.
import * as store from '../store.js';
import { foglio, avviso } from '../app.js';
import { h, euro, oggi, meseDi, nomeMese, parseImporto, num, dataBreve } from '../util.js';
import { scadenze } from '../calc.js';
import { leggiExcel, scriviExcel } from '../excel.js';
import { apriModulo, segmenti } from './modulo.js';
import { chiediRetribuzione } from './home.js';

const FREQ = [['mensile', 'Ogni mese'], ['bimestrale', 'Ogni 2 mesi'], ['trimestrale', 'Ogni 3 mesi'], ['semestrale', 'Ogni 6 mesi'], ['annuale', 'Ogni anno']];

export default function altro() {
  const imp = store.impostazioni();
  const ric = store.ricorrenti().sort((a, b) => a.motivo.localeCompare(b.motivo));
  const prossime = new Map(scadenze(ric, oggi()).map((s) => [s.ric.id, s.data]));
  const mesi = [...new Set([...store.mesiConDati(), meseDi(oggi())])].sort().reverse();
  const iPhone = /iPhone|iPad/.test(navigator.userAgent);
  const installata = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  return h('div', {},
    h('div', { class: 'top' }, h('h1', {}, 'Altro')),

    !installata && h('section', { class: 'card nota' },
      h('b', {}, '📲 Installa l\'app'), h('br'),
      iPhone ? 'In Safari tocca il pulsante Condividi (il quadrato con la freccia) e poi "Aggiungi alla schermata Home".'
        : 'In Edge o Chrome clicca l\'icona "Installa" a destra nella barra dell\'indirizzo (o menu ⋯ → App → Installa).',
      ' Così si apre come un\'app vera e funziona anche senza internet.'),

    h('section', { class: 'card' },
      h('h2', {}, '🔄 Sincronizza iPhone e PC'),
      h('p', { class: 'muted small', style: { marginTop: 0 } },
        'I dati stanno solo su questo dispositivo. Per averli uguali sull\'altro: qui premi "Invia copia", mandala all\'altro dispositivo (AirDrop, iCloud Drive, WhatsApp, e-mail…), lì apri Altro → "Ricevi copia". Le due copie vengono unite: non si perde niente, vince la modifica più recente.'),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', onclick: inviaCopia }, '📤 Invia copia'),
        h('button', { class: 'btn sec', onclick: () => scegliFile('.json,application/json', riceviCopia) }, '📥 Ricevi copia')),
      h('p', { class: 'muted small', style: { marginBottom: 0 } }, imp.ultimoBackup ? `Ultima copia creata: ${new Date(imp.ultimoBackup).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Nessuna copia creata finora. La copia serve anche come salvataggio di sicurezza.')),

    h('section', { class: 'card' },
      h('h2', {}, '📗 Excel'),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn sec', onclick: () => scegliFile('.xlsx,.xls', importaExcel) }, 'Importa dal vecchio Excel'),
        h('button', { class: 'btn sec', onclick: esportaExcel }, 'Esporta in Excel')),
      h('p', { class: 'muted small', style: { marginBottom: 0 } }, 'L\'import legge i fogli mensili (GEN_26, FEB_26…), le retribuzioni e i colori delle righe. Se importi due volte lo stesso file non si creano doppioni.')),

    h('div', { class: 'grid2' },
      h('section', { class: 'card' },
        h('h2', {}, '💶 Retribuzioni'),
        h('div', { class: 'lista-imp' }, mesi.slice(0, 14).map((m) => {
          const r = store.retribuzione(m);
          return h('button', { class: 'riga', onclick: () => chiediRetribuzione(m) },
            h('span', {}, nomeMese(m)), h('span', { class: 'num ' + (r == null ? 'muted' : '') }, r == null ? 'inserisci ›' : euro(r)));
        }))),

      h('section', { class: 'card' },
        h('h2', {}, '📅 Spese fisse e rate', h('button', { class: 'link', onclick: () => modificaRicorrenza() }, '+ Aggiungi')),
        ric.length === 0
          ? h('p', { class: 'muted small' }, 'Bollette, abbonamenti (TIM, Vodafone, Amazon Prime) e rate (es. 12 rate del frigorifero). L\'app ti ricorda quando arrivano e le registri con un tocco.')
          : h('div', { class: 'lista-imp' }, ric.map((r) => h('button', { class: 'riga', onclick: () => modificaRicorrenza(r) },
            h('span', {}, h('div', {}, store.categoria(r.cat).icona, ' ', r.motivo),
              h('div', { class: 'muted small' }, FREQ.find((f) => f[0] === r.frequenza)?.[1], ` il ${r.giorno}`,
                r.rateTotali ? ` · rate ${r.rateFatte || 0}/${r.rateTotali}` : '',
                r.attiva === false ? ' · in pausa' : prossime.get(r.id) ? ` · prossima ${dataBreve(prossime.get(r.id))}` : ' · finita')),
            h('span', { class: 'num' }, euro(r.importo))))))),

    h('div', { class: 'grid2' },
      h('section', { class: 'card' },
        h('h2', {}, '🏷️ Categorie', h('button', { class: 'link', onclick: () => modificaCategoria() }, '+ Nuova')),
        h('div', { class: 'lista-imp' }, store.categorie().map((c) => h('button', { class: 'riga', onclick: () => modificaCategoria(c) },
          h('span', {}, c.icona, ' ', c.nome), h('span', { class: 'muted small' }, c.codice))))),

      h('section', { class: 'card' },
        h('h2', {}, '⚙️ Impostazioni'),
        impostazioneNumero('Spese in grassetto da (€)', imp.soglia, (v) => store.salvaImpostazioni({ soglia: v })),
        impostazioneNumero('Contanti in tasca all\'inizio (€)', imp.contanteIniziale, (v) => store.salvaImpostazioni({ contanteIniziale: v }),
          'Serve a far tornare la stima "In tasca": metti quanti contanti avevi prima del primo movimento registrato.'),
        h('p', { class: 'muted small' }, 'Scorciatoia sul PC: Ctrl+N per un nuovo movimento.'),
        h('button', { class: 'btn danger block', onclick: cancellaTutto }, 'Cancella tutti i dati da questo dispositivo'))));
}

function impostazioneNumero(etichetta, valore, salva, aiuto) {
  const input = h('input', { inputmode: 'decimal', value: num(valore || 0).replace(/\./g, '') });
  input.addEventListener('change', async () => { const v = parseImporto(input.value); if (!isNaN(v)) { await salva(v); avviso('Salvato'); } });
  return h('label', { class: 'campo' }, h('span', {}, etichetta), input, aiuto && h('div', { class: 'muted small', style: { margin: '4px' } }, aiuto));
}

function scegliFile(accept, fn) {
  const i = h('input', { type: 'file', accept, style: { display: 'none' } });
  i.addEventListener('change', () => { if (i.files[0]) fn(i.files[0]).catch((e) => avviso('⚠️ ' + (e.message || e))); i.remove(); });
  document.body.append(i);
  i.click();
}

async function condividiFile(nome, blob) {
  const file = new File([blob], nome, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: nome }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: nome });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return true;
}

async function inviaCopia() {
  const nome = `Finanze ${oggi()}.json`;
  const ok = await condividiFile(nome, new Blob([JSON.stringify(store.esporta())], { type: 'application/json' }));
  if (ok) { await store.salvaImpostazioni({ ultimoBackup: new Date().toISOString() }); avviso('Copia creata: ' + nome); }
}

async function riceviCopia(file) {
  const json = JSON.parse(await file.text());
  const { nuovi, aggiornati } = await store.importa(json);
  avviso(nuovi + aggiornati ? `Fatto: ${nuovi} nuovi, ${aggiornati} aggiornati` : 'Era già tutto uguale 👍');
}

let XLSXp;
const caricaXLSX = () => (XLSXp ??= new Promise((ok, ko) => {
  const s = h('script', { src: 'vendor/xlsx.mini.min.js' });
  s.onload = () => ok(window.XLSX); s.onerror = () => ko(new Error('Impossibile caricare il modulo Excel'));
  document.head.append(s);
}));

async function importaExcel(file) {
  const XLSX = await caricaXLSX();
  const { records, mesi, saltate } = leggiExcel(XLSX, new Uint8Array(await file.arrayBuffer()));
  if (!mesi.length) throw new Error('Non ho trovato fogli mensili tipo "GEN_26" nel file.');
  const n = records.filter((r) => r.t === 'tx').length;
  const chiudi = foglio('Importa dal vecchio Excel', h('div', {},
    h('p', {}, `Trovati ${n} movimenti in ${mesi.length} mesi (${nomeMese(mesi[0])} – ${nomeMese(mesi[mesi.length - 1])}), con le retribuzioni.`),
    saltate.length > 0 && h('p', { class: 'small neg' }, `Righe senza data valida, saltate: ${saltate.join('; ')}`),
    h('button', { class: 'btn block', onclick: async () => {
      // l'import non sovrascrive ciò che è già stato modificato nell'app
      const { nuovi } = await store.importa({ app: 'finanze', records: records.map((r) => ({ ...r, updatedAt: '2000-01-01T00:00:00Z' })) });
      chiudi(); avviso(`Importati ${nuovi} elementi`);
    } }, 'Importa')));
}

async function esportaExcel() {
  const XLSX = await caricaXLSX();
  const anni = [...new Set(store.mesiConDati().map((m) => m.slice(0, 4)))];
  const anno = +(anni.at(-1) || oggi().slice(0, 4));
  const esegui = async (a) => {
    const buf = scriviExcel(XLSX, store.movimenti(), store.retribuzione, a);
    await condividiFile(`Spese ${a}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  };
  if (anni.length <= 1) return esegui(anno);
  const chiudi = foglio('Esporta in Excel', h('div', { class: 'btnrow' }, anni.reverse().map((a) => h('button', { class: 'btn sec', onclick: () => { chiudi(); esegui(+a); } }, a))));
}

async function cancellaTutto() {
  if (!confirm('Cancellare TUTTI i movimenti, budget e impostazioni da questo dispositivo? Fai prima "Invia copia" se vuoi tenerli.')) return;
  if (!confirm('Sei proprio sicuro? Non si può annullare.')) return;
  await store.cancellaTutto();
  avviso('Dati cancellati');
}

function modificaCategoria(c) {
  const nuova = !c;
  c = c || { codice: '', nome: '', icona: '🏷️', colore: '#748ffc', budget: 0, ordine: store.categorie().length };
  const codice = h('input', { value: c.codice, maxlength: 6, placeholder: 'es. Anim', disabled: !nuova });
  const nome = h('input', { value: c.nome, placeholder: 'es. Animali' });
  const icona = h('input', { value: c.icona, maxlength: 4 });
  const colore = h('input', { type: 'color', value: c.colore });
  const chiudi = foglio(nuova ? 'Nuova categoria' : 'Modifica categoria', h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const cod = codice.value.trim();
      if (!cod || !nome.value.trim()) return avviso('Servono codice e nome');
      if (nuova && store.categorie().some((x) => x.codice.toLowerCase() === cod.toLowerCase())) return avviso('Codice già usato');
      await store.salvaCategoria({ ...c, codice: cod, nome: nome.value.trim(), icona: icona.value.trim() || '🏷️', colore: colore.value });
      chiudi(); avviso('Categoria salvata');
    },
  },
    h('label', { class: 'campo' }, h('span', {}, 'Codice breve (come nella colonna "Causa" dell\'Excel)'), codice),
    h('label', { class: 'campo' }, h('span', {}, 'Nome'), nome),
    h('div', { class: 'btnrow' }, h('label', { class: 'campo', style: { flex: 1 } }, h('span', {}, 'Icona (emoji)'), icona), h('label', { class: 'campo', style: { flex: 1 } }, h('span', {}, 'Colore'), colore)),
    h('button', { class: 'btn block', type: 'submit' }, 'Salva')));
}

function modificaRicorrenza(r) {
  const nuova = !r;
  r = { motivo: '', luogo: 'ADDEBITO DIRETTO SUL C/C', importo: 0, metodo: 'D', cat: 'Boll', note: '', frequenza: 'mensile', giorno: +oggi().slice(8), inizio: oggi(), rateTotali: null, rateFatte: 0, attiva: true, ...r };
  const f = {
    motivo: h('input', { value: r.motivo, placeholder: 'es. Fattura TIM WiFi Casa' }),
    luogo: h('input', { value: r.luogo }),
    importo: h('input', { inputmode: 'decimal', value: r.importo ? num(r.importo).replace(/\./g, '') : '', placeholder: '0,00' }),
    cat: h('select', {}, store.categorie().map((c) => h('option', { value: c.codice, selected: c.codice === r.cat }, `${c.icona} ${c.nome}`))),
    frequenza: h('select', {}, FREQ.map(([v, t]) => h('option', { value: v, selected: v === r.frequenza }, t))),
    giorno: h('input', { type: 'number', min: 1, max: 31, value: r.giorno }),
    inizio: h('input', { type: 'date', value: r.inizio }),
    rateTotali: h('input', { type: 'number', min: 0, value: r.rateTotali || '', placeholder: 'vuoto = senza fine' }),
    rateFatte: h('input', { type: 'number', min: 0, value: r.rateFatte || 0 }),
    note: h('input', { value: r.note, placeholder: 'es. SIM secondaria' }),
  };
  let metodo = r.metodo, attiva = r.attiva !== false;
  const chiudi = foglio(nuova ? 'Nuova spesa fissa o rata' : 'Spesa fissa o rata', h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const importo = parseImporto(f.importo.value);
      if (!f.motivo.value.trim() || !(importo > 0)) return avviso('Servono motivo e importo');
      await store.salvaRicorrente({ ...r, motivo: f.motivo.value.trim(), luogo: f.luogo.value.trim(), importo, metodo, cat: f.cat.value, note: f.note.value.trim(),
        frequenza: f.frequenza.value, giorno: Math.min(31, Math.max(1, +f.giorno.value || 1)), inizio: f.inizio.value || oggi(),
        rateTotali: +f.rateTotali.value || null, rateFatte: +f.rateFatte.value || 0, attiva });
      chiudi(); avviso('Salvata');
    },
  },
    h('label', { class: 'campo' }, h('span', {}, 'Motivo'), f.motivo),
    h('label', { class: 'campo' }, h('span', {}, 'Luogo'), f.luogo),
    h('div', { class: 'btnrow' }, h('label', { class: 'campo', style: { flex: 1 } }, h('span', {}, 'Importo (€)'), f.importo), h('label', { class: 'campo', style: { flex: 1 } }, h('span', {}, 'Categoria'), f.cat)),
    h('div', { class: 'campo' }, segmenti([['D', '🏦 Diretta'], ['C', '💶 Contante']], metodo, (v) => { metodo = v; })),
    h('div', { class: 'btnrow' }, h('label', { class: 'campo', style: { flex: 2 } }, h('span', {}, 'Frequenza'), f.frequenza), h('label', { class: 'campo', style: { flex: 1 } }, h('span', {}, 'Giorno'), f.giorno)),
    h('label', { class: 'campo' }, h('span', {}, 'A partire da'), f.inizio),
    h('div', { class: 'btnrow' }, h('label', { class: 'campo', style: { flex: 1 } }, h('span', {}, 'Numero rate'), f.rateTotali), h('label', { class: 'campo', style: { flex: 1 } }, h('span', {}, 'Già pagate'), f.rateFatte)),
    h('label', { class: 'campo' }, h('span', {}, 'Note'), f.note),
    h('div', { class: 'campo' }, segmenti([['si', 'Attiva'], ['no', 'In pausa']], attiva ? 'si' : 'no', (v) => { attiva = v === 'si'; })),
    h('button', { class: 'btn block', type: 'submit' }, 'Salva'),
    !nuova && h('button', { type: 'button', class: 'btn danger block', style: { marginTop: '10px' }, onclick: async () => { await store.elimina(r.id); chiudi(); avviso('Eliminata'); } }, 'Elimina')));
}

/** Apre il modulo già compilato con la spesa fissa; al salvataggio avanza la ricorrenza. */
export function registraRicorrenza(r, data) {
  const n = (r.rateFatte || 0) + 1;
  const note = r.rateTotali ? `${n}a rata di ${r.rateTotali}${r.note ? ' - ' + r.note : ''}` : r.note;
  apriModulo({ motivo: r.motivo, luogo: r.luogo, importo: r.importo, metodo: r.metodo, cat: r.cat, note, data, mese: meseDi(data) },
    { onSalvato: () => store.salvaRicorrente({ ...r, ultimaRegistrata: data, rateFatte: n }) });
}

