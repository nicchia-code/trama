---
status: approved
base:
  actors/editor-chat.md: df03cd90206c62443c93730745945d0cdf3750f5997d004bda21f6a53b10057c
  requirements/tech/editor-chat.md: 8d7ff2599bc5052e331b9755e7fe949a69db754c0486a7d0b8f6e55893323f97
  requirements/quality/main.md: 524be898dfa23b2374351137bdbad74b789da7e33b6530d2618e9abd5aede429
delete: []
request: 2026-10-18T11-59-17
created: 2026-10-18T10:17:53.423Z
label: Ghost Cursor
---
# Ghost affidabili su Cursor

Nella chat di Cursor i ghost restano spesso in Active ben oltre la fine del lavoro: la «durata massima» vista finora era la vecchia quiete di 15 minuti, tolta dal Drift 3yxry7wd, quindi senza questa Proposal resterebbero fino al riavvio dell'editor. Un ghost della chat sparisce solo con lo `stop` di una conversazione riconosciuta come di Trama, e oggi quel segnale si perde troppo facilmente: conversazione riconosciuta solo da un prompt che comincia con «Use the trama-» o «/trama-», memoria persa al reload, hook consegnato a una sola finestra in un secondo, voci di `~/.cursor/hooks.json` che dopo un aggiornamento dell'estensione puntano a un programma che non c'è più.

Decisioni prese:
- Una conversazione è di Trama se un suo prompt nomina, in qualunque punto, una skill di lavoro di Trama (`trama-design`, `trama-scan`, `trama-implement`, `trama-import`, `trama-resolve-drifts`, `trama-setup`), in Cursor come in Copilot.
- Solo in Cursor, è di Trama anche se il suo agente lancia un comando `trama` che registra lavoro: un annuncio, `trama proposal new`, la presa di un Task (`task move … doing`) o `trama ask`; le letture non la segnano. Lo dice l'hook `afterShellExecution`, filtrato su `trama`. Assunzione: `task next` non sposta nulla, quindi conta come lettura, a differenza di quanto elencato nella domanda.
- Ogni hook della chat di Cursor va a ogni finestra viva del progetto, ciascuna contattata per conto suo; `beforeSubmitPrompt` aspetta al massimo 1 s, gli altri hook di Cursor fino a 5 s. Copilot resta com'è, salvo il riconoscimento del prompt.
- Con più finestre l'avviso «The agent finished without delivering…» compare solo nella finestra che ritira l'annuncio.
- Le voci di Trama in `~/.cursor/hooks.json` si riscrivono anche a ogni attivazione dell'estensione in Cursor, solo quando non puntano già al programma di questa versione; un file non JSON valido dà l'errore a ogni attivazione.
- Nessun timer e nessuna chiusura a mano: senza segnali il ghost resta finché la conversazione è chiusa o l'editor riparte.
- Nessuna diagnostica nuova nell'editor.
