---
status: approved
base:
  requirements/tech/settings.md: 4423d9faf1b2b88adf4e5874723d6c35166e162b60bce437d73f27e078ae45bb
  requirements/quality/main.md: 4bb8455f93a24100439fa51ee23885b0389d125a4df301933714cf32ffe57fef
  requirements/ui/settings-specs.md: 91d4508ff14019d5d34ef86c2a1e02b21a30bde8133757e7e36a9c3458bbc25d
  requirements/tech/models.md: ed0292f594922019da8bb7aec4cfbb27f89cc55182ae712c9bcde8f4553eac4c
delete: []
request: 2026-10-17T05-15-38
created: 2026-10-17T03:21:45.246Z
---
# Modelli di omp nei Settings: percorso configurabile e motivo quando mancano

Il developer segnala che in Settings non compaiono i modelli di omp. Causa probabile [INFERENCE], coerente con la risposta del developer: l'estensione avvia omp models --json dal PATH dell'editor; avviato dal launcher del desktop quel PATH non contiene ~/.bun/bin, dove sta omp, quindi l'avvio fallisce e l'elenco resta vuoto senza alcun messaggio. Dal terminale omp risponde in circa 1 s con JSON valido (28 modelli): il bug non e nel formato.

Decisioni prese nell'intervista:
- Il developer avvia VS Code dal launcher del desktop: la correzione deve funzionare senza il PATH della shell.
- Nuova impostazione trama.ompPath (testo, scope application, vuota di default): percorso del programma omp per i suggerimenti. Vuota vale come oggi: omp dal PATH dell'editor. Nessuna ricerca in cartelle nascoste, nessuna shell.
- Se l'elenco di omp non si ottiene, una riga sotto i campi dei ruoli dice il motivo: omp non trovato al percorso indicato, errore di avvio, oppure nessuna risposta entro 15 secondi.

Assunzioni da controllare (non chieste nell'intervista):
- trama.ompPath compare nel gruppo Agent della scheda Settings, accanto a trama.agent.
- La nuova impostazione vale solo per i suggerimenti: il terminale dell'agente continua a lanciare omp dalla shell, come oggi.
- Il motivo riguarda solo omp: Claude Code non ha elenco, la chat non cambia.
- La Model non cambia: il comportamento della scheda Settings resta quello descritto; cambiano solo i Requisiti.
