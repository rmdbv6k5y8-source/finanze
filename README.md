# Finanze

App web installabile (PWA) per tenere le spese, pensata per sostituire un foglio Excel delle spese.
Funziona su iPhone (Safari → "Aggiungi alla schermata Home") e su PC Windows (Edge/Chrome → "Installa app").
Niente server e niente account: i dati stanno in IndexedDB sul dispositivo e si spostano solo con i file di copia.

## Cosa fa
- **Movimenti** come le righe dell'Excel: data, motivo, luogo, importo, *Diretta* (conto/carta) o *Contante* (contanti/Spider),
  causale (gli stessi codici: Carb, Cola, Spes…), note, colori/evidenze (imprevisto, vacanza, rimborso, carta).
  Un *mese di competenza* separato dalla data, perché le spese della carta UNICA finiscono nel mese dell'addebito.
- **Home**: residuo del mese = retribuzione − uscite dirette (stessa formula della riga RESIDUO), contanti stimati in tasca,
  pulsanti "al volo" per le spese ricorrenti (colazione, chiavetta caffè…), spese fisse in arrivo.
- **Budget** per categoria (idea YNAB), con proposta dalla media degli ultimi 3 mesi.
- **Analisi**: risparmio mese per mese (foglio "Risparmio"), categorie, luoghi, carburante (prezzo €/L e litri letti dalle note).
- **Spese fisse e rate** (Wallet/Firefly III): TIM, Vodafone, Prime, rate "3a di 12"; si registrano con un tocco.
- **Sincronizzazione** iPhone ↔ PC con file `.json` (unione per id, vince la modifica più recente, le cancellazioni si propagano).
- **Excel**: import del vecchio file (fogli `GEN_26`…, retribuzioni, colori delle righe; reimportare non crea doppioni) ed export nello stesso formato.

## Sviluppo
```
npm start        # http://localhost:8765
npm test         # test della logica (calcoli, sincronizzazione, Excel)
```
Nessuna build: HTML/CSS/JS moduli in `app/`. Dopo ogni modifica ai file aumentare `VERSIONE` in `app/sw.js`.
`app/vendor/xlsx.mini.min.js` è SheetJS 0.18.5 (Apache-2.0), caricato solo per import/export Excel.

## Pubblicazione
Per l'iPhone l'app va servita in HTTPS (es. GitHub Pages / Netlify con la sola cartella `app/`).
Il codice non contiene dati personali: i dati vengono caricati sul dispositivo con "Importa dal vecchio Excel".
