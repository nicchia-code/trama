---
column: done
technical: true
refs: []
drift: null
proposal: bjt6vdn9
agent: false
created: 2026-10-17T21:20:34.786Z
finished: 2026-10-17T21:29:28.732Z
---
# Test che chiudono i lavori

I 12 test di `test/host-agent-terminals.test.ts` che oggi falliscono nella suite completa, e passano da soli, passano anche nella suite completa. Solo i test cambiano: il codice di produzione resta com'è, perché segue il Modello. Un lavoro nel terminale o nella chat finisce solo con un segnale (hook a riposo, fine del comando scritto da Trama, chiusura del terminale, eventi della chat), e i test devono mandarlo.

Quando il Task è finito, i tre test che oggi avviano un lavoro senza chiuderlo chiudono il terminale o la chat che hanno avviato prima di finire, anche se un'asserzione fallisce. Così nessun Run e nessuna risoluzione restano in corso per i test che seguono. I tre test sono:

- *Resolve on one Drift names only that Drift, and is refused once that Drift is no longer open*: lascia in corso una risoluzione nel terminale;
- *a terminal scan, import and Resolve Drifts announce their card at once, and a Run announces nothing*: lascia in corso un Run nel terminale;
- *a chat launch announces only when its instruction is really sent: the clipboard and the confirmation step announce nothing*: lascia in corso un lavoro nella chat.

Lo stesso vale per qualunque altro test del file che lasci un lavoro aperto e faccia fallire quelli successivi. Le asserzioni dei test che falliscono oggi non cambiano.

Verifica: `bun test --isolate test/host-agent-terminals.test.ts` è verde, e lo è anche la suite completa `bun test --isolate`.
