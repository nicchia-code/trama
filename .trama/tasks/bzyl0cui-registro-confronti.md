---
column: done
technical: true
refs:
  - requirements/rules#work
  - requirements/tech#work
  - requirements/data#announcement
  - requirements/tech#drift
drift: null
proposal: 4td4mzmg
agent: false
created: 2026-10-18T19:52:39.256Z
finished: 2026-10-18T20:22:46.514Z
---
# Registro dei confronti

Il pre-flight non confronta di nuovo ciò che è già stato confrontato con successo con lo stesso codice e lo stesso testo di Modello e Requisiti.

Fatto quando:
- in un repository git `trama compare brief` calcola l'impronta del codice come dice `tech#work` (commit corrente, percorsi cambiati o non tracciati con l'hash del loro contenuto, senza `.trama/`, le cartelle delle skill e `.omp/agents/`) e la scrive in `code` del confronto, con `refs`; fuori da git, o quando git fallisce, non c'è impronta;
- un `trama compare file` riuscito, anche vuoto, registra in `.trama/compared/<impronta>.json` ogni riferimento del confronto con l'impronta del testo che il briefing dava per lui; il file ha accanto il suo `.gitignore`; i file di altre impronte si cancellano alla prima scrittura; un confronto senza impronta, ritirato o rifiutato non registra nulla;
- `trama task scope --pre-flight` toglie i riferimenti già confrontati (esso o un elemento che lo contiene registrato con l'impronta del codice di adesso e la stessa impronta del testo di adesso) e li stampa a parte sotto `## Already compared`, con `alreadyCompared` in `--json`;
- la skill `trama-implement` confronta nel pre-flight solo i riferimenti rimasti, elenca nel resoconto quelli già confrontati e, quando non ne resta nessuno, chiude il controllo con esito riuscito senza confrontare;
- le scansioni del Sistema o di Feature e la scansione di fine corsa non saltano nulla, ma registrano i loro confronti;
- `docs/cli.md` descrive l'uscita nuova del pre-flight e il registro.
