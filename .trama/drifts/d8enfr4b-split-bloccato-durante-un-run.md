---
status: resolved
resolution: unified
refs:
  - proposal/Open
proposal: null
task: null
origin: null
unifiedInto: 2pdnq92f
option: null
note: null
created: 2026-10-27T07:11:44.400Z
job: e60ceeff-b80c-4f03-82bf-504764d7d43a
---
# Split bloccato durante un Run

## What happens

La divisione di un issue lungo è rifiutata mentre un Run lanciato da questa finestra è in corso, con il motivo che un Run è in corso. Il Modello descrive la divisione come possibile quando l'agente che ha consegnato la Proposal ha finito il turno e nessun altro agente la sta scrivendo, senza altra condizione.

## What should happen

Quando l'agente che ha consegnato la Proposal ha finito il turno e nessun altro agente la scrive, la divisione dell'issue lungo parte anche mentre un Run lanciato da questa finestra è in corso.

## Fix options

### Togliere il blocco del Run

La divisione smette di controllare se un Run lanciato da questa finestra è in corso, e restano i controlli sull'agente che sta finendo il turno e sulla scrittura della Proposal. La richiesta di divisione parte come oggi, senza coda. Costo: la divisione può partire mentre un Run è attivo nella stessa finestra, quindi due agenti lavorano insieme; va verificato che non si pestino i file. Il Modello resta com'è.

### Accodare la divisione dopo il Run

La divisione non parte mentre un Run è in corso: la richiesta resta in attesa e parte quando il Run finisce, se l'issue è ancora lungo e nessun agente scrive la Proposal. Il pulsante Split resta attivo e la vista del Team dice che la divisione attende il Run. Costo: serve una coda per la divisione, simile a quella del raffinamento, e una richiesta può restare in attesa a lungo. Il Modello resta com'è.

## Where in the code

extension/src/host/controller.ts (splitIssue); src/core/issues.ts (splitIssueBlock)

## Prepared question

```json
{
  "question": {
    "id": "d8enfr4b",
    "question": "La divisione di un issue lungo deve partire anche mentre un Run lanciato da questa finestra è in corso?",
    "context": "Un handoff consegnato può contenere un issue stimato più di 3 giorni, che l'agente divide in issue da una sprint. Il Requisito `rules#developer.SPLIT_ISSUE` dice che la divisione è disponibile solo quando nessun Run lanciato da questa finestra è in corso, e il codice lo rispetta. Il Modello, nella transizione `proposal/Open/developer.SPLIT_ISSUE`, non elenca questa condizione. Il Drift nasce da questa differenza: il Modello va allineato al Requisito oppure il Requisito al codice.",
    "options": [
      {
        "label": "Togliere il blocco del Run",
        "description": "La divisione parte anche con un Run attivo nella stessa finestra; va verificato che i due agenti non scrivano gli stessi file.",
        "details": "Il Requisito e il Modello vanno cambiati per togliere la condizione del Run. Il codice in extension/src/host/controller.ts e src/core/issues.ts perde il controllo sul Run."
      },
      {
        "label": "Accodare la divisione dopo il Run",
        "description": "La richiesta di divisione resta in attesa e parte quando il Run finisce, se l'issue è ancora lungo e nessun agente scrive l'handoff.",
        "details": "Serve una coda per la divisione, simile a quella del raffinamento; la vista del Team mostra che la divisione attende il Run. Una richiesta può restare in attesa a lungo."
      },
      {
        "label": "Mantenere il blocco del Run",
        "description": "La divisione non parte mentre un Run lanciato da questa finestra è in corso, come già dice il Requisito.",
        "details": "Il Modello nella transizione della Proposal aperta va completato con la condizione del Run, così Modello e Requisiti dicono ciò che il codice fa."
      }
    ],
    "recommended": 2,
    "multi": false
  },
  "decisions": [
    {
      "decision": "fix-code",
      "option": 1
    },
    {
      "decision": "fix-code",
      "option": 2
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "8010e2cf7fe87d799ec90942ef7c78f73f09e2efa6d38e7038cd3f0a4400f2cb",
  "prepared": "2026-10-27T07:18:12.072Z"
}
```
