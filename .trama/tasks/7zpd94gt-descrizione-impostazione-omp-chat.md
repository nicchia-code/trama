---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
drift: null
proposal: c18149e0
agent: false
created: 2026-10-23T12:11:00.557Z
finished: 2026-10-23T12:12:15.692Z
---
# Descrizione di omp Chat aggiornata

L'impostazione `trama.ompChat` mantiene il titolo `omp Chat`, ma la sua descrizione, in inglese, diventa esattamente: «On, with omp: Trama's jobs open a conversation in the omp Chat view instead of a terminal. Every command runs without asking.». La descrizione precedente parlava della vista omp Chat «of the secondary side bar»: non è più vera, perché in Cursor la vista omp Chat sta nel pannello in basso, mentre in VS Code sta nella barra laterale secondaria; per questo la descrizione non nomina più nessuna posizione.

Quando il lavoro è finito, il nuovo testo compare sia nelle impostazioni dell'editor (il `markdownDescription` di `trama.ompChat` nel manifest dell'estensione) sia nella scheda Settings del pannello Trama, che prende la descrizione dallo stesso manifest.

Il resto del comportamento resta com'è: con `trama.agent` diverso da `omp` la `Checkbox` è disabilitata e mostra il suo valore salvato, e a destra del titolo, dopo la «i», compare il testo secondario `Only with omp`; con `trama.agent` su `omp` la nota non c'è e il controllo è attivo.
