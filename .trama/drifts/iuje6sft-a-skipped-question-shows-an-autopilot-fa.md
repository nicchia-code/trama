---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#drift-resolution
proposal: null
task: m8ygp3tk
origin: null
critical: false
option: 1
note: null
resolvedBy: rcz51nw7
created: 2026-10-11T09:49:06.092Z
---
# A skipped question shows an autopilot failed badge, also with the autopilot disabled

## What happens

Quando il developer salta la domanda su un Drift in un round di Resolve Drifts, il Drift viene registrato come caso fallito dell'autopilota. Sulla sua scheda compare il badge `autopilot failed` con il motivo "its question was skipped", in qualunque modalità: anche con la delega `disabled` e anche per un Drift critico che in `enabled` è solo manuale.

## What should happen

Il badge segnala un caso fallito o escluso dall'autopilota. Con `disabled` il flusso resta quello precedente, senza indicazioni dell'automazione, e per i critici manuali non si mostra un errore di automazione. Una domanda saltata lascia il Drift aperto e fuori dalla raccolta, ma non è un fallimento dell'automazione.

## Fix options

### Show the badge only when the autopilot is on

Il motivo della domanda saltata resta visibile ma solo con `enabled` o `yolo`, e non per i critici manuali in `enabled`. Con `disabled` la Board è identica a prima. Costo: una condizione in più sulla Board; il motivo non si vede con la delega spenta.

### Never show the badge for a skipped question

Il Drift saltato resta fuori dalla raccolta senza alcun badge: il badge indica solo i fallimenti reali di Drift e Task automatici. Costo: il developer non vede più perché un Drift non viene preso dall'autopilota, salvo che con `trama drift autopilot`.

### Use a distinct neutral badge for skipped questions

Una domanda saltata mostra un badge testuale diverso (per esempio `skipped`), senza tono di errore, solo con delega attiva. Costo: un nuovo badge da descrivere nei Requisiti e da rendere accessibile.

## Where in the code

extension/src/host/questions.ts (recordDriftAnswers), extension/src/host/drift-resolution.ts (recordSkippedDrift, driftAutopilotStatus), extension/src/webview/board/logic.ts (failedReasons)
