---
status: resolved
resolution: fix-code
refs:
  - worktree-round/Waiting
proposal: 1q8rqam4
task: 9tibflc7
origin: fncvbj36
option: 1
note: null
created: 2026-10-06T13:36:00.669Z
---
# Il giro in attesa non può andare in Conflict: manca la Transizione nel Modello

## What happens

Il Drift d'origine è stato chiuso con **correggere il codice**, scegliendo l'opzione che manda il giro in Conflict. Ma quell'opzione richiede prima una Transizione nuova nel Modello, che non c'è ancora. Il codice quindi resta com'è: se il branch di partenza è andato avanti sulle stesse righe, il giro **resta in Waiting** senza avvisare, e ogni controllo ripete il tentativo.

## What should happen

Il Modello dà a Waiting solo due uscite: la cartella pronta verso **No round** e l'abbandono. Far nascere il Merge Drift da Waiting sarebbe una Transizione che il Modello non ha, quindi non posso implementare il Task senza contraddirlo. Serve prima che il Modello abbia **Waiting → Conflict**.

## Fix options

### Approvare la Proposal attaccata

Accettare la Proposal che aggiunge a Waiting l'uscita verso Conflict quando il branch avanzato non si combina con l'unione, con lo stesso Merge Drift di un conflitto fra Proposal. Poi la scansione crea il Task che cambia il codice: il ramo che oggi annulla l'unione la lascia aperta e scrive il Merge Drift. Costa una revisione e poco codice.

### Restare in Waiting, ma avvisare

Rinunciare al Conflict: il Modello dice che, con un conflitto col branch, il giro resta fermo e il developer riceve un avviso che chiede di abbandonare il giro o annullare il commit. Niente Merge Drift. Costa una frase nel Modello e un testo nei Requisiti ui; il developer risolve a mano.

## Where in the code

src/core/worktree-merge.ts: landReadyMerge
