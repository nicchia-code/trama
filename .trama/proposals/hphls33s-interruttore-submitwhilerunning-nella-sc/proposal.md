---
status: rejected
base:
  requirements/ui/settings-specs.md: 570f25fe0b01265599d15801bbbfe07740400354760008c85e4c335ab956293e
delete: []
created: 2026-10-17T20:34:59.230Z
label: Interruttore submit Running
---
# Interruttore submitWhileRunning nella scheda Settings

Il Requisito ui/settings-specs dice che tutte le impostazioni tranne autoExit ed experimentalDriftBlocker sono campi di testo, ma trama.submitWhileRunning è un interruttore booleano nel manifest (extension/package.json), nel Requisito tech/agent-terminal, nelle regole dei Task e nel Requisito dell'agente, e il codice mostra una casella. Scelta presa senza intervista (Drift da correggere): il Requisito della scheda Settings è riportato a casella, come il manifest e il resto dei Requisiti. Non cambia il Modello né il comportamento dei Run.

## Already present

- `requirements/ui#panel/Settings` — extension/src/host/settings-schema.ts (il controllo casella viene dal tipo `boolean` del manifest), extension/src/webview/settings/index.ts (`booleanControl`)

## Feedback

Drift xrxapt04 resolved by Proposal c2o055xh
