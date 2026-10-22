---
status: approved
requires:
  - q51924cv
base:
  work/announcement.md: ae250eb9f178f7965e20f4cb7eab7199d291d1251d649836ecf5220c23c65be8
  agent-launching/chat-advisor.md: 8813fa0c12c0e1b54c5529694f565266ea393b48bb138223a7dcdb1917d72a68
  editor-panel/panel.md: 9fe95a54610b7c8a57742b930f64b885f7ddce47ad7ad1b9538f0446c893aa48
  requirements/ui/ghosts.md: 43d01c5896eb899cdac30d8b129644eefaf2d70051c7a1d4eec1ffea27cd634c
  requirements/ui/agents.md: 7dbcc7de38c99e180cc633df86ab848b866c57ca105d19b97267480ebe32cb06
  requirements/tech/announcements.md: 1e0184428d6ed298a18913f22f589bc3aecf5502ea9e326732f3620fa392439c
  requirements/tech/history.md: new
delete: []
created: 2026-10-22T05:31:33.060Z
label: Avvisi spenti
---
# Avvisi gialli spenti

Per ora la Board non mostra più gli avvisi gialli dei ghost ritirati e del Run finito senza la revisione finale dell'Advisor. Il codice che li prepara resta: un interruttore nel webview li spegne.

## Decisioni

- Spenti: `The agent finished without delivering …` e `The agent stopped before finishing …` (ghost ritirati) e `The Run finished without the Advisor's final review: …`.
- Resta acceso: `Trama stopped following …` del controllo di esecuzione.
- Interruttore nel codice: una costante spenta nel webview, nessuna impostazione nuova; l'host continua a preparare gli avvisi.
- Documentazione: nei Requisiti, nel commento accanto all'interruttore e nel CHANGELOG.

## Assunzioni da controllare

- I popup dell'editor (`showWarningMessage`) e gli avvisi del wizard non cambiano.
- Il Modello non toglie gli avvisi: dice che Trama li prepara e che per ora la Board non li disegna.
